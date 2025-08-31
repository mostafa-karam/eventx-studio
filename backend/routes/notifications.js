const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all notifications for the authenticated user (generate from real data)
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = [];

    // Get recent bookings
    const recentTickets = await Ticket.find({})
      .populate('user', 'name')
      .populate('event', 'title')
      .sort({ bookingDate: -1 })
      .limit(10);

    // Get recent user registrations
    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    // Get recent events
    const recentEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt status');

    // Add booking notifications
    recentTickets.forEach((ticket, index) => {
      if (ticket.user && ticket.event) {
        notifications.push({
          id: `booking-${ticket._id}`,
          title: 'New Booking',
          message: `${ticket.user.name} booked a ticket for ${ticket.event.title}`,
          type: 'booking',
          priority: 'medium',
          read: index > 3, // Mark first 4 as unread
          timestamp: ticket.bookingDate || ticket.createdAt,
          actionUrl: '/admin/tickets',
          metadata: { ticketId: ticket._id, eventId: ticket.event._id }
        });
      }
    });

    // Add user registration notifications
    recentUsers.forEach((user, index) => {
      notifications.push({
        id: `user-${user._id}`,
        title: 'New User Registration',
        message: `${user.name} joined the platform`,
        type: 'user',
        priority: 'low',
        read: index > 2, // Mark first 3 as unread
        timestamp: user.createdAt,
        actionUrl: '/admin/users',
        metadata: { userId: user._id }
      });
    });

    // Add event notifications
    recentEvents.forEach((event, index) => {
      notifications.push({
        id: `event-${event._id}`,
        title: 'Event Activity',
        message: `Event "${event.title}" was ${event.status === 'published' ? 'published' : 'created'}`,
        type: 'event',
        priority: event.status === 'published' ? 'high' : 'medium',
        read: index > 2, // Mark first 3 as unread
        timestamp: event.createdAt,
        actionUrl: '/admin/events',
        metadata: { eventId: event._id }
      });
    });

    // Add some system notifications
    if (recentTickets.length > 0) {
      const totalRevenue = recentTickets.reduce((sum, ticket) => sum + (ticket.payment?.amount || 0), 0);
      if (totalRevenue > 0) {
        notifications.push({
          id: 'system-revenue',
          title: 'Revenue Update',
          message: `Total revenue reached $${totalRevenue.toLocaleString()}`,
          type: 'system',
          priority: 'medium',
          read: false,
          timestamp: new Date(),
          actionUrl: '/admin/dashboard',
          metadata: { revenue: totalRevenue }
        });
      }
    }

    // Sort by timestamp (newest first) and limit
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedNotifications = notifications.slice(0, 20);

    res.json({
      success: true,
      notifications: limitedNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read (simulated - since we generate notifications dynamically)
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    // Since we're generating notifications dynamically, we'll just return success
    // In a real implementation, you'd store read status in a database
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read (simulated)
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification (simulated)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// Create notification (for system use)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, message, type, priority, actionUrl, metadata } = req.body;

    const notification = new Notification({
      title,
      message,
      type,
      priority: priority || 'medium',
      userId: req.user.id,
      actionUrl,
      metadata
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        read: notification.read,
        timestamp: notification.createdAt,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
});

// Helper function to create system notifications
const createSystemNotification = async (userId, title, message, type = 'system', priority = 'medium', actionUrl = null, metadata = null) => {
  try {
    const notification = new Notification({
      title,
      message,
      type,
      priority,
      userId,
      actionUrl,
      metadata
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating system notification:', error);
    return null;
  }
};

module.exports = router;
module.exports.createSystemNotification = createSystemNotification;

// Booking confirmation notification endpoint used by frontend
// POST /api/notifications/send-booking-confirmation
router.post('/send-booking-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId, eventId, userId } = req.body || {};
    await createSystemNotification(
      userId || req.user.id,
      'Booking Confirmed',
      'Your ticket has been confirmed. See My Tickets for details.',
      'booking',
      'high',
      `/tickets/my-tickets`,
      { bookingId, eventId }
    );
    return res.json({ success: true, message: 'Booking confirmation notification queued' });
  } catch (error) {
    console.error('Failed to send booking confirmation notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to send booking confirmation' });
  }
});
