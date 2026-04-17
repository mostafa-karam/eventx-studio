const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate } = require('../middleware/auth');
const { confirmBookingValidator, initiateBookingValidator } = require('../middleware/validators');
const {
    initiateBooking,
    confirmBooking
} = require('../controllers/bookingController');

const router = express.Router();

// POST /api/booking/initiate
// Creates a lightweight booking session (for simplicity, echo details)
router.post('/initiate', authenticate, initiateBookingValidator, asyncHandler(initiateBooking));

// POST /api/booking/confirm
// Confirms a booking by creating a ticket; expects a valid paymentId and token header
router.post('/confirm',
    authenticate,
    confirmBookingValidator,
    asyncHandler(confirmBooking)
);

module.exports = router;
