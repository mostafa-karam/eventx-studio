const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { withTransactionRetry } = require('../utils/transaction');

/**
 * Service to handle complex operations in the life of an event,
 * like cancellations or bulk notifications.
 */
class EventLifecycleService {
  /**
   * Cancels an event and handles all downstream tickets and notifications.
   * @param {string} eventId - The ID of the event to cancel
   * @param {Object} organizer - The user performing the cancellation
   * @param {string} reason - The reason for cancellation
   */
  async cancelEvent(eventId, organizer, reason = 'No reason provided') {
    const event = await Event.findById(eventId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

    // Auth check
    if (event.organizer.toString() !== organizer._id.toString() && organizer.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to cancel this event'), { status: 403 });
    }

    if (event.status === 'cancelled') {
        throw Object.assign(new Error('Event is already cancelled'), { status: 400 });
    }

    const { ticketsCancelled, usersNotified } = await withTransactionRetry(async (session) => {
      const eventDocQuery = Event.findById(eventId);
      if (session) eventDocQuery.session(session);
      const eventDoc = await eventDocQuery;
      if (!eventDoc) throw Object.assign(new Error('Event not found'), { status: 404 });

      eventDoc.status = 'cancelled';
      eventDoc.description = `${eventDoc.description}\n\n[CANCELLED: ${reason}]`;
      await eventDoc.save(session ? { session } : undefined);

      const ticketsQuery = Ticket.find({ event: eventId, status: 'booked' });
      if (session) ticketsQuery.session(session);
      const tickets = await ticketsQuery;
      const ticketIds = tickets.map((t) => t._id);
      if (ticketIds.length > 0) {
        await Ticket.updateMany(
          { _id: { $in: ticketIds } },
          {
            $set: {
              status: 'cancelled',
              'payment.status': eventDoc.pricing.type === 'paid' ? 'refunded' : 'free',
            },
          },
          session ? { session } : undefined
        );
      }

      const uniqueUserIds = [...new Set(tickets.map((t) => t.user.toString()))];
      if (uniqueUserIds.length > 0) {
        await Notification.insertMany(
          uniqueUserIds.map((userId) => ({
            userId,
            title: `Event Cancelled: ${eventDoc.title}`,
            message: `We're sorry, but the event "${eventDoc.title}" has been cancelled. Reason: ${reason}. Your ticket has been voided.`,
            type: 'system',
            priority: 'high',
            actionUrl: `/events/${eventDoc._id}`,
            metadata: { eventId: String(eventDoc._id), reason },
          })),
          session ? { session } : undefined
        );
      }

      return { ticketsCancelled: tickets.length, usersNotified: uniqueUserIds.length };
    }, { allowFallback: process.env.NODE_ENV === 'test' });

    logger.info(`Event ${eventId} cancelled by ${organizer._id}. Notified ${usersNotified} users.`);
    event.status = 'cancelled';
    
    return {
        event,
        ticketsCancelled,
        usersNotified
    };
  }
}

module.exports = new EventLifecycleService();
