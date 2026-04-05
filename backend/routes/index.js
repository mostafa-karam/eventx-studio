const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth');
const eventRoutes = require('./events');
const ticketRoutes = require('./tickets');
const analyticsRoutes = require('./analytics');
const paymentRoutes = require('./payments');
const bookingRoutes = require('./booking');
const userRoutes = require('./users');
const notificationRoutes = require('./notifications');
const supportRoutes = require('./support');
const marketingRoutes = require('./marketing');
const categoriesRoutes = require('./categories');
const hallRoutes = require('./halls');
const hallBookingRoutes = require('./hallBookings');
const publicRoutes = require('./public');
const auditLogRoutes = require('./auditLog');
const searchRoutes = require('./search');
const uploadRoutes = require('./upload');
const couponRoutes = require('./coupons');
const reviewsRoutes = require('./reviews');

// Register routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/payments', paymentRoutes);
router.use('/booking', bookingRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);
router.use('/marketing', marketingRoutes);
router.use('/categories', categoriesRoutes);
router.use('/halls', hallRoutes);
router.use('/hall-bookings', hallBookingRoutes);
router.use('/public', publicRoutes);
router.use('/audit-log', auditLogRoutes);
router.use('/search', searchRoutes);
router.use('/upload', uploadRoutes);
router.use('/events/:eventId/reviews', reviewsRoutes); // Nested route
router.use('/coupons', couponRoutes);

module.exports = router;
