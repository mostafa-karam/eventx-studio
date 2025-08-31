const express = require('express');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/tickets/book
// @desc    Book a ticket for an event
// @access  Private
router.post('/book', authenticate, async (req, res) => {
  try {
    const { eventId, seatNumber, paymentMethod = 'free', transactionId, maskedLast4 } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
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

    // Ensure a valid seat map exists; rebuild from tickets if needed
    if (!event.seating || !Array.isArray(event.seating.seatMap) || event.seating.seatMap.length === 0) {
      // Reconstruct seat map using current tickets to accurately mark booked seats
      const existingTickets = await Ticket.find({
        event: eventId,
        status: { $in: ['booked', 'used'] }
      }).select('seatNumber user');

      const totalSeats = event.seating?.totalSeats || 0;
      const generatedSeatMap = [];
      for (let i = 1; i <= totalSeats; i++) {
        generatedSeatMap.push({
          seatNumber: `S${i.toString().padStart(3, '0')}`,
          isBooked: false,
          bookedBy: null
        });
      }

      const seatIndexByNumber = new Map(generatedSeatMap.map((s, idx) => [s.seatNumber, idx]));
      for (const t of existingTickets) {
        const idx = seatIndexByNumber.get(t.seatNumber);
        if (idx !== undefined) {
          generatedSeatMap[idx].isBooked = true;
          generatedSeatMap[idx].bookedBy = t.user;
        }
      }

      event.seating.seatMap = generatedSeatMap;
      // Recalculate available seats from generated map
      const bookedCount = existingTickets.length;
      event.seating.availableSeats = Math.max(0, (event.seating.totalSeats || 0) - bookedCount);
      await event.save();
    }

    let selectedSeatNumber = seatNumber || null;
    if (!selectedSeatNumber) {
      const firstAvailable = event.seating.seatMap.find(s => !s.isBooked);
      if (firstAvailable) {
        selectedSeatNumber = firstAvailable.seatNumber;
      }
    }

    // Validate seat selection
    const seat = selectedSeatNumber ? event.seating.seatMap.find(s => s.seatNumber === selectedSeatNumber) : null;
    if (!seat) {
      return res.status(400).json({
        success: false,
        message: 'No available seats for booking'
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
      event.bookSeat(selectedSeatNumber, req.user._id);
      await event.save();
    } catch (seatError) {
      return res.status(400).json({
        success: false,
        message: seatError.message
      });
    }

    // Verify transaction token if provided (prevents client spoofing simulated txIds)
    if (transactionId && req.body && req.headers && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
        const payload = jwt.verify(token, secret);
        // ensure the token matches provided transactionId and user
        if (payload.txId !== transactionId || payload.userId.toString() !== req.user._id.toString() || (payload.eventId && payload.eventId !== eventId)) {
          return res.status(400).json({ success: false, message: 'Invalid payment token' });
        }
      } catch (err) {
        console.warn('Payment token verification failed', err);
        return res.status(400).json({ success: false, message: 'Invalid payment token' });
      }
    }

    // Create ticket
    const ticketData = {
      event: eventId,
      user: req.user._id,
      seatNumber: selectedSeatNumber,
      payment: {
        amount: event.pricing.amount,
        currency: event.pricing.currency,
        paymentMethod,
        // If a transactionId was provided by the client (simulated payment), mark as completed
        transactionId: transactionId || undefined,
        status: event.pricing.type === 'free' || transactionId ? 'completed' : 'pending',
        paymentDate: event.pricing.type === 'free' || transactionId ? new Date() : null
      },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        source: 'web'
      }
    };

    // Accept maskedLast4 and store in metadata if provided
    if (maskedLast4) {
      ticketData.metadata.last4 = String(maskedLast4).slice(-4);
    }


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

// @route   POST /api/tickets/book-multi
// @desc    Book multiple tickets atomically
// @access  Private
router.post('/book-multi', authenticate, async (req, res) => {
  try {
    const { eventId, quantity = 1, seatNumbers = [], paymentMethod = 'free', transactionId } = req.body || {};
    const qty = Math.max(1, Math.min(parseInt(quantity, 10) || 1, 10));

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'published') return res.status(400).json({ success: false, message: 'Event is not available for booking' });
    if (event.date < new Date()) return res.status(400).json({ success: false, message: 'Cannot book tickets for past events' });

    // Prepare seat map as in single booking
    if (!event.seating || !Array.isArray(event.seating.seatMap) || event.seating.seatMap.length === 0) {
      const existingTickets = await Ticket.find({ event: eventId, status: { $in: ['booked', 'used'] } }).select('seatNumber user');
      const totalSeats = event.seating?.totalSeats || 0;
      const generatedSeatMap = [];
      for (let i = 1; i <= totalSeats; i++) {
        generatedSeatMap.push({ seatNumber: `S${i.toString().padStart(3, '0')}`, isBooked: false, bookedBy: null });
      }
      const seatIndexByNumber = new Map(generatedSeatMap.map((s, idx) => [s.seatNumber, idx]));
      for (const t of existingTickets) {
        const idx = seatIndexByNumber.get(t.seatNumber);
        if (idx !== undefined) { generatedSeatMap[idx].isBooked = true; generatedSeatMap[idx].bookedBy = t.user; }
      }
      event.seating.seatMap = generatedSeatMap;
      event.seating.availableSeats = Math.max(0, (event.seating.totalSeats || 0) - existingTickets.length);
      await event.save();
    }

    // Determine seats to book
    const seatsChosen = [];
    const seatMap = event.seating.seatMap;
    const requested = Array.isArray(seatNumbers) ? seatNumbers : [];
    for (const sn of requested) {
      const seat = seatMap.find(s => s.seatNumber === sn && !s.isBooked);
      if (seat && seatsChosen.length < qty) seatsChosen.push(seat.seatNumber);
    }
    for (const s of seatMap) {
      if (!s.isBooked && seatsChosen.length < qty && !seatsChosen.includes(s.seatNumber)) {
        seatsChosen.push(s.seatNumber);
      }
      if (seatsChosen.length === qty) break;
    }

    if (seatsChosen.length < qty) {
      return res.status(400).json({ success: false, message: 'Not enough seats available' });
    }

    // Ensure user has no existing ticket for this event (simple rule per single-book)
    const existingTicket = await Ticket.findOne({ event: eventId, user: req.user._id, status: { $in: ['booked', 'used'] } });
    if (existingTicket) {
      return res.status(400).json({ success: false, message: 'You already have a ticket for this event' });
    }

    // Book seats
    const createdTickets = [];
    for (const seatNumber of seatsChosen) {
      event.bookSeat(seatNumber, req.user._id);
      // Verify transaction token for multi-book if provided
      if (transactionId && req.body && req.headers && req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
          const payload = require('jsonwebtoken').verify(token, secret);
          if (payload.txId !== transactionId || payload.userId.toString() !== req.user._id.toString() || (payload.eventId && payload.eventId !== eventId)) {
            return res.status(400).json({ success: false, message: 'Invalid payment token' });
          }
        } catch (err) {
          console.warn('Payment token verification failed (multi)', err);
          return res.status(400).json({ success: false, message: 'Invalid payment token' });
        }
      }

      const ticket = new Ticket({
        event: eventId,
        user: req.user._id,
        seatNumber,
        payment: {
          amount: event.pricing.amount,
          currency: event.pricing.currency,
          paymentMethod,
          transactionId: transactionId || undefined,
          status: event.pricing.type === 'free' || transactionId ? 'completed' : 'pending',
          paymentDate: event.pricing.type === 'free' || transactionId ? new Date() : null
        },
        metadata: { userAgent: req.get('User-Agent'), ipAddress: req.ip, source: 'web' }
      });
      // attach masked last4 if provided
      if (req.body && req.body.maskedLast4) {
        ticket.metadata = ticket.metadata || {};
        ticket.metadata.last4 = String(req.body.maskedLast4).slice(-4);
      }
      await ticket.save();
      createdTickets.push(ticket);
    }
    await event.save();

    const populated = await Ticket.find({ _id: { $in: createdTickets.map(t => t._id) } })
      .populate('event', 'title date venue pricing')
      .populate('user', 'name email');

    return res.status(201).json({ success: true, message: 'Tickets booked successfully', data: { tickets: populated } });
  } catch (error) {
    console.error('Book multiple tickets error:', error);
    return res.status(500).json({ success: false, message: 'Server error while booking tickets' });
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
        // Do not generate QR for cancelled tickets
        let qrCodeImage = null;
        if (ticket.status !== 'cancelled') {
          try {
            qrCodeImage = await QRCode.toDataURL(ticket.qrCode, {
              errorCorrectionLevel: 'M',
              type: 'image/png',
              quality: 0.92,
              margin: 1
            });
          } catch (e) {
            console.warn('Failed to generate QR for ticket', ticket._id, e);
            qrCodeImage = null;
          }
        }

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
// NOTE: place admin listing route BEFORE the wildcard '/:id' route so 'admin' isn't treated as an id
// @route   GET /api/tickets/admin
// @desc    Get all tickets (admin view) - paginated
// @access  Private/Admin
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const query = {};
    // optional filters
    if (req.query.eventId) query.event = req.query.eventId;
    if (req.query.status) query.status = req.query.status;

    const tickets = await Ticket.find(query)
      .populate('event', 'title date venue')
      .populate('user', 'name email')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(query);

    // Calculate statistics
    const statusCounts = await Ticket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCountsObj = {};
    statusCounts.forEach(item => {
      statusCountsObj[item._id] = item.count;
    });

    // Count orphan tickets (tickets without valid event reference)
    const orphanCount = await Ticket.countDocuments({
      $or: [
        { event: { $exists: false } },
        { event: null }
      ]
    });

    const statistics = {
      total: await Ticket.countDocuments({}),
      statusCounts: statusCountsObj,
      orphanCount
    };

    res.json({
      success: true,
      data: {
        tickets,
        statistics,
        pagination: {
          current: page,
          pages: Math.max(1, Math.ceil(total / limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Admin tickets fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching tickets' });
  }
});

// Admin: list orphan tickets (tickets with missing or null event)
router.get('/admin/orphans', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const orphanMatcher = { $or: [{ event: { $exists: false } }, { event: null }] };
    const tickets = await Ticket.find(orphanMatcher)
      .populate('user', 'name email')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(orphanMatcher);

    res.json({ success: true, data: { tickets, pagination: { current: page, pages: Math.max(1, Math.ceil(total / limit)), total } } });
  } catch (error) {
    console.error('Admin orphans fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching orphan tickets' });
  }
});

// Admin: assign orphan ticket to an event
router.post('/admin/orphans/:id/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.body || {};
    if (!eventId) return res.status(400).json({ success: false, message: 'eventId is required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.event = event._id;
    await ticket.save();

    const populated = await Ticket.findById(ticket._id).populate('event', 'title date venue').populate('user', 'name email');
    res.json({ success: true, data: { ticket: populated } });
  } catch (error) {
    console.error('Assign orphan error:', error);
    res.status(500).json({ success: false, message: 'Server error while assigning orphan ticket' });
  }
});

// Admin: cancel orphan ticket
router.post('/admin/orphans/:id/cancel', authenticate, requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.status = 'cancelled';
    await ticket.save();

    res.json({ success: true, message: 'Ticket cancelled', data: { ticket } });
  } catch (error) {
    console.error('Cancel orphan error:', error);
    res.status(500).json({ success: false, message: 'Server error while cancelling orphan ticket' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date venue pricing organizer')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check if user owns the ticket or is admin
    if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ticket' });
    }

    // Generate QR code
    const qrCodeImage = await QRCode.toDataURL(ticket.qrCode, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1
    });

    res.json({ success: true, data: { ticket, qrCodeImage } });
  } catch (error) {
    console.error('Get ticket error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.status(500).json({ success: false, message: 'Server error while fetching ticket' });
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

