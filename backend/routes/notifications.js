const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  sendBookingConfirmation,
  createSystemNotification
} = require('../controllers/notificationsController');

// Get all notifications for the authenticated user
router.get('/', authenticate, asyncHandler(getNotifications);

// Mark notification as read
router.patch('/:id/read', authenticate, asyncHandler(markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticate, asyncHandler(markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, asyncHandler(deleteNotification);

// Create notification (for system use)
router.post('/', authenticate, asyncHandler(createNotification);

module.exports = router;
module.exports.createSystemNotification = createSystemNotification;

// Booking confirmation notification endpoint used by frontend
router.post('/send-booking-confirmation', authenticate, asyncHandler(sendBookingConfirmation);
