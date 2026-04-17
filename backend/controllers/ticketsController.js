const logger = require('../utils/logger');
const ticketsService = require('../services/ticketsService');
const bookingService = require('../services/bookingService');
const notificationService = require('../services/notificationService');
const Ticket = require('../models/Ticket');

// @route   POST /api/tickets/book
// @desc    Book a ticket for an event
// @access  Private
exports.bookTicket = async (req, res) => {
  try {
    const payload = req.validatedBody || req.body || {};
    const { eventId, seatNumber, paymentMethod = 'free', transactionId, maskedLast4 } = payload;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await ticketsService.findBookableEvent(eventId);

    // Reject paid bookings without verified payment
    if (event.pricing?.type === 'paid' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Paid events require a verified payment. Please use the booking flow.' });
    }

    const existingTicket = await ticketsService.hasExistingTicket(eventId, req.user._id);
    if (existingTicket) {
      return res.status(400).json({ success: false, message: 'You already have a ticket for this event' });
    }

    const couponCode = payload.couponCode || null;
    const expectedAmount = await ticketsService.calculateExpectedAmount(event, couponCode);

    if (event.pricing?.type === 'paid') {
      if (!transactionId) {
        logger.warn(`Booking rejected: missing paymentId for paid event user=${req.user._id} event=${eventId}`);
        return res.status(400).json({ success: false, message: 'paymentId is required for paid events' });
      }
    }

    const { ticket } = await bookingService.bookSeat({
      eventId,
      userId: req.user._id,
      seatNumber,
      payment: { amount: expectedAmount, method: paymentMethod, transactionId },
      couponCode,
      paymentId: transactionId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        source: 'web',
        last4: maskedLast4 ? String(maskedLast4).slice(-4) : undefined,
      },
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('event', 'title date venue pricing')
      .populate('user', 'name email');

    const qrCodeImage = await ticketsService.generateQRCode(ticket.qrCode);

    res.status(201).json({
      success: true,
      message: 'Ticket booked successfully',
      data: { ticket: populatedTicket, qrCodeImage },
    });
  } catch (error) {
    logger.error('Book ticket error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while booking ticket' });
  }
};

// @route   POST /api/tickets/book-multi
// @desc    Book multiple tickets atomically
// @access  Private
exports.bookMultiTickets = async (req, res) => {
  try {
    const payload = req.validatedBody || req.body || {};
    const { eventId, quantity = 1, seatNumbers = [], paymentMethod = 'free', transactionId, couponCode = null } = payload;
    const qty = Math.max(1, Math.min(parseInt(quantity, 10) || 1, 10));

    // Security policy: one active booking per (user,event).
    // Multi-ticket purchases must be modeled as separate attendees/users at a higher level.
    if (qty > 1) {
      return res.status(400).json({
        success: false,
        message: 'Only one active ticket per user is allowed for an event. Please book one ticket per attendee.',
      });
    }

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await ticketsService.findBookableEvent(eventId);
    const expectedAmount = await ticketsService.calculateExpectedAmount(event, couponCode);

    if (event.pricing?.type === 'paid' && !transactionId) {
      logger.warn(`Multi-booking rejected: missing paymentId user=${req.user._id} event=${eventId}`);
      return res.status(400).json({ success: false, message: 'paymentId is required for paid events' });
    }



    const seatsChosen = await ticketsService.prepareSeatsForBooking(event, eventId, qty, seatNumbers);

    const existingTicket = await ticketsService.hasExistingTicket(eventId, req.user._id);
    if (existingTicket) {
      return res.status(400).json({ success: false, message: 'You already have a ticket for this event' });
    }

    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      source: 'web',
    };
    if (payload.maskedLast4) {
      metadata.last4 = String(payload.maskedLast4).slice(-4);
    }

    const populated = await ticketsService.bookMultiSeats({
      eventId, event, seatsChosen, userId: req.user._id,
      expectedAmount, paymentMethod, transactionId, couponCode, metadata, paymentId: transactionId,
    });

    return res.status(201).json({ success: true, message: 'Tickets booked successfully', data: { tickets: populated } });
  } catch (error) {
    logger.error('Book multiple tickets error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: 'Server error while booking tickets' });
  }
};

// @route   GET /api/tickets/my-tickets
// @desc    Get current user's tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const result = await ticketsService.getMyTickets(req.user._id, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get my tickets error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching tickets' });
  }
};

// @route   GET /api/tickets/organizer
// @desc    Get all tickets for events managed by the organizer
// @access  Private/Organizer
exports.getOrganizerTickets = async (req, res) => {
  try {
    const result = await ticketsService.getOrganizerTickets(req.user._id, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Organizer tickets fetch error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while fetching tickets' });
  }
};

// @route   GET /api/tickets/admin
// @desc    Get all tickets (admin view) - paginated
// @access  Private/Admin
exports.getTicketsAdmin = async (req, res) => {
  try {
    const result = await ticketsService.getTicketsAdmin(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Admin tickets fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching tickets' });
  }
};

// Admin: list orphan tickets
exports.getOrphanTickets = async (req, res) => {
  try {
    const result = await ticketsService.getOrphanTickets(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Admin orphans fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching orphan tickets' });
  }
};

// Admin: assign orphan ticket to an event
exports.assignOrphanTicket = async (req, res) => {
  try {
    const ticket = await ticketsService.assignOrphanTicket(req.params.id, req.body?.eventId);
    res.json({ success: true, data: { ticket } });
  } catch (error) {
    logger.error('Assign orphan error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while assigning orphan ticket' });
  }
};

// Admin: cancel orphan ticket
exports.cancelOrphanTicket = async (req, res) => {
  try {
    const ticket = await ticketsService.cancelOrphanTicket(req.params.id);
    res.json({ success: true, message: 'Ticket cancelled', data: { ticket } });
  } catch (error) {
    logger.error('Cancel orphan error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while cancelling orphan ticket' });
  }
};

// @route   GET /api/tickets/:id
// @desc    Get single ticket by ID
// @access  Private
exports.getTicketById = async (req, res) => {
  try {
    const result = await ticketsService.getTicketById(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get ticket error:', error);
    if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while fetching ticket' });
  }
};

// @route   PUT /api/tickets/:id/cancel
// @desc    Cancel a ticket
// @access  Private
exports.cancelTicket = async (req, res) => {
  try {
    const { ticket } = await bookingService.cancelBooking(req.params.id, req.user._id);
    res.json({ success: true, message: 'Ticket cancelled successfully', data: { ticket } });
  } catch (error) {
    logger.error('Cancel ticket error:', error);
    if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Ticket not found' });
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Server error while cancelling ticket' });
  }
};

// @route   POST /api/tickets/:id/checkin
// @desc    Check in a ticket (Admin/Organizer)
// @access  Private/Admin
exports.checkinTicket = async (req, res) => {
  try {
    const ticket = await ticketsService.checkinTicket(req.params.id, req.user);
    res.json({ success: true, message: 'Ticket checked in successfully', data: { ticket } });
  } catch (error) {
    logger.error('Check in ticket error:', error);
    if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while checking in ticket' });
  }
};

// @route   GET /api/tickets/event/:eventId
// @desc    Get all tickets for an event (Admin only)
// @access  Private/Admin
exports.getEventTickets = async (req, res) => {
  try {
    const result = await ticketsService.getEventTickets(req.params.eventId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get event tickets error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching event tickets' });
  }
};

// @route   POST /api/tickets/lookup-qr
// @desc    Look up and check in ticket by QR code content
// @access  Private (Admin/Organizer)
exports.checkinByQR = async (req, res) => {
  try {
    const ticket = await ticketsService.checkinByQR(req.body.qrCode, req.body.eventId, req.user);
    res.json({ success: true, message: 'Ticket checked in successfully', data: { ticket } });
  } catch (error) {
    logger.error('QR Checkin error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error looking up QR code' });
  }
};

// @route   PUT /api/tickets/:id/refund
// @desc    Refund a ticket
// @access  Private
exports.refundTicket = async (req, res) => {
  try {
    const { ticket, event } = await ticketsService.refundTicket(req.params.id, req.user);

    // Notify user via centralized service
    notificationService.notify(ticket.user, {
      title: 'Ticket Refund Processed',
      message: `Your ticket for "${event.title}" has been successfully refunded.`,
      type: 'booking',
      metadata: { ticketId: ticket._id, eventId: event._id },
    });

    res.json({ success: true, message: 'Ticket refunded successfully', data: { ticket } });
  } catch (error) {
    logger.error('Refund ticket error:', error);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error while refunding ticket' });
  }
};
