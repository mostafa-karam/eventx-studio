const express = require('express');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const {
    initiateBooking,
    confirmBooking
} = require('../controllers/bookingController');

const router = express.Router();

// POST /api/booking/initiate
// Creates a lightweight booking session (for simplicity, echo details)
router.post('/initiate', authenticate, initiateBooking);

// POST /api/booking/confirm
// Confirms a booking by creating a ticket; expects a valid paymentId and token header
router.post('/confirm',
    authenticate,
    body('eventId').isMongoId().withMessage('Valid eventId is required'),
    body('paymentId').notEmpty().withMessage('paymentId is required'),
    confirmBooking
);

module.exports = router;
