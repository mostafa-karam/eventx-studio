const logger = require('../utils/logger');
const paymentsService = require('../services/paymentsService');
const { logSecurityEvent } = require('../utils/securityLog');

// @desc    Create payment intent in processing state
// @access  Private
exports.createPayment = async (req, res) => {
    try {
        const {
            amount,
            currency,
            quantity = 1,
            paymentMethod = 'credit_card',
            eventId,
            couponCode,
        } = req.validatedBody || req.body || {};
        const payment = await paymentsService.createPaymentIntent({
            userId: req.user._id,
            eventId,
            amount: Number(amount),
            currency,
            quantity: Number(quantity),
            paymentMethod,
            couponCode,
        });

        return res.status(200).json({
            success: true,
            data: {
                paymentId: payment.paymentId,
                transactionId: payment.paymentId,
                payment: {
                    id: payment.paymentId,
                    status: payment.status,
                    amount: payment.amount,
                    currency: payment.currency,
                    quantity: payment.quantity,
                    method: payment.method,
                    eventId: payment.event,
                    provider: payment.provider,
                    createdAt: payment.createdAt,
                },
            },
        });
    } catch (err) {
        logger.error('Payment create error:', err);
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        return res.status(500).json({ success: false, message: 'Payment creation failed' });
    }
};

// @desc    Verify payment webhook (mock PSP callback)
// @access  Provider webhook (signed)
exports.verifyPaymentWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-payment-signature'];
        const payment = await paymentsService.handleVerificationWebhook(req.validatedBody || req.body || {}, signature, req);
        return res.json({
            success: true,
            data: {
                payment: {
                    id: payment.paymentId,
                    status: payment.status,
                    providerPaymentId: payment.providerPaymentId,
                    verifiedAt: payment.verifiedAt,
                },
            },
        });
    } catch (err) {
        logSecurityEvent(req, 'payment.webhook.rejected', {
            status: err.status || err.statusCode || 500,
            reason: err.message,
        });
        logger.warn(`Payment webhook rejected: ${err.message}`);
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

// Backward-compatible aliases for older internal tests/consumers.
exports.processPayment = exports.createPayment;
exports.testToken = async (_req, res) => res.status(404).json({
    success: false,
    message: 'Endpoint removed. Use /api/payments/process and provider webhook verification.',
});
