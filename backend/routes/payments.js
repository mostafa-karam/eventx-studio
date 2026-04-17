const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');
const { requireHealthyTransactions } = require('../middleware/transactionGuard');
const {
    createPaymentValidator,
    paymentWebhookValidator,
} = require('../middleware/validators');
const {
    createPayment,
    verifyPaymentWebhook,
} = require('../controllers/paymentsController');

const router = express.Router();

// Apply payment limiting to all routes here
router.use(paymentLimiter);

// POST /api/payments/process
// Creates a payment intent (processing state)
router.post('/process', requireHealthyTransactions, authenticate, idempotency({ ttlSeconds: 60 * 60, awaitPersist: true }), createPaymentValidator, asyncHandler(createPayment));

// POST /api/payments/webhook/verify
// Mock PSP callback that marks payment as verified/failed using signed payload
router.post('/webhook/verify', requireHealthyTransactions, idempotency({ ttlSeconds: 24 * 60 * 60, awaitPersist: true }), paymentWebhookValidator, asyncHandler(verifyPaymentWebhook));

module.exports = router;
