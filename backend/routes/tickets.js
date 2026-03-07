const express = require('express');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
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
    // Token is sent in request body as 'paymentToken' from the payment simulation flow
    const paymentToken = req.body.paymentToken;
    if (transactionId) {
      if (!paymentToken) {
        return res.status(400).json({ success: false, message: 'Payment token is required to complete a paid booking' });
      }
      try {
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
        const payload = jwt.verify(paymentToken, secret);
        // Ensure the token matches the provided transactionId, user, and event
        if (payload.txId !== transactionId || payload.userId.toString() !== req.user._id.toString() || (payload.eventId && payload.eventId !== eventId)) {
          return res.status(400).json({ success: false, message: 'Invalid payment token' });
        }
      } catch (err) {
        logger.warn('Payment token verification failed: ' + err.message);
        return res.status(400).json({ success: false, message: 'Invalid or expired payment token' });
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

    // Increment analytics revenue counter
    if (event.pricing?.type !== 'free' && event.pricing?.amount > 0) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { 'analytics.revenue': event.pricing.amount, 'analytics.bookings': 1 }
      });
    } else {
      await Event.findByIdAndUpdate(eventId, { $inc: { 'analytics.bookings': 1 } });
    }

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
    logger.error('Book ticket error:', error);

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
    const { eventId, quantity = 1, seatNumbers = [], paymentMethod = 'free', transactionId, paymentToken } = req.body || {};
    const qty = Math.max(1, Math.min(parseInt(quantity, 10) || 1, 10));

    // Verify payment token upfront for multi-book
    if (transactionId) {
      if (!paymentToken) {
        return res.status(400).json({ success: false, message: 'Payment token is required to complete a paid booking' });
      }
      try {
        const secret = process.env.PAYMENT_SIMULATION_SECRET || process.env.JWT_SECRET || 'dev-payment-secret';
        const payload = jwt.verify(paymentToken, secret);
        if (payload.txId !== transactionId || payload.userId.toString() !== req.user._id.toString() || (payload.eventId && payload.eventId !== eventId)) {
          return res.status(400).json({ success: false, message: 'Invalid payment token' });
        }
      } catch (err) {
        logger.warn('Multi-book payment token verification failed: ' + err.message);
        return res.status(400).json({ success: false, message: 'Invalid or expired payment token' });
      }
    }

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
      // Transaction token is verified once before the loop (not per-seat)

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

    // Increment analytics revenue for multi-bookings
    const pricePerTicket = event.pricing?.amount || 0;
    const revenueIncrement = event.pricing?.type !== 'free' ? pricePerTicket * seatsChosen.length : 0;
    await Event.findByIdAndUpdate(eventId, {
      $inc: { 'analytics.revenue': revenueIncrement, 'analytics.bookings': seatsChosen.length }
    });

    const populated = await Ticket.find({ _id: { $in: createdTickets.map(t => t._id) } })
      .populate('event', 'title date venue pricing')
      .populate('user', 'name email');

    return res.status(201).json({ success: true, message: 'Tickets booked successfully', data: { tickets: populated } });
  } catch (error) {
    logger.error('Book multiple tickets error:', error);
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
            logger.warn('Failed to generate QR for ticket ' + ticket._id + ': ' + e.message);
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
    logger.error('Get my tickets error:', error);
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
    logger.error('Admin tickets fetch error:', error);
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
    logger.error('Admin orphans fetch error:', error);
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
    logger.error('Assign orphan error:', error);
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
    logger.error('Cancel orphan error:', error);
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
    logger.error('Get ticket error:', error);
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
    const event = await Event.findById(ticket.event._id).populate('organizer');
    event.cancelSeat(ticket.seatNumber);
    await event.save();

    // Handle waitlist auto-notify if someone is waitlisted
    try {
      const waitlistEntry = await require('../models/Waitlist').findOne({ event: event._id }).sort({ createdAt: 1 });
      if (waitlistEntry) {
        // Notify the first person on the waitlist
        await Notification.create({
          user: waitlistEntry.user,
          type: 'waitlist_spot_available',
          title: 'A Spot Opened Up!',
          message: `A ticket is now available for "${event.title}". Book quickly before it's gone!`,
          data: { eventId: event._id }
        });
        // Remove them from waitlist since they are notified
        await waitlistEntry.deleteOne();
      }
    } catch (wlError) {
      logger.error('Waitlist processing error on ticket cancel: ' + wlError.message);
    }

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    logger.error('Cancel ticket error:', error);

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
    logger.error('Check in ticket error:', error);

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
      { $match: { event: new mongoose.Types.ObjectId(req.params.eventId) } },
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
    logger.error('Get event tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event tickets'
    });
  }
});

// @route   GET /api/tickets/qr/:qrCode
// @desc    Look up ticket by QR code content
// @access  Private (Admin/Organizer)
router.get('/qr/:qrCode', authenticate, async (req, res) => {
  try {
    const { qrCode } = req.params;

    // Attempt to parse the QR Code content if it's JSON (the frontend eventx-rn might use different formats)
    // If it's a direct ticket ID string or JSON like { ticketId: 'xxx' }
    let ticketId = qrCode;
    try {
      const parsed = JSON.parse(qrCode);
      if (parsed.ticketId) ticketId = parsed.ticketId;
    } catch (e) { /* ignore JSON parse error */ }

    // Find ticket by ID or unique identifier if that exists
    const ticket = await Ticket.findById(ticketId).populate('event user', 'title name email');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found from QR' });
    }

    // Role check: admin, or organizer of the specific event
    const isAdmin = req.user.role === 'admin';
    const isOrganizer = ticket.event.organizer && ticket.event.organizer.toString() === req.user._id.toString();
    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Not authorized to scan tickets for this event' });
    }

    res.json({ success: true, data: { ticket } });
  } catch (error) {
    logger.error('QR Lookup error:', error);
    res.status(500).json({ success: false, message: 'Server error looking up QR code' });
  }
});

// @route   PUT /api/tickets/:id/refund
// @desc    Refund a ticket (changes status and triggers external refund logic in a real app)
// @access  Private
router.put('/:id/refund', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('event');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Must be admin or the ticket owner
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to refund this ticket' });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return res.status(400).json({ success: false, message: `Ticket is already ${ticket.status}` });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({ success: false, message: 'Cannot refund a used ticket' });
    }

    // In a real app, integrate Stripe/PayPal refund here
    // ...

    ticket.status = 'refunded';
    await ticket.save();

    // Free up seat
    const event = await Event.findById(ticket.event._id);
    event.cancelSeat(ticket.seatNumber);
    await event.save();

    // Notify user
    await Notification.create({
      user: ticket.user,
      type: 'ticket_refunded',
      title: 'Ticket Refund Processed',
      message: `Your ticket for "${event.title}" has been successfully refunded.`,
      data: { ticketId: ticket._id, eventId: event._id }
    }).catch(err => logger.error('Notification error (refund): ' + err.message));

    res.json({ success: true, message: 'Ticket refunded successfully', data: { ticket } });
  } catch (error) {
    logger.error('Refund ticket error:', error);
    res.status(500).json({ success: false, message: 'Server error while refunding ticket' });
  }
});

module.exports = router;

