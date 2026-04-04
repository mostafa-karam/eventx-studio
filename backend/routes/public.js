const express = require('express');
const { getPublicEvents, getPublicEventById, getPublicHalls, getPublicHallById } = require('../controllers/publicController');

const router = express.Router();

// GET /api/public/events — no auth required, published events with filters
router.get('/events', getPublicEvents);

// GET /api/public/events/:id — single event detail (public)
router.get('/events/:id', getPublicEventById);

// GET /api/public/halls — no auth required, active halls
router.get('/halls', getPublicHalls);

// GET /api/public/halls/:id — single hall detail (public)
router.get('/halls/:id', getPublicHallById);

module.exports = router;
