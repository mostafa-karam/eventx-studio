/**
 * Booking Service
 * 
 * Orchestrates the booking flow across Event, Ticket, and Coupon models.
 * Single place for seat booking / cancellation logic to fix the
 * data ownership violation where multiple controllers directly
 * mutated the Event model.
 */

const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Coupon = require('../models/Coupon');
const Waitlist = require('../models/Waitlist');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Book a seat for a user at an event
 * @param {object} options
 * @param {string} options.eventId
 * @param {string} options.userId
 * @param {string} [options.seatNumber]
 * @param {object} [options.payment]
 * @param {string} [options.couponCode]
 * @returns {object} { ticket, event }
 */
exports.bookSeat = async ({ eventId, userId, seatNumber, payment, couponCode }) => {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  if (event.status !== 'published') {
    const err = new Error('Event is not available for booking');
    err.status = 400;
    throw err;
  }

  // Check seat availability
  if (event.seating && event.seating.availableSeats <= 0) {
    const err = new Error('No seats available for this event');
    err.status = 400;
    throw err;
  }

  // Apply coupon if provided (for usage tracking, discount already applied in payment)
  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    appliedCoupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (appliedCoupon && appliedCoupon.isValid) {
      // Increment coupon usage
      appliedCoupon.usedCount = (appliedCoupon.usedCount || 0) + 1;
      await appliedCoupon.save();
    }
  }

  // Payment amount is already final (discounted), so no further discount
  const finalAmount = payment?.amount || 0;

  // Book the seat on the Event model
  // NOTE: analytics are updated atomically in ticketsController via findOneAndUpdate
  // to prevent double-counting. Keep seat mutations only here.
  if (seatNumber && event.seating?.seatMap) {
    event.bookSeat(seatNumber, userId);
  } else if (event.seating) {
    event.seating.availableSeats = Math.max(0, event.seating.availableSeats - 1);
  }

  await event.save();

  // Create ticket
  const ticket = new Ticket({
    event: event._id,
    user: userId,
    seatNumber: seatNumber || `GA-${Date.now()}`,
    status: 'booked',
    payment: {
      amount: finalAmount,
      paymentMethod: payment?.method || 'free',
      status: 'completed',
      paymentDate: new Date(),
      transactionId: payment?.transactionId || undefined,
    },
    bookingDate: new Date(),
  });

  await ticket.save();

  // Notify user
  notificationService.notify(userId, {
    title: 'Booking Confirmed!',
    message: `Your ticket for "${event.title}" has been confirmed.`,
    type: 'booking',
    priority: 'high',
    actionUrl: `/user/tickets/${ticket._id}`,
    metadata: { eventId: event._id, ticketId: ticket._id },
  });

  return { ticket, event };
};

/**
 * Cancel a booking
 * @param {string} ticketId
 * @param {string} userId
 * @returns {object} { ticket, event }
 */
exports.cancelBooking = async (ticketId, userId) => {
  const ticket = await Ticket.findById(ticketId);
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

  const event = await Event.findById(ticket.event);

  // Cancel the seat on the Event model
  if (event) {
    if (ticket.seatNumber && event.seating?.seatMap) {
      try { event.cancelSeat(ticket.seatNumber); } catch (err) { logger.warn(`cancelSeat failed for ${ticket.seatNumber}: ${err.message}`); }
    } else if (event.seating) {
      event.seating.availableSeats = (event.seating.availableSeats || 0) + 1;
    }

    // Update analytics
    if (event.analytics) {
      event.analytics.bookings = Math.max(0, (event.analytics.bookings || 0) - 1);
    }

    await event.save();

    // Check waitlist — notify next person
    const nextWaitlist = await Waitlist.findOne({ event: event._id, status: 'pending' }).sort({ createdAt: 1 });
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
  }

  // Update ticket status
  ticket.status = 'cancelled';
  ticket.payment.status = 'refunded';
  await ticket.save();

  // Notify user
  notificationService.notify(userId, {
    title: 'Booking Cancelled',
    message: `Your ticket for "${event?.title || 'the event'}" has been cancelled.`,
    type: 'booking',
    priority: 'medium',
    actionUrl: `/user/tickets`,
  });

  return { ticket, event };
};
