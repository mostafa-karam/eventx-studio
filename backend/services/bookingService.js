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
const Payment = require('../models/Payment');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const ticketsService = require('./ticketsService');
const { withTransactionRetry } = require('../utils/transaction');

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
exports.bookSeat = async ({
  eventId,
  userId,
  seatNumber,
  payment,
  couponCode,
  metadata = {},
  idempotencyKey,
  paymentId,
}) => {
  const transactionsRequired = (process.env.NODE_ENV === 'production'
    || String(process.env.REQUIRE_DB_TRANSACTIONS || '').toLowerCase() === 'true')
    && process.env.NODE_ENV !== 'test';
  const allowNonTransactional = process.env.NODE_ENV === 'test'
    || (process.env.NODE_ENV !== 'production'
      && String(process.env.ALLOW_NON_TXN_BOOKING || '').toLowerCase() === 'true');

  const isTxnUnsupported = (err) => {
    if (!err) return false;
    if (err.code === 20 || err.codeName === 'IllegalOperation') return true;
    const msg = String(err.message || '');
    return msg.includes('Transaction numbers are only allowed')
      || msg.includes('replica set member or mongos');
  };

  let attempt = 0;
  let forceNoSession = false;
  while (attempt < 2) {
    attempt += 1;

    let session = null;
    let useSession = !forceNoSession;
    if (useSession) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (err) {
        if (transactionsRequired) {
          const e = new Error('Database transactions are required but unavailable');
          e.status = 500;
          throw e;
        }
        if (!allowNonTransactional) {
          const e = new Error('Database transactions are unavailable (set ALLOW_NON_TXN_BOOKING=true only for local dev)');
          e.status = 500;
          throw e;
        }
        logger.warn(`Booking transaction unavailable; using compatibility fallback: ${err.message}`);
        useSession = false;
        session = null;
      }
    }

    const sessionOptions = useSession ? { session } : {};

    try {
    if (idempotencyKey) {
      const existingByIdempotencyQuery = Ticket.findOne({
        event: eventId,
        user: userId,
        'payment.idempotencyKey': idempotencyKey,
      });
      if (useSession) existingByIdempotencyQuery.session(session);
      const existingByIdempotency = await existingByIdempotencyQuery;
      if (existingByIdempotency) {
        return { ticket: existingByIdempotency, event: null, idempotentReplay: true };
      }
    }

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
      if (idempotencyKey && existingTicket.payment?.idempotencyKey === idempotencyKey) {
        return { ticket: existingTicket, event, idempotentReplay: true };
      }
      const err = new Error('You already have a ticket for this event');
      err.status = 409;
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
    }

    const finalAmount = payment?.amount ?? (event.pricing?.amount || 0);
    const requiredCurrency = event.pricing?.currency || 'USD';

    const requiresTxnForIntegrity = event.pricing?.type === 'paid' || Boolean(couponCode);
    if (requiresTxnForIntegrity && !useSession && process.env.NODE_ENV !== 'test') {
      throw Object.assign(new Error('Booking requires database transactions to be enabled'), { status: 500 });
    }

    // Validate payment (do not consume yet) for paid bookings.
    let paymentVerifiedRecord = null;
    if (event.pricing?.type === 'paid') {
      if (!paymentId) {
        const err = new Error('paymentId is required for paid bookings');
        err.status = 400;
        throw err;
      }

      const paymentQuery = Payment.findOne({
        paymentId: String(paymentId),
        user: userId,
        event: eventId,
        status: 'verified',
        amount: Number(finalAmount),
        currency: String(requiredCurrency).toUpperCase(),
        quantity: 1,
      });
      if (useSession) paymentQuery.session(session);
      paymentVerifiedRecord = await paymentQuery.exec();
      if (!paymentVerifiedRecord) {
        logger.warn(`Rejected unverified/invalid payment during booking paymentId=${paymentId} user=${userId} event=${eventId}`);
        const err = new Error('Payment not verified');
        err.status = 400;
        throw err;
      }
    }

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
        idempotencyKey: idempotencyKey || undefined,
      },
      metadata: metadata || {},
      bookingDate: new Date(),
    });

    await ticket.save(useSession ? { session } : undefined);

    // Consume payment at the end of the transaction to prevent partial failures burning payments.
    if (event.pricing?.type === 'paid') {
      const consumeResult = await Payment.updateOne(
        { _id: paymentVerifiedRecord._id, status: 'verified' },
        { $set: { status: 'consumed', consumedAt: new Date() } },
        useSession ? { session } : undefined
      );
      if (!consumeResult || consumeResult.modifiedCount !== 1) {
        throw Object.assign(new Error('Payment is no longer available'), { status: 409 });
      }
    }

    if (useSession) {
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
      if (useSession && session) {
        await session.abortTransaction().catch(() => {});
      }

      // Retry once without a transaction in non-production only when explicitly allowed.
      if (!transactionsRequired && allowNonTransactional && useSession && session && isTxnUnsupported(error) && process.env.NODE_ENV !== 'production' && attempt === 1) {
        logger.warn(`Retrying booking without transaction due to unsupported transactions: ${error.message}`);
        forceNoSession = true;
        continue;
      }

      if (error?.code === 11000) {
        const duplicateTicket = await Ticket.findOne({
          event: eventId,
          user: userId,
          status: { $in: ['booked', 'used'] },
        });
        if (duplicateTicket) {
          return { ticket: duplicateTicket, event: null, idempotentReplay: true };
        }
      }
      throw error;
    } finally {
      if (session) session.endSession();
    }
  }

  throw Object.assign(new Error('Booking failed'), { status: 500 });
};

/**
 * Cancel a booking — ATOMIC seat release with waitlist notification.
 * @param {string} ticketId
 * @param {string} userId
 * @returns {object} { ticket, event }
 */
exports.cancelBooking = async (ticketId, userId) => {
  return withTransactionRetry(async (session) => {
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
    const nextWaitlist = await Waitlist.findOne({ event: ticket.event, status: 'pending' })
      .sort({ createdAt: 1 })
      .session(session);
    let waitlistUserId = null;
    if (nextWaitlist) {
      nextWaitlist.status = 'notified';
      nextWaitlist.notifiedAt = new Date();
      nextWaitlist.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await nextWaitlist.save({ session });
      waitlistUserId = nextWaitlist.user;
    }

  // Update ticket status
    ticket.status = 'cancelled';
    if (ticket.payment) ticket.payment.status = 'refunded';
    await ticket.save({ session });

    // Notify user and waitlisted user outside transaction.
    setImmediate(() => {
      notificationService.notify(userId, {
        title: 'Booking Cancelled',
        message: `Your ticket for "${event.title}" has been cancelled.`,
        type: 'booking',
        priority: 'medium',
        actionUrl: '/user/tickets',
      });
      if (waitlistUserId) {
        notificationService.notify(waitlistUserId, {
          title: 'A spot opened up!',
          message: `A seat is now available for "${event.title}". You have 24 hours to book.`,
          type: 'event',
          priority: 'high',
          actionUrl: `/user/events/${event._id}`,
        });
      }
    });
    return { ticket, event };
  });
};
