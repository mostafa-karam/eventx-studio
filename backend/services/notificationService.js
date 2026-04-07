/**
 * Notification Service
 * 
 * Single writer to the Notification collection.
 * All controllers should use this service instead of creating
 * Notification documents directly.
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Create a notification for a user
 * @param {string} userId - Target user's ObjectId
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.type='booking'] - booking | event | user | analytics | system
 * @param {string} [opts.priority='medium'] - low | medium | high
 * @param {string} [opts.actionUrl] - Deep link URL
 * @param {object} [opts.metadata] - Extra structured data
 */
exports.notify = async (userId, { title, message, type = 'booking', priority = 'medium', actionUrl, metadata } = {}) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      priority,
      actionUrl,
      metadata,
    });
    return notification;
  } catch (err) {
    logger.error(`NotificationService error for user ${userId}: ${err.message}`);
    return null; // Notifications should not fail the parent operation
  }
};

/**
 * Create notifications for multiple users
 * @param {string[]} userIds
 * @param {object} opts - Same as notify()
 */
exports.notifyMany = async (userIds, opts) => {
  const docs = userIds.map(userId => ({
    userId,
    title: opts.title,
    message: opts.message,
    type: opts.type || 'booking',
    priority: opts.priority || 'medium',
    actionUrl: opts.actionUrl,
    metadata: opts.metadata,
  }));

  try {
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error(`NotificationService bulk error: ${err.message}`);
    return [];
  }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
};

/**
 * Get all notifications for a user (latest 20).
 */
exports.getNotifications = async (userId) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);
};

/**
 * Delete a notification for a user.
 * Returns the deleted notification or null if not found.
 */
exports.deleteNotification = async (notificationId, userId) => {
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(notificationId)) {
    return Notification.findOneAndDelete({ _id: notificationId, userId });
  }
  return null;
};

/**
 * Create a user-initiated notification.
 */
exports.createUserNotification = async (userId, { title, message, type, priority, actionUrl, metadata }) => {
  return Notification.create({
    userId,
    title,
    message,
    type,
    priority: priority || 'medium',
    actionUrl,
    metadata,
  });
};
