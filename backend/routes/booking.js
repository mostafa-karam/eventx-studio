const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');
const { confirmBookingValidator, initiateBookingValidator } = require('../middleware/validators');
const {
    initiateBooking,
    confirmBooking
} = require('../controllers/bookingController');

const router = express.Router();

// Apply booking limiting to all routes here
router.use(bookingLimiter);

// POST /api/booking/initiate
// Creates a lightweight booking session (for simplicity, echo details)
router.post('/initiate', authenticate, idempotency({ ttlSeconds: 30 * 60 }), initiateBookingValidator, asyncHandler(initiateBooking));

// POST /api/booking/confirm
// Confirms a booking by creating a ticket; expects a valid paymentId and token header
router.post('/confirm',
    authenticate,
    idempotency({ ttlSeconds: 60 * 60 }),
    confirmBookingValidator,
    asyncHandler(confirmBooking)
);

module.exports = router;
