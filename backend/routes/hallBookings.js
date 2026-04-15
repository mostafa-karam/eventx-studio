const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

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
router.get('/', authenticate, requireVenueAdmin, asyncHandler(getPlatformBookings));

// GET /api/hall-bookings/my
router.get('/my', authenticate, requireOrganizer, asyncHandler(getMyBookings));

// POST /api/hall-bookings
router.post('/', authenticate, requireOrganizer, createBookingValidator, asyncHandler(createBooking));

// POST /api/hall-bookings/maintenance
router.post('/maintenance', authenticate, requireVenueAdmin, asyncHandler(scheduleMaintenance));

// PUT /api/hall-bookings/:id/approve
router.put('/:id/approve', authenticate, requireVenueAdmin, asyncHandler(approveBooking));

// PUT /api/hall-bookings/:id/reject
router.put('/:id/reject', authenticate, requireVenueAdmin, asyncHandler(rejectBooking));

// DELETE /api/hall-bookings/:id
router.delete('/:id', authenticate, requireOrganizer, asyncHandler(cancelBooking));

module.exports = router;
