/**
 * Booking Controller
 *
 * Thin HTTP adapter — delegates booking orchestration to bookingService.
 */

const logger = require('../utils/logger');
const Event = require('../models/Event');
const bookingService = require('../services/bookingService');
const auditService = require('../services/auditService');
const ticketsService = require('../services/ticketsService');

// @desc    Initiates a booking session
// @access  Private
exports.initiateBooking = async (req, res) => {
    try {
        const { eventId } = req.validatedBody || req.body || {};
        if (!eventId) return res.status(400).json({ success: false, message: 'eventId is required' });

        const event = await Event.findById(eventId).select('title pricing date venue seating status');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.status !== 'published') return res.status(400).json({ success: false, message: 'Event not available for booking' });

        const bookingSession = {
            _id: `bs_${Date.now()}`,
            userId: req.user._id,
            eventId,
            totalAmount: event.pricing?.amount || 0,
            fees: Math.round((event.pricing?.amount || 0) * 0.05),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };

        await auditService.log({
            req,
            actor: req.user,
            action: 'booking.initiate',
            resource: 'Booking',
            resourceId: bookingSession._id,
            details: {
                eventId,
                totalAmount: bookingSession.totalAmount,
                expiresAt: bookingSession.expiresAt,
            },
        });

        return res.json({ success: true, data: { bookingSession } });
    } catch (error) {
        logger.error('Booking initiate error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate booking' });
    }
};

// @desc    Confirms a booking by creating a ticket
// @access  Private
exports.confirmBooking = async (req, res) => {
    const {
        eventId,
        paymentId,
        bookingId,
        paymentMethod = 'credit_card',
        couponCode,
    } = req.validatedBody || req.body || {};

    try {
        const idempotencyKey = String(
            req.headers['idempotency-key'] ||
            req.headers['x-idempotency-key'] ||
            (req.validatedBody || req.body || {}).idempotencyKey ||
            ''
        ).trim() || undefined;

        const event = await ticketsService.findBookableEvent(eventId);

        // Calculate expected payment amount considering coupon
        let expectedAmount = event.pricing?.amount || 0;
        if (couponCode && event.pricing?.type === 'paid') {
            const Coupon = require('../models/Coupon');
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
                expiresAt: { $gt: new Date() },
            });
            if (!coupon) {
                return res.status(400).json({ success: false, message: 'Coupon is invalid or expired' });
            }
            if (!coupon.isValid) {
                return res.status(400).json({ success: false, message: 'Coupon is not valid or has expired' });
            }
            if (coupon.applicableEvents && coupon.applicableEvents.length > 0) {
                const matchesEvent = coupon.applicableEvents.some((id) => id.toString() === event._id.toString());
                if (!matchesEvent) {
                    return res.status(400).json({ success: false, message: 'Coupon is not applicable to this event' });
                }
            }
            if (coupon.discountType === 'percentage') {
                expectedAmount = expectedAmount - (expectedAmount * (coupon.discountValue / 100));
            } else {
                expectedAmount = Math.max(0, expectedAmount - coupon.discountValue);
            }
        }

        // Require server-verified payment for paid events.
        if (event.pricing?.type === 'paid') {
            if (!paymentId) {
                logger.warn(`Booking rejected: missing paymentId for paid event user=${req.user._id} event=${eventId}`);
                return res.status(400).json({ success: false, message: 'paymentId is required for paid events' });
            }
        }

        const { ticket } = await bookingService.bookSeat({
            eventId,
            userId: req.user._id,
            payment: {
                amount: expectedAmount,
                method: paymentMethod,
                transactionId: paymentId,
            },
            couponCode,
            idempotencyKey,
            paymentId,
        });

        const Ticket = require('../models/Ticket');
        const result = await Ticket.findById(ticket._id)
            .populate('event', 'title date venue pricing')
            .populate('user', 'name email');

        // Generate QR code image
        const QRCode = require('qrcode');
        const qrCodeImage = await QRCode.toDataURL(result.qrCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Audit log
        await auditService.log({
            req,
            actor: req.user,
            action: 'booking.confirm',
            resource: 'Ticket',
            resourceId: ticket._id,
            details: { eventId, bookingId, paymentMethod, amount: expectedAmount }
        });

        return res.json({
            success: true,
            message: 'Booking confirmed',
            data: {
                booking: { _id: bookingId },
                ticket: result,
                qrCodeImage,
                payment: { id: paymentId },
            },
        });
    } catch (error) {
        logger.error('Booking confirm error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return res.status(500).json({ success: false, message: 'Failed to confirm booking' });
    }
};
