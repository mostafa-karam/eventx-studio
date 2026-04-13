const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, requireVenueAdmin, requireAdmin, optionalAuth } = require('../middleware/auth');
const { createHallValidator, updateHallValidator } = require('../middleware/validators');
const {
    getHalls,
    getHallById,
    getHallAvailability,
    createHall,
    updateHall,
    deleteHall
} = require('../controllers/hallsController');

const router = express.Router();

// GET /api/halls
router.get('/', optionalAuth, asyncHandler(getHalls);

// GET /api/halls/:id
router.get('/:id', authenticate, asyncHandler(getHallById);

// GET /api/halls/:id/availability
router.get('/:id/availability', authenticate, asyncHandler(getHallAvailability);

// POST /api/halls
router.post('/', authenticate, requireVenueAdmin, createHallValidator, asyncHandler(createHall);

// PUT /api/halls/:id
router.put('/:id', authenticate, requireVenueAdmin, updateHallValidator, asyncHandler(updateHall);

// DELETE /api/halls/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(deleteHall);

module.exports = router;
