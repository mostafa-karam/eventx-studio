const express = require('express');
const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const Ticket = require('../models/Ticket');
const { authenticate, requireAdmin, requireOrganizer, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events (public with optional auth for personalization)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query
    let query = { status: 'published' };

    // Add filters
    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'venue.name': { $regex: req.query.search, $options: 'i' } },
        { 'venue.city': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.city) {
      query['venue.city'] = { $regex: req.query.city, $options: 'i' };
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) {
        query.date.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        query.date.$lte = new Date(req.query.dateTo);
      }
    }

    if (req.query.priceMin || req.query.priceMax) {
      query['pricing.amount'] = {};
      if (req.query.priceMin) {
        query['pricing.amount'].$gte = parseFloat(req.query.priceMin);
      }
      if (req.query.priceMax) {
        query['pricing.amount'].$lte = parseFloat(req.query.priceMax);
      }
    }

    // Sort options
    let sort = { date: 1 }; // Default: upcoming events first
    if (req.query.sort === 'popular') {
      sort = { 'analytics.views': -1, 'analytics.bookings': -1 };
    } else if (req.query.sort === 'newest') {
      sort = { createdAt: -1 };
    } else if (req.query.sort === 'price-low') {
      sort = { 'pricing.amount': 1 };
    } else if (req.query.sort === 'price-high') {
      sort = { 'pricing.amount': -1 };
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-seating.seatMap'); // Don't send seat map in list view

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        filters: {
          categories: await Event.distinct('category', { status: 'published' }),
          cities: await Event.distinct('venue.city', { status: 'published' })
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events'
    });
  }
});

// @route   GET /api/events/admin/my-events
// @desc    Get events created by current organizer/admin
// @access  Private/Organizer
router.get('/admin/my-events', authenticate, requireOrganizer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base query: events created by the current admin
    const query = { organizer: req.user._id };

    // Optional text search across a few fields
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'venue.name': { $regex: req.query.search, $options: 'i' } },
        { 'venue.city': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Optional category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Optional date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.date.$lte = new Date(req.query.dateTo);
    }

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-seating.seatMap');

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events'
    });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email phone');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    event.analytics.views += 1;
    await event.save();

    res.json({
      success: true,
      data: {
        event
      }
    });
  } catch (error) {
    console.error('Get event error:', error);

    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching event'
    });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private/Organizer
router.post('/', authenticate, requireOrganizer, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user._id
    };

    const event = new Event(eventData);
    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event: populatedEvent
      }
    });
  } catch (error) {
    console.error('Create event error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating event'
    });
  }
});

// @route   POST /api/events/:id/clone
// @desc    Clone an existing event
// @access  Private/Organizer
router.post('/:id/clone', authenticate, requireOrganizer, async (req, res) => {
  try {
    const originalEvent = await Event.findById(req.params.id);

    if (!originalEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer or admin
    if (originalEvent.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to clone this event'
      });
    }

    const eventData = originalEvent.toObject();

    // Remove specific identifiers
    delete eventData._id;
    delete eventData.createdAt;
    delete eventData.updatedAt;
    delete eventData.__v;

    // Reset status and specific fields
    eventData.title = `${originalEvent.title} (Copy)`;
    eventData.status = 'draft';
    eventData.analytics = { views: 0, bookings: 0 };
    if (eventData.seating) {
      eventData.seating.availableSeats = eventData.seating.totalSeats;
      eventData.seating.seatMap = [];
    }

    const newEvent = new Event(eventData);
    await newEvent.save();

    const populatedEvent = await Event.findById(newEvent._id)
      .populate('organizer', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event cloned successfully',
      data: {
        event: populatedEvent
      }
    });

  } catch (error) {
    console.error('Clone event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cloning event'
    });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private/Organizer
router.put('/:id', authenticate, requireOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Update event
    Object.keys(req.body).forEach(key => {
      if (key !== 'organizer') { // Don't allow changing organizer
        event[key] = req.body[key];
      }
    });

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name email');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        event: populatedEvent
      }
    });
  } catch (error) {
    console.error('Update event error:', error);

    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating event'
    });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private/Organizer
router.delete('/:id', authenticate, requireOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);

    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while deleting event'
    });
  }
});

// @route   GET /api/events/:id/seats
// @desc    Get available seats for an event
// @access  Public
router.get('/:id/seats', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('seating title date venue.name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: {
        eventTitle: event.title,
        eventDate: event.date,
        venue: event.venue.name,
        totalSeats: event.seating.totalSeats,
        availableSeats: event.seating.availableSeats,
        seatMap: event.seating.seatMap
      }
    });
  } catch (error) {
    console.error('Get seats error:', error);

    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching seats'
    });
  }
});

// @route   POST /api/events/:id/waitlist
// @desc    Join the waitlist for a sold-out event
// @access  Private
router.post('/:id/waitlist', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Event is not active' });
    }

    // Check if tickets are actually sold out
    if (event.seating && event.seating.availableSeats > 0) {
      return res.status(400).json({ success: false, message: 'Tickets are still available for this event' });
    }

    const waitlistEntry = new Waitlist({
      event: event._id,
      user: req.user._id,
      status: 'pending'
    });

    await waitlistEntry.save();

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: { waitlist: waitlistEntry }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already on the waitlist for this event'
      });
    }
    console.error('Join waitlist error:', error);
    res.status(500).json({ success: false, message: 'Server error while joining waitlist' });
  }
});

// @route   GET /api/events/:id/waitlist
// @desc    Get waitlist for an event
// @access  Private (Admin/Organizer)
router.get('/:id/waitlist', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view waitlist' });
    }

    const waitlist = await Waitlist.find({ event: event._id })
      .populate('user', 'name email phone')
      .sort({ createdAt: 1 }); // FIFO

    res.json({
      success: true,
      data: { waitlist }
    });
  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching waitlist' });
  }
});

// @route   POST /api/events/:id/waitlist/:waitlistId/approve
// @desc    Approve a waitlist entry
// @access  Private (Admin/Organizer)
router.post('/:id/waitlist/:waitlistId/approve', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to approve waitlist' });
    }

    const waitlistEntry = await Waitlist.findOne({ _id: req.params.waitlistId, event: event._id });

    if (!waitlistEntry) {
      return res.status(404).json({ success: false, message: 'Waitlist entry not found' });
    }

    if (waitlistEntry.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot approve entry in ${waitlistEntry.status} status` });
    }

    waitlistEntry.status = 'notified';
    waitlistEntry.notifiedAt = new Date();
    // Give them 24 hours to purchase
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    waitlistEntry.expiresAt = expires;

    await waitlistEntry.save();

    res.json({
      success: true,
      message: 'Waitlist entry approved. User has 24 hours to purchase.',
      data: { waitlist: waitlistEntry }
    });
  } catch (error) {
    console.error('Approve waitlist error:', error);
    res.status(500).json({ success: false, message: 'Server error while approving waitlist' });
  }
});

// @route   GET /api/events/:id/attendees/export
// @desc    Export attendees list as CSV
// @access  Private (Admin/Organizer)
router.get('/:id/attendees/export', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to export attendees' });
    }

    const tickets = await Ticket.find({
      event: event._id,
      status: { $in: ['booked', 'used'] }
    }).populate('user', 'name email phone').sort({ bookingDate: 1 });

    // Build CSV Headers
    let csvData = 'Ticket ID,Name,Email,Phone,Seat Number,Booking Date,Status,Payment Amount\n';

    // Build CSV Rows
    tickets.forEach(ticket => {
      const tId = escapeCSV(ticket.ticketId);
      const name = ticket.user ? escapeCSV(ticket.user.name) : 'Unknown';
      const email = ticket.user ? escapeCSV(ticket.user.email) : 'Unknown';
      const phone = ticket.user?.phone ? escapeCSV(ticket.user.phone) : 'N/A';
      const seat = escapeCSV(ticket.seatNumber);
      const date = escapeCSV(new Date(ticket.bookingDate).toLocaleDateString());
      const status = escapeCSV(ticket.status);
      const amount = ticket.payment?.amount ? escapeCSV('$' + ticket.payment.amount) : 'Free';

      csvData += `${tId},${name},${email},${phone},${seat},${date},${status},${amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Attendees_${event.title.replace(/\s+/g, '_')}.csv`);

    res.send(csvData);

  } catch (error) {
    console.error('Export attendees error:', error);
    res.status(500).json({ success: false, message: 'Server error while exporting attendees' });
  }
});

// Helper to escape CSV fields
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  const strVal = String(str);
  if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
    return `"${strVal.replace(/"/g, '""')}"`;
  }
  return strVal;
}

module.exports = router;

