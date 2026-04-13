const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, requireOrganizer, optionalAuth } = require('../middleware/auth');
const { createEventValidator, updateEventValidator } = require('../middleware/validators');
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
  publishEvent,
  cancelEvent,
  getMyWaitlists
} = require('../controllers/eventsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management APIs
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Retrieve a list of events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of events
 */
// GET /api/events
router.get('/', optionalAuth, asyncHandler(getEvents));

// GET /api/events/admin/my-events
router.get('/admin/my-events', authenticate, requireOrganizer, asyncHandler(getMyEvents));

// GET /api/events/:id
router.get('/:id', optionalAuth, asyncHandler(getEventById));

// POST /api/events
router.post('/', authenticate, requireOrganizer, createEventValidator, asyncHandler(createEvent));

// POST /api/events/:id/clone
router.post('/:id/clone', authenticate, requireOrganizer, asyncHandler(cloneEvent));

// PUT /api/events/:id
router.put('/:id', authenticate, requireOrganizer, updateEventValidator, asyncHandler(updateEvent));

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireOrganizer, asyncHandler(deleteEvent));

// GET /api/events/:id/seats
// FIX H-02 — Add optionalAuth to allow masking bookedBy data for non-owners
router.get('/:id/seats', optionalAuth, asyncHandler(getSeats));

// GET /api/events/waitlists/my
router.get('/waitlists/my', authenticate, asyncHandler(getMyWaitlists));

// POST /api/events/:id/waitlist
router.post('/:id/waitlist', authenticate, asyncHandler(joinWaitlist));

// GET /api/events/:id/waitlist
router.get('/:id/waitlist', authenticate, asyncHandler(getWaitlist));

// POST /api/events/:id/waitlist/:waitlistId/approve
router.post('/:id/waitlist/:waitlistId/approve', authenticate, asyncHandler(approveWaitlist));

// GET /api/events/:id/attendees/export
router.get('/:id/attendees/export', authenticate, asyncHandler(exportAttendees));

// POST /api/events/:id/publish
router.post('/:id/publish', authenticate, requireOrganizer, asyncHandler(publishEvent));

// POST /api/events/:id/cancel
router.post('/:id/cancel', authenticate, requireOrganizer, asyncHandler(cancelEvent));

module.exports = router;
