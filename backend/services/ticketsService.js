/**
 * Tickets Service
 *
 * Encapsulates all ticket-related database operations.
 * Controllers should delegate to this service instead of
 * querying Mongoose models directly.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Coupon = require('../models/Coupon');
const config = require('../config');
const logger = require('../utils/logger');

const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  color: { dark: '#000000', light: '#FFFFFF' },
};

class TicketsService {
  /**
   * Calculate the expected payment amount after applying a coupon.
   */
  async calculateExpectedAmount(event, couponCode) {
    let amount = Number(event.pricing?.amount || 0);
    if (!couponCode) return amount;

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
    if (!coupon) {
      throw Object.assign(new Error('Coupon is invalid or expired'), { status: 400 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw Object.assign(new Error('Coupon has expired'), { status: 400 });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw Object.assign(new Error('Coupon usage limit reached'), { status: 400 });
    }

    if (coupon.applicableEvents && coupon.applicableEvents.length > 0) {
      const matchesEvent = coupon.applicableEvents.some((id) => id.toString() === event._id.toString());
      if (!matchesEvent) {
        throw Object.assign(new Error('Coupon is not applicable to this event'), { status: 400 });
      }
    }

    const discount = coupon.discountType === 'percentage'
      ? Math.min(amount, amount * (coupon.discountValue / 100))
      : Math.min(amount, coupon.discountValue || 0);

    return Math.max(0, amount - discount);
  }

  /**
   * Generate a QR code data-URL for a ticket.
   */
  async generateQRCode(qrCodeData) {
    return QRCode.toDataURL(qrCodeData, QR_OPTIONS);
  }

  /**
   * Find and validate an event for booking.
   */
  async findBookableEvent(eventId) {
    const event = await Event.findById(eventId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
    if (event.status !== 'published') throw Object.assign(new Error('Event is not available for booking'), { status: 400 });
    if (event.date < new Date()) throw Object.assign(new Error('Cannot book tickets for past events'), { status: 400 });
    return event;
  }

  /**
   * Check if a user already has a ticket for an event.
   */
  async hasExistingTicket(eventId, userId) {
    return Ticket.findOne({
      event: eventId,
      user: userId,
      status: { $in: ['booked', 'used'] },
    });
  }

  /**
   * Get paginated tickets for a user.
   */
  async getMyTickets(userId, { page = 1, limit = 10, status } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 10, 100);
    const skip = (page - 1) * limit;

    const query = { user: userId };
    if (status) query.status = status;

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('event', 'title date venue pricing status')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
    };
  }

  /**
   * Get tickets for events owned by an organizer.
   */
  async getOrganizerTickets(organizerId, { page = 1, limit = 50, eventId, status } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 50, 200);
    const skip = (page - 1) * limit;

    const events = await Event.find({ organizer: organizerId }).select('_id');
    const eventIds = events.map(e => e._id);

    const query = { event: { $in: eventIds } };
    if (eventId) {
      if (!eventIds.some(id => id.toString() === eventId)) {
        throw Object.assign(new Error('Not authorized to view tickets for this event'), { status: 403 });
      }
      query.event = eventId;
    }
    if (status) query.status = status;

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('event', 'title date venue')
        .populate('user', 'name email')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: { current: page, pages: Math.max(1, Math.ceil(total / limit)), total },
    };
  }

  /**
   * Get all tickets with statistics (admin view).
   */
  async getTicketsAdmin({ page = 1, limit = 50, eventId, status } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 50, 200);
    const skip = (page - 1) * limit;

    const query = {};
    if (eventId) query.event = eventId;
    if (status) query.status = status;

    const [tickets, total, statusCounts, orphanCount, globalTotal] = await Promise.all([
      Ticket.find(query)
        .populate('event', 'title date venue')
        .populate('user', 'name email')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(query),
      Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.countDocuments({ $or: [{ event: { $exists: false } }, { event: null }] }),
      Ticket.countDocuments({}),
    ]);

    const statusCountsObj = {};
    statusCounts.forEach(item => { statusCountsObj[item._id] = item.count; });

    return {
      tickets,
      statistics: { total: globalTotal, statusCounts: statusCountsObj, orphanCount },
      pagination: { current: page, pages: Math.max(1, Math.ceil(total / limit)), total },
    };
  }

  /**
   * Get orphan tickets (missing or null event reference).
   */
  async getOrphanTickets({ page = 1, limit = 50 } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 50, 200);
    const skip = (page - 1) * limit;

    const orphanMatcher = { $or: [{ event: { $exists: false } }, { event: null }] };

    const [tickets, total] = await Promise.all([
      Ticket.find(orphanMatcher)
        .populate('user', 'name email')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(orphanMatcher),
    ]);

    return {
      tickets,
      pagination: { current: page, pages: Math.max(1, Math.ceil(total / limit)), total },
    };
  }

  /**
   * Assign an orphan ticket to an event.
   */
  async assignOrphanTicket(ticketId, eventId) {
    if (!eventId) throw Object.assign(new Error('eventId is required'), { status: 400 });

    const event = await Event.findById(eventId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

    ticket.event = event._id;
    await ticket.save();

    return Ticket.findById(ticket._id)
      .populate('event', 'title date venue')
      .populate('user', 'name email');
  }

  /**
   * Cancel an orphan ticket.
   */
  async cancelOrphanTicket(ticketId) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

    ticket.status = 'cancelled';
    await ticket.save();
    return ticket;
  }

  /**
   * Get a single ticket by ID with authorization check.
   */
  async getTicketById(ticketId, user) {
    const ticket = await Ticket.findById(ticketId)
      .populate('event', 'title date venue pricing organizer')
      .populate('user', 'name email');

    if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

    if (ticket.user._id.toString() !== user._id.toString() && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to view this ticket'), { status: 403 });
    }

    const qrCodeImage = await this.generateQRCode(ticket.qrCode);
    return { ticket, qrCodeImage };
  }

  /**
   * Get all tickets for an event with statistics.
   */
  async getEventTickets(eventId, { page = 1, limit = 50 } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [tickets, total, stats] = await Promise.all([
      Ticket.find({ event: eventId })
        .populate('user', 'name email phone')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments({ event: eventId }),
      Ticket.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
          },
        },
      ]),
    ]);

    return {
      tickets,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
      statistics: stats,
    };
  }

  /**
   * Check in a ticket (admin / organizer).
   */
  async checkinTicket(ticketId, user) {
    const ticket = await Ticket.findById(ticketId)
      .populate('event', 'title date organizer')
      .populate('user', 'name email');

    if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

    if (user.role !== 'admin' && (!ticket.event.organizer || ticket.event.organizer.toString() !== user._id.toString())) {
      throw Object.assign(new Error('Not authorized to check in tickets for this event'), { status: 403 });
    }

    ticket.performCheckIn(user._id);
    await ticket.save();
    return ticket;
  }

  /**
   * Look up a ticket by QR code and perform check-in.
   */
  async checkinByQR(qrCode, eventId, user) {
    if (!qrCode) throw Object.assign(new Error('QR code is required'), { status: 400 });

    let parsed;
    try {
      parsed = JSON.parse(qrCode);
    } catch (_e) {
      // Fail closed: we do not accept unsigned/raw ticket IDs.
      throw Object.assign(new Error('Invalid or tampered QR code'), { status: 400 });
    }

    // Require a signed JSON QR payload.
    if (!parsed || typeof parsed !== 'object') {
      throw Object.assign(new Error('Invalid or tampered QR code'), { status: 400 });
    }

    const { sig, ...qrData } = parsed;
    const ticketIdValue = qrData?.ticketId;
    if (!ticketIdValue || !sig) {
      throw Object.assign(new Error('Invalid or tampered QR code'), { status: 400 });
    }

    // Always validate signature.
    const expectedSig = crypto
      .createHmac('sha256', config.secrets.qrHmac)
      .update(JSON.stringify(qrData))
      .digest('hex');
    if (sig !== expectedSig) {
      throw Object.assign(new Error('Invalid or tampered QR code'), { status: 400 });
    }

    const ticket = await Ticket.findOne({ ticketId: ticketIdValue })
      .populate('event user', 'title name email organizer');
    if (!ticket) throw Object.assign(new Error('Ticket not found from QR'), { status: 404 });

    if (eventId && ticket.event && ticket.event._id.toString() !== eventId) {
      throw Object.assign(new Error('Ticket does not belong to the selected event'), { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const isOrganizer = ticket.event.organizer && ticket.event.organizer.toString() === user._id.toString();
    if (!isAdmin && !isOrganizer) {
      throw Object.assign(new Error('Not authorized to scan tickets for this event'), { status: 403 });
    }

    ticket.performCheckIn(user._id);
    await ticket.save();
    return ticket;
  }

  /**
   * Refund a ticket.
   */
  async refundTicket(ticketId, user) {
    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      // Refunds must be atomic to avoid capacity corruption.
      throw Object.assign(new Error('Refunds require database transactions to be enabled'), { status: 500 });
    }

    try {
      const ticket = await Ticket.findById(ticketId).populate('event').session(session);
      if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

      if (ticket.user.toString() !== user._id.toString() && user.role !== 'admin') {
        throw Object.assign(new Error('Not authorized to refund this ticket'), { status: 403 });
      }

      if (ticket.status === 'cancelled') throw Object.assign(new Error('Ticket is already cancelled'), { status: 400 });
      if (ticket.status === 'used') throw Object.assign(new Error('Cannot refund a used ticket'), { status: 400 });

      // Update ticket first inside the transaction.
      ticket.status = 'cancelled';
      if (ticket.payment) {
        ticket.payment.status = 'refunded';
      }
      await ticket.save({ session });

      const eventId = ticket.event?._id || ticket.event;
      const seatNumber = ticket.seatNumber;
      const isGA = typeof seatNumber === 'string' && seatNumber.startsWith('GA-');

      // Release capacity atomically; GA tickets do NOT map to seatMap entries.
      if (isGA) {
        await Event.updateOne(
          { _id: eventId },
          {
            $inc: {
              'seating.availableSeats': 1,
              'analytics.bookings': -1,
              'analytics.revenue': -(ticket.payment?.amount || 0),
            },
          },
          { session }
        );
      } else {
        await Event.updateOne(
          { _id: eventId, 'seating.seatMap.seatNumber': seatNumber },
          {
            $set: { 'seating.seatMap.$.isBooked': false, 'seating.seatMap.$.bookedBy': null },
            $inc: {
              'seating.availableSeats': 1,
              'analytics.bookings': -1,
              'analytics.revenue': -(ticket.payment?.amount || 0),
            },
          },
          { session }
        );
      }

      await session.commitTransaction();

      const event = await Event.findById(eventId);
      return { ticket, event };
    } catch (e) {
      await session.abortTransaction().catch(() => {});
      throw e;
    } finally {
      session.endSession();
    }
  }

  /**
   * Prepare seat map and select seats for multi-booking.
   */
  async prepareSeatsForBooking(event, eventId, qty, requestedSeatNumbers) {
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

    const seatsChosen = [];
    const seatMap = event.seating.seatMap;
    const requested = Array.isArray(requestedSeatNumbers) ? requestedSeatNumbers : [];
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
      throw Object.assign(new Error('Not enough seats available'), { status: 400 });
    }

    return seatsChosen;
  }

  /**
   * Atomically book multiple seats and create tickets.
   */
  async bookMultiSeats({ eventId, event, seatsChosen, userId, expectedAmount, paymentMethod, transactionId, couponCode, metadata }) {
    const totalRevenue = event.pricing.type === 'paid' ? (expectedAmount * seatsChosen.length) : 0;

    const useSession = process.env.ENABLE_TRANSACTIONS === 'true';
    let session = null;
    if (useSession) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw Object.assign(new Error('Database transactions are required but unavailable'), { status: 500 });
        }
        logger.warn('Unable to start transaction for multi-book; falling back to non-transactional flow:', err.message);
        session = null;
      }
    }

    const sessionOptions = session ? { session } : {};

    try {
      const updateResult = await Event.updateOne(
        {
          _id: eventId,
          'seating.seatMap': {
            $not: { $elemMatch: { seatNumber: { $in: seatsChosen }, isBooked: true } },
          },
        },
        {
          $set: {
            'seating.seatMap.$[elem].isBooked': true,
            'seating.seatMap.$[elem].bookedBy': userId,
          },
          $inc: {
            'seating.availableSeats': -seatsChosen.length,
            'analytics.bookings': seatsChosen.length,
            'analytics.revenue': totalRevenue,
          },
        },
        { arrayFilters: [{ 'elem.seatNumber': { $in: seatsChosen } }], ...sessionOptions }
      );

      if (updateResult.modifiedCount === 0) {
        throw Object.assign(new Error('One or more selected seats were already booked. Please refresh and try again.'), { status: 400 });
      }

      const ticketsToInsert = seatsChosen.map(seatNumber => ({
        event: eventId,
        user: userId,
        seatNumber,
        payment: {
          amount: expectedAmount,
          currency: event.pricing.currency,
          paymentMethod,
          transactionId: transactionId || undefined,
          status: event.pricing.type === 'free' || transactionId ? 'completed' : 'pending',
          paymentDate: event.pricing.type === 'free' || transactionId ? new Date() : null,
        },
        metadata: {
          ...metadata,
          bulkBooking: true,
          couponCode: couponCode || undefined,
        },
      }));

      const createdTickets = await Ticket.insertMany(ticketsToInsert, session ? { session } : undefined);

      if (session) {
        await session.commitTransaction();
      }

      const query = Ticket.find({ _id: { $in: createdTickets.map(t => t._id) } })
        .populate('event', 'title date venue pricing')
        .populate('user', 'name email');
      if (session) query.session(session);

      // Execute while session is still alive; returning a lazy Query would
      // run after finally() ends the session and can trigger driver errors.
      const populatedTickets = await query.exec();
      return populatedTickets;
    } catch (e) {
      if (session) {
        await session.abortTransaction().catch(() => {});
      }
      throw e;
    } finally {
      if (session) session.endSession();
    }
  }
}

module.exports = new TicketsService();
