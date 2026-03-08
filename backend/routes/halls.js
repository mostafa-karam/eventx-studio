const express = require('express');
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
router.get('/', optionalAuth, getHalls);

// GET /api/halls/:id
router.get('/:id', authenticate, getHallById);

// GET /api/halls/:id/availability
router.get('/:id/availability', authenticate, getHallAvailability);

// POST /api/halls
router.post('/', authenticate, requireVenueAdmin, createHallValidator, createHall);

// PUT /api/halls/:id
router.put('/:id', authenticate, requireVenueAdmin, updateHallValidator, updateHall);

// DELETE /api/halls/:id
router.delete('/:id', authenticate, requireAdmin, deleteHall);

module.exports = router;
