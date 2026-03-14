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
 * @param {string} [opts.type='info'] - info | success | warning | error | event | ticket | booking | system
 * @param {string} [opts.priority='normal'] - low | normal | high | urgent
 * @param {string} [opts.actionUrl] - Deep link URL
 * @param {object} [opts.metadata] - Extra structured data
 */
exports.notify = async (userId, { title, message, type = 'info', priority = 'normal', actionUrl, metadata } = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
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
    user: userId,
    title: opts.title,
    message: opts.message,
    type: opts.type || 'info',
    priority: opts.priority || 'normal',
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
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};
