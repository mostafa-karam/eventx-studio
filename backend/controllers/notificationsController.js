const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Notification = require('../models/Notification'); // Ensure we require this since it's used inside
const logger = require('../utils/logger');

// @desc    Get all notifications for the authenticated user
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: { notifications }
        });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

// @desc    Mark notification as read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(id)) {
            const notification = await Notification.findOneAndUpdate(
                { _id: id, userId: req.user._id },
                { read: true },
                { new: true }
            );
            if (notification) {
                return res.json({ success: true, notification });
            }
        }
        return res.json({ success: true, message: 'Marked read' });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

// @desc    Mark all notifications as read
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id }, { read: true });
        return res.json({ success: true, message: 'All marked as read' });
    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};

// @desc    Delete notification
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(id)) {
            const notification = await Notification.findOneAndDelete(
                { _id: id, userId: req.user._id }
            );
            if (notification) {
                return res.json({ success: true, message: 'Notification deleted' });
            }
        }
        // Synthetic notifications — accept silently
        return res.json({ success: true, message: 'Notification removed' });
    } catch (error) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};

// @desc    Create notification
// @access  Private
exports.createNotification = async (req, res) => {
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
        logger.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification'
        });
    }
};

// @desc    Helper function to create system notifications
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
        logger.error('Error creating system notification:', error);
        return null;
    }
};

exports.createSystemNotification = createSystemNotification;

// @desc    Send booking confirmation notification
// @access  Private
exports.sendBookingConfirmation = async (req, res) => {
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
        logger.error('Failed to send booking confirmation notification:', error);
        return res.status(500).json({ success: false, message: 'Failed to send booking confirmation' });
    }
};
