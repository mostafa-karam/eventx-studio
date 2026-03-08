const express = require('express');
const { authenticate, requireOrganizer, requireVenueAdmin } = require('../middleware/auth');
const { createBookingValidator } = require('../middleware/validators');
const {
    getPlatformBookings,
    getMyBookings,
    createBooking,
    scheduleMaintenance,
    approveBooking,
    rejectBooking,
    cancelBooking
} = require('../controllers/hallBookingsController');

const router = express.Router();

// GET /api/hall-bookings
router.get('/', authenticate, requireVenueAdmin, getPlatformBookings);

// GET /api/hall-bookings/my
router.get('/my', authenticate, requireOrganizer, getMyBookings);

// POST /api/hall-bookings
router.post('/', authenticate, requireOrganizer, createBookingValidator, createBooking);

// POST /api/hall-bookings/maintenance
router.post('/maintenance', authenticate, requireVenueAdmin, scheduleMaintenance);

// PUT /api/hall-bookings/:id/approve
router.put('/:id/approve', authenticate, requireVenueAdmin, approveBooking);

// PUT /api/hall-bookings/:id/reject
router.put('/:id/reject', authenticate, requireVenueAdmin, rejectBooking);

// DELETE /api/hall-bookings/:id
router.delete('/:id', authenticate, cancelBooking);

module.exports = router;
