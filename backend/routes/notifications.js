const express = require('express');
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
router.get('/', authenticate, getNotifications);

// Mark notification as read
router.patch('/:id/read', authenticate, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticate, markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, deleteNotification);

// Create notification (for system use)
router.post('/', authenticate, createNotification);

module.exports = router;
module.exports.createSystemNotification = createSystemNotification;

// Booking confirmation notification endpoint used by frontend
router.post('/send-booking-confirmation', authenticate, sendBookingConfirmation);
