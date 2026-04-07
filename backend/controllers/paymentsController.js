const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { signPaymentToken } = require('../utils/paymentTokens');

// @desc    Simulates payment processing and returns a payment receipt with HMAC-signed token
// @access  Private
exports.processPayment = async (req, res) => {
    try {
        const { amount, currency = 'USD', quantity = 1, paymentMethod = 'credit_card', bookingId = null, eventId = null } = req.body || {};

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // In production, integrate with a PSP (Stripe, etc.)
        // For this project, simulate success and issue an HMAC-signed token
        const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 24)}`;

        // HMAC-signed token binds (txId, userId, eventId, amount, quantity, currency)
        const token = signPaymentToken({
            txId,
            userId: req.user._id,
            eventId: eventId || null,
            amount,
            quantity,
            currency,
        });

        // Also issue a JWT for backward compatibility during migration
        const jwtSecret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET;
        const jwtToken = jwt.sign(
            { txId, userId: req.user._id, eventId: eventId || null, amount, quantity, currency },
            jwtSecret,
            { expiresIn: '10m' }
        );

        return res.json({
            success: true,
            data: {
                paymentId: txId,
                token,        // HMAC token (preferred)
                jwtToken,     // JWT token (backward compat — will be removed)
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

// @desc    Issues a short-lived signed token for simulated payments (dev/test ONLY)
// @access  Private
exports.testToken = async (req, res) => {
    try {
        const { eventId } = req.body || {};
        // Gate test token behind non-production environment
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ success: false, message: 'Not available in production' });
        }

        const txId = `tx_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
        const token = signPaymentToken({
            txId,
            userId: req.user._id,
            eventId: eventId || null,
            amount: 0,
            quantity: 1,
            currency: 'USD',
        });

        return res.json({ success: true, data: { transactionId: txId, token } });
    } catch (err) {
        logger.error('Issue test payment token error:', err);
        return res.status(500).json({ success: false, message: 'Failed to issue test payment token' });
    }
};
