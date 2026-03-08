const express = require('express');
const { authenticate, requireOrganizer, optionalAuth } = require('../middleware/auth');
const {
  getEvents,
  getMyEvents,
  getEventById,
  createEvent,
  cloneEvent,
  updateEvent,
  deleteEvent,
  getSeats,
  joinWaitlist,
  getWaitlist,
  approveWaitlist,
  exportAttendees,
  publishEvent
} = require('../controllers/eventsController');

const router = express.Router();

// GET /api/events
router.get('/', optionalAuth, getEvents);

// GET /api/events/admin/my-events
router.get('/admin/my-events', authenticate, requireOrganizer, getMyEvents);

// GET /api/events/:id
router.get('/:id', optionalAuth, getEventById);

// POST /api/events
router.post('/', authenticate, requireOrganizer, createEvent);

// POST /api/events/:id/clone
router.post('/:id/clone', authenticate, requireOrganizer, cloneEvent);

// PUT /api/events/:id
router.put('/:id', authenticate, requireOrganizer, updateEvent);

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireOrganizer, deleteEvent);

// GET /api/events/:id/seats
router.get('/:id/seats', getSeats);

// POST /api/events/:id/waitlist
router.post('/:id/waitlist', authenticate, joinWaitlist);

// GET /api/events/:id/waitlist
router.get('/:id/waitlist', authenticate, getWaitlist);

// POST /api/events/:id/waitlist/:waitlistId/approve
router.post('/:id/waitlist/:waitlistId/approve', authenticate, approveWaitlist);

// GET /api/events/:id/attendees/export
router.get('/:id/attendees/export', authenticate, exportAttendees);

// POST /api/events/:id/publish
router.post('/:id/publish', authenticate, publishEvent);

module.exports = router;
