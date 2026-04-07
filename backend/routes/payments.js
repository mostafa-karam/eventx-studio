const express = require('express');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const {
    processPayment,
    testToken
} = require('../controllers/paymentsController');

const router = express.Router();

// Apply payment limiting to all routes here
router.use(paymentLimiter);

// POST /api/payments/process
// Simulates payment processing and returns a payment receipt
router.post('/process', authenticate, processPayment);

// POST /api/payments/test-token
// Issues a short-lived signed token for simulated payments. Requires auth.
router.post('/test-token', authenticate, testToken);

module.exports = router;
