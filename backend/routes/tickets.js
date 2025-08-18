const express = require('express');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/tickets/book
// @desc    Book a ticket for an event
// @access  Private
router.post('/book', authenticate, async (req, res) => {
  try {
    const { eventId, seatNumber, paymentMethod = 'free' } = req.body;

    if (!eventId || !seatNumber) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and seat number are required'
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is published and not in the past
    if (event.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for booking'
      });
    }

    if (event.date < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book tickets for past events'
      });
    }

    // Check if user already has a ticket for this event
    const existingTicket = await Ticket.findOne({
      event: eventId,
      user: req.user._id,
      status: { $in: ['booked', 'used'] }
    });

    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: 'You already have a ticket for this event'
      });
    }

    // Check if seat is available
    const seat = event.seating.seatMap.find(s => s.seatNumber === seatNumber);
    if (!seat) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seat number'
      });
    }

    if (seat.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Seat is already booked'
      });
    }

    // Book the seat
    try {
      event.bookSeat(seatNumber, req.user._id);
      await event.save();
    } catch (seatError) {
      return res.status(400).json({
        success: false,
        message: seatError.message
      });
    }

    // Create ticket
    const ticketData = {
      event: eventId,
      user: req.user._id,
      seatNumber,
      payment: {
        amount: event.pricing.amount,
        currency: event.pricing.currency,
        paymentMethod,
        status: event.pricing.type === 'free' ? 'completed' : 'pending',
        paymentDate: event.pricing.type === 'free' ? new Date() : null
      },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        source: 'web'
      }
    };

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Generate QR code image
    const qrCodeData = ticket.qrCode;
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Populate ticket with event and user details
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('event', 'title date venue pricing')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Ticket booked successfully',
      data: {
        ticket: populatedTicket,
        qrCodeImage
      }
    });
  } catch (error) {
    console.error('Book ticket error:', error);
    
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
      message: 'Server error while booking ticket'
    });
  }
});

// @route   GET /api/tickets/my-tickets
// @desc    Get current user's tickets
// @access  Private
router.get('/my-tickets', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    const tickets = await Ticket.find(query)
      .populate('event', 'title date venue pricing status')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(query);

    // Generate QR codes for tickets
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => {
        const qrCodeImage = await QRCode.toDataURL(ticket.qrCode, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1
        });
        
        return {
          ...ticket.toObject(),
          qrCodeImage
        };
      })
    );

    res.json({
      success: true,
      data: {
        tickets: ticketsWithQR,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets'
    });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get single ticket by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date venue pricing organizer')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns the ticket or is admin
    if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    // Generate QR code
    const qrCodeImage = await QRCode.toDataURL(ticket.qrCode, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1
    });

    res.json({
      success: true,
      data: {
        ticket,
        qrCodeImage
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ticket'
    });
  }
});

// @route   PUT /api/tickets/:id/cancel
// @desc    Cancel a ticket
// @access  Private
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns the ticket
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this ticket'
      });
    }

    // Check if ticket can be cancelled
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already cancelled'
      });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a used ticket'
      });
    }

    // Check if event is in the past
    if (ticket.event.date < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel tickets for past events'
      });
    }

    // Cancel the ticket
    ticket.cancel();
    await ticket.save();

    // Free up the seat in the event
    const event = await Event.findById(ticket.event._id);
    event.cancelSeat(ticket.seatNumber);
    await event.save();

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    console.error('Cancel ticket error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling ticket'
    });
  }
});

// @route   POST /api/tickets/:id/checkin
// @desc    Check in a ticket (Admin only)
// @access  Private/Admin
router.post('/:id/checkin', authenticate, requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check in the ticket
    try {
      ticket.performCheckIn(req.user._id);
      await ticket.save();
    } catch (checkInError) {
      return res.status(400).json({
        success: false,
        message: checkInError.message
      });
    }

    res.json({
      success: true,
      message: 'Ticket checked in successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    console.error('Check in ticket error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while checking in ticket'
    });
  }
});

// @route   GET /api/tickets/event/:eventId
// @desc    Get all tickets for an event (Admin only)
// @access  Private/Admin
router.get('/event/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find({ event: req.params.eventId })
      .populate('user', 'name email phone')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ event: req.params.eventId });

    // Get ticket statistics
    const stats = await Ticket.aggregate([
      { $match: { event: mongoose.Types.ObjectId(req.params.eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$payment.amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get event tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event tickets'
    });
  }
});

module.exports = router;

