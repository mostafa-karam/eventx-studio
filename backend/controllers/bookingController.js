/**
 * Booking Controller
 *
 * Thin HTTP adapter — delegates booking orchestration to bookingService.
 */

const logger = require('../utils/logger');
const Event = require('../models/Event');
const bookingService = require('../services/bookingService');
const { validationResult } = require('express-validator');

// @desc    Initiates a booking session
// @access  Private
exports.initiateBooking = async (req, res) => {
    try {
        const { eventId } = req.body || {};
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

        return res.json({ success: true, data: { bookingSession } });
    } catch (error) {
        logger.error('Booking initiate error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate booking' });
    }
};

// @desc    Confirms a booking by creating a ticket
// @access  Private
exports.confirmBooking = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { eventId, paymentId, bookingId, paymentMethod = 'credit_card', couponCode } = req.body || {};

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const { ticket } = await bookingService.bookSeat({
            eventId,
            userId: req.user._id,
            payment: {
                amount: event.pricing?.amount || 0,
                method: paymentMethod,
                transactionId: paymentId,
            },
            couponCode,
        });

        const Ticket = require('../models/Ticket');
        const result = await Ticket.findById(ticket._id)
            .populate('event', 'title date venue pricing')
            .populate('user', 'name email');

        return res.json({
            success: true,
            message: 'Booking confirmed',
            data: {
                booking: { _id: bookingId },
                ticket: result,
                payment: { id: paymentId },
            },
        });
    } catch (error) {
        logger.error('Booking confirm error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return res.status(500).json({ success: false, message: 'Failed to confirm booking' });
    }
};
