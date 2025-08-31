const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/payments/process
// Simulates payment processing and returns a payment receipt
router.post('/process', authenticate, async (req, res) => {
    try {
        const { amount, currency = 'USD', paymentMethod = 'credit_card', paymentDetails = {}, bookingId = null, eventId = null } = req.body || {};

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // In production, integrate with a PSP (Stripe, etc.)
        // For this project, simulate success and issue a signed token to bind transaction to user/session
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
        const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
        const token = jwt.sign({ txId, userId: req.user._id, eventId: eventId || null }, secret, { expiresIn: '10m' });

        const maskedLast4 = (paymentDetails.cardNumber || '').toString().replace(/\D/g, '').slice(-4) || null;

        return res.json({
            success: true,
            data: {
                paymentId: txId,
                token,
                payment: {
                    id: txId,
                    status: 'succeeded',
                    amount,
                    currency,
                    method: paymentMethod,
                    maskedLast4,
                    processedAt: new Date().toISOString(),
                    bookingId,
                    eventId,
                }
            }
        });
    } catch (err) {
        console.error('Payment process error:', err);
        return res.status(500).json({ success: false, message: 'Payment processing failed' });
    }
});

// POST /api/payments/test-token
// Issues a short-lived signed token for simulated payments. Requires auth.
router.post('/test-token', authenticate, async (req, res) => {
    try {
        const { eventId } = req.body || {};
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';

        const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
        const payload = {
            txId,
            userId: req.user._id,
            eventId: eventId || null
        };

        // token valid for 10 minutes
        const token = jwt.sign(payload, secret, { expiresIn: '10m' });

        return res.json({ success: true, data: { transactionId: txId, token } });
    } catch (err) {
        console.error('Issue test payment token error:', err);
        return res.status(500).json({ success: false, message: 'Failed to issue test payment token' });
    }
});

module.exports = router;
