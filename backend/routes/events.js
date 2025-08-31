const express = require('express');
const Event = require('../models/Event');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

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
// @desc    Get events created by current admin
// @access  Private/Admin
router.get('/admin/my-events', authenticate, requireAdmin, async (req, res) => {
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
// @access  Private/Admin
router.post('/', authenticate, requireAdmin, async (req, res) => {
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

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private/Admin
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
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
// @access  Private/Admin
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
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

module.exports = router;

