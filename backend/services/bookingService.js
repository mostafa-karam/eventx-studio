/**
 * Booking Service
 * 
 * Orchestrates the booking flow across Event, Ticket, and Coupon models.
 * Single place for seat booking / cancellation logic to fix the
 * data ownership violation where multiple controllers directly
 * mutated the Event model.
 *
 * SECURITY: All seat mutations use atomic findOneAndUpdate to prevent
 * race-condition overselling (Phase 1.1).
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Coupon = require('../models/Coupon');
const Waitlist = require('../models/Waitlist');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const ticketsService = require('./ticketsService');

const calculateCouponDiscount = (coupon, baseAmount) => {
  if (!coupon) return 0;
  const amount = Number(baseAmount) || 0;
  if (coupon.discountType === 'percentage') {
    return Math.min(amount, (amount * (coupon.discountValue / 100)) || 0);
  }
  return Math.min(amount, coupon.discountValue || 0);
};

const getCouponForEvent = async (couponCode, eventId, sessionOptions) => {
  if (!couponCode) return null;

  const normalizedCode = couponCode.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true }, null, sessionOptions);
  if (!coupon) {
    const err = new Error('Coupon code is invalid');
    err.status = 400;
    throw err;
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    const err = new Error('Coupon has expired');
    err.status = 400;
    throw err;
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    const err = new Error('Coupon usage limit reached');
    err.status = 400;
    throw err;
  }

  if (coupon.applicableEvents && coupon.applicableEvents.length > 0) {
    const matchesEvent = coupon.applicableEvents.some((id) => id.toString() === eventId.toString());
    if (!matchesEvent) {
      const err = new Error('Coupon is not applicable to this event');
      err.status = 400;
      throw err;
    }
  }

  return coupon;
};

/**
 * Book a seat for a user at an event — ATOMIC, race-condition-safe.
 * @param {object} options
 * @param {string} options.eventId
 * @param {string} options.userId
 * @param {string} [options.seatNumber]
 * @param {object} [options.payment]
 * @param {string} [options.couponCode]
 * @param {object} [options.metadata]
 * @returns {object} { ticket, event }
 */
exports.bookSeat = async ({ eventId, userId, seatNumber, payment, couponCode, metadata = {} }) => {
  // Use explicit env var instead of private driver topology sniffing (M-03)
  // Only start session when transactions are actually needed (M-14)
  let useSession = process.env.ENABLE_TRANSACTIONS === 'true';
  let session = null;
  if (useSession) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      logger.warn('Unable to start transaction; falling back to non-transactional booking flow:', err.message);
      session = null;
      useSession = false;
    }
  } else {
    logger.warn('Transactions disabled (ENABLE_TRANSACTIONS != true); using non-transactional booking flow.');
  }

  const sessionOptions = session ? { session } : {};
  let couponIncremented = false;
  let couponIdToRollback = null;
  let seatMutation = null; // { type: 'named'|'ga', seatNumber, revenueInc }

  try {
    // Centralized business-rule guard (published + not in the past)
    const event = await ticketsService.findBookableEvent(eventId);

    // Check seat availability
    if (event.seating && event.seating.availableSeats <= 0) {
      const err = new Error('No seats available for this event');
      err.status = 400;
      throw err;
    }

    // Check if user already has a ticket for this event
    const existingTicketQuery = Ticket.findOne({
      event: eventId,
      user: userId,
      status: { $in: ['booked', 'used'] }
    });
    if (useSession) existingTicketQuery.session(session);
    const existingTicket = await existingTicketQuery;

    if (existingTicket) {
      const err = new Error('You already have a ticket for this event');
      err.status = 400;
      throw err;
    }

    // Apply coupon if provided and validate it server-side
    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = await getCouponForEvent(couponCode, eventId, sessionOptions);
      const baseAmount = event.pricing?.amount || 0;
      const discount = calculateCouponDiscount(appliedCoupon, baseAmount);
      const expectedAmount = Math.max(0, baseAmount - discount);

      if (payment?.amount === undefined || Number(payment.amount) !== expectedAmount) {
        const err = new Error('Payment amount does not match expected amount for the coupon');
        err.status = 400;
        throw err;
      }

      appliedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: appliedCoupon._id,
          isActive: true,
          $or: [
            { maxUses: null },
            { $expr: { $lt: ['$usedCount', '$maxUses'] } }
          ]
        },
        { $inc: { usedCount: 1 } },
        { new: true, ...sessionOptions }
      );

      if (!appliedCoupon) {
        const err = new Error('Coupon is invalid or exhausted');
        err.status = 400;
        throw err;
      }
      couponIncremented = true;
      couponIdToRollback = appliedCoupon._id;
    }

    const finalAmount = payment?.amount ?? (event.pricing?.amount || 0);

    // Determine seat number — pick first available if none specified
    let selectedSeat = seatNumber;
    if (!selectedSeat && event.seating?.seatMap?.length > 0) {
      const firstAvailable = event.seating.seatMap.find(s => !s.isBooked);
      if (firstAvailable) {
        selectedSeat = firstAvailable.seatNumber;
      }
    }
    if (!selectedSeat) {
      selectedSeat = `GA-${Date.now()}`;
    }

    // ATOMIC seat booking via findOneAndUpdate — prevents race condition overselling
    const revenueInc = event.pricing?.type === 'paid' ? (finalAmount || 0) : 0;

    let updatedEvent;
    if (event.seating?.seatMap?.length > 0) {
      // Named seat booking — atomic check-and-set
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          'seating.seatMap.seatNumber': selectedSeat,
          'seating.seatMap.isBooked': false,
        },
        {
          $set: {
            'seating.seatMap.$.isBooked': true,
            'seating.seatMap.$.bookedBy': userId,
          },
          $inc: {
            'seating.availableSeats': -1,
            'analytics.bookings': 1,
            'analytics.revenue': revenueInc,
          },
        },
        { new: true, ...sessionOptions }
      );
      seatMutation = { type: 'named', seatNumber: selectedSeat, revenueInc };
    } else if (event.seating) {
      // General admission — just decrement available seats atomically
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          'seating.availableSeats': { $gt: 0 },
        },
        {
          $inc: {
            'seating.availableSeats': -1,
            'analytics.bookings': 1,
            'analytics.revenue': revenueInc,
          },
        },
        { new: true, ...sessionOptions }
      );
      seatMutation = { type: 'ga', seatNumber: selectedSeat, revenueInc };
    }

    if (!updatedEvent) {
      const err = new Error('The requested seat is either unavailable or already booked.');
      err.status = 400;
      throw err;
    }

    // Create ticket within the same transaction
    const ticket = new Ticket({
      event: event._id,
      user: userId,
      seatNumber: selectedSeat,
      status: 'booked',
      payment: {
        amount: finalAmount,
        paymentMethod: payment?.method || 'free',
        status: 'completed',
        paymentDate: new Date(),
        transactionId: payment?.transactionId || undefined,
      },
      metadata: metadata || {},
      bookingDate: new Date(),
    });

    await ticket.save(useSession ? { session } : undefined);

    if (useSession) {
      // Commit the transaction — all-or-nothing
      await session.commitTransaction();
    }

    // Notify user (fire-and-forget, outside transaction)
    notificationService.notify(userId, {
      title: 'Booking Confirmed!',
      message: `Your ticket for "${event.title}" has been confirmed.`,
      type: 'booking',
      priority: 'high',
      actionUrl: `/user/tickets/${ticket._id}`,
      metadata: { eventId: event._id, ticketId: ticket._id },
    });

    return { ticket, event: updatedEvent };
  } catch (error) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    } else {
      // Compensating rollback for non-transactional flow to preserve integrity.
      if (couponIncremented && couponIdToRollback) {
        await Coupon.updateOne({ _id: couponIdToRollback, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }).catch(() => {});
      }
      if (seatMutation) {
        const rollbackUpdate = {
          $inc: {
            'seating.availableSeats': 1,
            'analytics.bookings': -1,
            'analytics.revenue': -(seatMutation.revenueInc || 0),
          },
        };
        if (seatMutation.type === 'named') {
          await Event.updateOne(
            { _id: eventId, 'seating.seatMap.seatNumber': seatMutation.seatNumber, 'seating.seatMap.bookedBy': userId },
            {
              ...rollbackUpdate,
              $set: { 'seating.seatMap.$.isBooked': false, 'seating.seatMap.$.bookedBy': null },
            }
          ).catch(() => {});
        } else {
          await Event.updateOne({ _id: eventId }, rollbackUpdate).catch(() => {});
        }
      }
    }
    throw error;
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Cancel a booking — ATOMIC seat release with waitlist notification.
 * @param {string} ticketId
 * @param {string} userId
 * @returns {object} { ticket, event }
 */
exports.cancelBooking = async (ticketId, userId) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    throw Object.assign(new Error('Cancellation requires database transactions to be enabled'), { status: 500 });
  }

  try {
    const ticket = await Ticket.findById(ticketId).session(session);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      throw err;
    }

    if (ticket.user.toString() !== userId.toString()) {
      const err = new Error('Not authorized to cancel this ticket');
      err.status = 403;
      throw err;
    }

    if (ticket.status !== 'booked') {
      const err = new Error(`Cannot cancel a ticket with status: ${ticket.status}`);
      err.status = 400;
      throw err;
    }

    const event = await Event.findById(ticket.event).session(session);
    if (!event) {
      const err = new Error('Associated event not found');
      err.status = 404;
      throw err;
    }

    const seatNumber = ticket.seatNumber;
    const isGA = typeof seatNumber === 'string' && seatNumber.startsWith('GA-');
    const revenueDec = event.pricing?.type === 'paid' ? (ticket.payment?.amount || 0) : 0;

    if (isGA) {
      await Event.updateOne(
        { _id: ticket.event },
        {
          $inc: {
            'seating.availableSeats': 1,
            'analytics.bookings': -1,
            'analytics.revenue': -revenueDec,
          },
        },
        { session }
      );
    } else {
      await Event.updateOne(
        { _id: ticket.event, 'seating.seatMap.seatNumber': seatNumber },
        {
          $set: { 'seating.seatMap.$.isBooked': false, 'seating.seatMap.$.bookedBy': null },
          $inc: {
            'seating.availableSeats': 1,
            'analytics.bookings': -1,
            'analytics.revenue': -revenueDec,
          },
        },
        { session }
      );
    }

  // Check waitlist — notify next person
  const nextWaitlist = await Waitlist.findOne({ event: ticket.event, status: 'pending' }).sort({ createdAt: 1 });
  if (nextWaitlist) {
    nextWaitlist.status = 'notified';
    nextWaitlist.notifiedAt = new Date();
    nextWaitlist.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await nextWaitlist.save();

    notificationService.notify(nextWaitlist.user, {
      title: 'A spot opened up!',
      message: `A seat is now available for "${event.title}". You have 24 hours to book.`,
      type: 'event',
      priority: 'high',
      actionUrl: `/user/events/${event._id}`,
    });
  }

  // Update ticket status
    ticket.status = 'cancelled';
    if (ticket.payment) ticket.payment.status = 'refunded';
    await ticket.save({ session });

    await session.commitTransaction();

  // Notify user
  notificationService.notify(userId, {
    title: 'Booking Cancelled',
    message: `Your ticket for "${event.title}" has been cancelled.`,
    type: 'booking',
    priority: 'medium',
    actionUrl: `/user/tickets`,
  });

    return { ticket, event };
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    session.endSession();
  }
};
