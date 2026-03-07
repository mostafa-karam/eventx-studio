const express = require('express');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// POST /api/booking/initiate
// Creates a lightweight booking session (for simplicity, echo details)
router.post('/initiate', authenticate, async (req, res) => {
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
});

// POST /api/booking/confirm
// Confirms a booking by creating a ticket; expects a valid paymentId and token header
router.post('/confirm',
    authenticate,
    body('eventId').isMongoId().withMessage('Valid eventId is required'),
    body('paymentId').notEmpty().withMessage('paymentId is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { eventId, paymentId, bookingId, paymentMethod = 'credit_card' } = req.body || {};

        const session = await mongoose.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                const event = await Event.findById(eventId).session(session);
                if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
                if (event.status !== 'published') throw Object.assign(new Error('Event not available'), { status: 400 });
                if (event.date < new Date()) throw Object.assign(new Error('Event already occurred'), { status: 400 });

                // Ensure seat map exists
                if (!event.seating || !Array.isArray(event.seating.seatMap) || event.seating.seatMap.length === 0) {
                    event.seating = event.seating || { totalSeats: 0, availableSeats: 0, seatMap: [] };
                    if (!event.seating.totalSeats) event.seating.totalSeats = 100;
                    const generated = [];
                    for (let i = 1; i <= event.seating.totalSeats; i++) {
                        generated.push({ seatNumber: `S${i.toString().padStart(3, '0')}`, isBooked: false, bookedBy: null });
                    }
                    event.seating.seatMap = generated;
                    if (event.seating.availableSeats === undefined || event.seating.availableSeats === null) {
                        event.seating.availableSeats = event.seating.totalSeats;
                    }
                }

                const seatIndex = event.seating.seatMap.findIndex(s => !s.isBooked);
                if (seatIndex === -1) throw Object.assign(new Error('No seats available'), { status: 400 });

                // Book the seat atomically in this transaction
                event.seating.seatMap[seatIndex].isBooked = true;
                event.seating.seatMap[seatIndex].bookedBy = req.user._id;
                event.seating.availableSeats = Math.max(0, (event.seating.availableSeats || event.seating.totalSeats) - 1);

                await event.save({ session });

                const ticket = new Ticket({
                    event: event._id,
                    user: req.user._id,
                    seatNumber: event.seating.seatMap[seatIndex].seatNumber,
                    payment: {
                        amount: event.pricing?.amount || 0,
                        currency: event.pricing?.currency || 'USD',
                        paymentMethod,
                        transactionId: paymentId,
                        status: 'completed',
                        paymentDate: new Date(),
                    },
                    metadata: { bookingId: bookingId || null },
                });

                await ticket.save({ session });

                result = await Ticket.findById(ticket._id)
                    .populate('event', 'title date venue pricing')
                    .populate('user', 'name email')
                    .session(session);
            });

            session.endSession();
            return res.json({ success: true, message: 'Booking confirmed', data: { booking: { _id: bookingId }, ticket: result, payment: { id: paymentId } } });
        } catch (error) {
            session.endSession();
            logger.error('Booking confirm error:', error);
            if (error.status) return res.status(error.status).json({ success: false, message: error.message });
            return res.status(500).json({ success: false, message: 'Failed to confirm booking' });
        }
    }
);

module.exports = router;


