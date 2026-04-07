const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

// @desc    Get all notifications for the authenticated user
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(req.user._id);
        res.json({ success: true, data: { notifications } });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// @desc    Mark notification as read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user._id);
        if (notification) {
            return res.json({ success: true, notification });
        }
        return res.json({ success: true, message: 'Marked read' });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};

// @desc    Mark all notifications as read
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user._id);
        return res.json({ success: true, message: 'All marked as read' });
    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
};

// @desc    Delete notification
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await notificationService.deleteNotification(req.params.id, req.user._id);
        if (notification) {
            return res.json({ success: true, message: 'Notification deleted' });
        }
        // Synthetic notifications — accept silently
        return res.json({ success: true, message: 'Notification removed' });
    } catch (error) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};

// @desc    Create notification
// @access  Private
exports.createNotification = async (req, res) => {
    try {
        const notification = await notificationService.createUserNotification(req.user._id, req.body);

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
                metadata: notification.metadata,
            },
        });
    } catch (error) {
        logger.error('Error creating notification:', error);
        res.status(500).json({ success: false, message: 'Failed to create notification' });
    }
};

// @desc    Helper function to create system notifications
const createSystemNotification = async (userId, title, message, type = 'system', priority = 'medium', actionUrl = null, metadata = null) => {
    return notificationService.notify(userId, { title, message, type, priority, actionUrl, metadata });
};

exports.createSystemNotification = createSystemNotification;

// @desc    Send booking confirmation notification
// @access  Private
exports.sendBookingConfirmation = async (req, res) => {
    try {
        const { bookingId, eventId } = req.body || {};
        await createSystemNotification(
            req.user._id,
            'Booking Confirmed',
            'Your ticket has been confirmed. See My Tickets for details.',
            'booking',
            'high',
            `/tickets/my-tickets`,
            { bookingId, eventId }
        );
        return res.json({ success: true, message: 'Booking confirmation notification queued' });
    } catch (error) {
        logger.error('Failed to send booking confirmation notification:', error);
        return res.status(500).json({ success: false, message: 'Failed to send booking confirmation' });
    }
};
