const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// @desc    Simulates payment processing and returns a payment receipt
// @access  Private
exports.processPayment = async (req, res) => {
    try {
        const { amount, currency = 'USD', quantity = 1, paymentMethod = 'credit_card', bookingId = null, eventId = null } = req.body || {};

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // In production, integrate with a PSP (Stripe, etc.)
        // For this project, simulate success and issue a signed token to bind transaction to user/session
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
        const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
        // Include amount, quantity, and currency in token to prevent tampering
        const token = jwt.sign({ txId, userId: req.user._id, eventId: eventId || null, amount, quantity, currency }, secret, { expiresIn: '10m' });

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
                    processedAt: new Date().toISOString(),
                    bookingId,
                    eventId,
                }
            }
        });
    } catch (err) {
        logger.error('Payment process error:', err);
        return res.status(500).json({ success: false, message: 'Payment processing failed' });
    }
};

// @desc    Issues a short-lived signed token for simulated payments
// @access  Private
exports.testToken = async (req, res) => {
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
        logger.error('Issue test payment token error:', err);
        return res.status(500).json({ success: false, message: 'Failed to issue test payment token' });
    }
};
