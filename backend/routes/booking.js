const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

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
        console.error('Booking initiate error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate booking' });
    }
});

// POST /api/booking/confirm
// Confirms a booking by creating a ticket; expects a valid paymentId and token header
router.post('/confirm', authenticate, async (req, res) => {
    try {
        const { eventId, paymentId, bookingId, paymentMethod = 'credit_card' } = req.body || {};
        if (!eventId || !paymentId) return res.status(400).json({ success: false, message: 'eventId and paymentId are required' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.status !== 'published') return res.status(400).json({ success: false, message: 'Event not available' });
        if (event.date < new Date()) return res.status(400).json({ success: false, message: 'Event already occurred' });

        // Verify payment token if provided via Authorization Bearer
        const authHeader = req.headers && req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
                const payload = jwt.verify(token, secret);
                if (payload.txId !== paymentId || payload.userId.toString() !== req.user._id.toString()) {
                    return res.status(400).json({ success: false, message: 'Invalid or mismatched payment token' });
                }
            } catch (e) {
                return res.status(400).json({ success: false, message: 'Invalid payment token' });
            }
        }

        // Ensure seat map and choose first available seat
        if (!event.seating || !Array.isArray(event.seating.seatMap) || event.seating.seatMap.length === 0) {
            event.seating = event.seating || { totalSeats: 0, availableSeats: 0, seatMap: [] };
            if (!event.seating.totalSeats) {
                event.seating.totalSeats = 100;
            }
            const generated = [];
            for (let i = 1; i <= event.seating.totalSeats; i++) {
                generated.push({ seatNumber: `S${i.toString().padStart(3, '0')}`, isBooked: false, bookedBy: null });
            }
            event.seating.seatMap = generated;
            // Only set availableSeats to totalSeats if it's not already set
            if (event.seating.availableSeats === undefined || event.seating.availableSeats === null) {
                event.seating.availableSeats = event.seating.totalSeats;
            }
            await event.save();
        }

        const firstAvailable = event.seating.seatMap.find((s) => !s.isBooked);
        if (!firstAvailable) return res.status(400).json({ success: false, message: 'No seats available' });

        event.bookSeat(firstAvailable.seatNumber, req.user._id);
        await event.save();

        const ticket = new Ticket({
            event: event._id,
            user: req.user._id,
            seatNumber: firstAvailable.seatNumber,
            payment: {
                amount: event.pricing.amount,
                currency: event.pricing.currency,
                paymentMethod,
                transactionId: paymentId,
                status: 'completed',
                paymentDate: new Date(),
            },
            metadata: { bookingId: bookingId || null },
        });
        await ticket.save();

        const populated = await Ticket.findById(ticket._id)
            .populate('event', 'title date venue pricing')
            .populate('user', 'name email');

        return res.json({ success: true, message: 'Booking confirmed', data: { booking: { _id: bookingId }, ticket: populated, payment: { id: paymentId } } });
    } catch (error) {
        console.error('Booking confirm error:', error);
        return res.status(500).json({ success: false, message: 'Failed to confirm booking' });
    }
});

module.exports = router;


