const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

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

    // 1. Update event status
    event.status = 'cancelled';
    event.description = `${event.description}\n\n[CANCELLED: ${reason}]`;
    await event.save();

    // 2. Cancel all 'booked' tickets
    const tickets = await Ticket.find({ event: eventId, status: 'booked' });
    
    // Perform updates in bulk or sequence
    const ticketIds = tickets.map(t => t._id);
    await Ticket.updateMany(
        { _id: { $in: ticketIds } },
        { 
            $set: { 
                status: 'cancelled',
                'payment.status': event.pricing.type === 'paid' ? 'refunded' : 'free'
            } 
        }
    );

    // 3. Notify attendees
    const uniqueUserIds = [...new Set(tickets.map(t => t.user.toString()))];
    
    const notifications = uniqueUserIds.map(userId => ({
        userId,
        title: `Event Cancelled: ${event.title}`,
        message: `We're sorry, but the event "${event.title}" has been cancelled. Reason: ${reason}. Your ticket has been voided.`,
        type: 'system',
        priority: 'high',
        actionUrl: `/events/${event._id}`
    }));

    if (notifications.length > 0) {
        await Notification.insertMany(notifications);
    }

    logger.info(`Event ${eventId} cancelled by ${organizer._id}. Notified ${uniqueUserIds.length} users.`);
    
    return {
        event,
        ticketsCancelled: tickets.length,
        usersNotified: uniqueUserIds.length
    };
  }
}

module.exports = new EventLifecycleService();
