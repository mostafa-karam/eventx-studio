const logger = require('../utils/logger');
const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const Ticket = require('../models/Ticket');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all events (public with optional auth)
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const result = await eventsService.getEvents(req.query, req.query.page, req.query.limit);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching events' });
    }
};

// @desc    Get events created by current organizer/admin
// @access  Private/Organizer
exports.getMyEvents = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const result = await eventsService.getMyEvents(req.user._id, req.query, req.query.page, req.query.limit);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get my events error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching events' });
    }
};

// @desc    Get single event by ID
// @access  Public
exports.getEventById = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const event = await eventsService.getEventById(req.params.id, req.user);
        res.json({ success: true, data: { event } });
    } catch (error) {
        logger.error('Get event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Event not found' });
        res.status(500).json({ success: false, message: 'Server error while fetching event' });
    }
};

// @desc    Create new event
// @access  Private/Organizer
exports.createEvent = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const event = await eventsService.createEvent(req.body, req.user._id);
        res.status(201).json({ success: true, message: 'Event created successfully', data: { event } });
    } catch (error) {
        logger.error('Create event error:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors });
        }
        res.status(500).json({ success: false, message: 'Server error while creating event' });
    }
};

// @desc    Clone an existing event
// @access  Private/Organizer
exports.cloneEvent = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const event = await eventsService.cloneEvent(req.params.id, req.user);
        res.status(201).json({ success: true, message: 'Event cloned successfully', data: { event } });
    } catch (error) {
        logger.error('Clone event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while cloning event' });
    }
};

// @desc    Update event
// @access  Private/Organizer
exports.updateEvent = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        const event = await eventsService.updateEvent(req.params.id, req.body, req.user);
        res.json({ success: true, message: 'Event updated successfully', data: { event } });
    } catch (error) {
        logger.error('Update event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Event not found' });
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors });
        }
        res.status(500).json({ success: false, message: 'Server error while updating event' });
    }
};

// @desc    Delete event
// @access  Private/Organizer
exports.deleteEvent = async (req, res) => {
    try {
        const eventsService = require('../services/eventsService');
        await eventsService.deleteEvent(req.params.id, req.user);
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        logger.error('Delete event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Event not found' });
        res.status(500).json({ success: false, message: 'Server error while deleting event' });
    }
};

// @desc    Get available seats for an event
// @access  Public
exports.getSeats = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).select('seating title date venue.name');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

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
        logger.error('Get seats error:', error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Event not found' });
        res.status(500).json({ success: false, message: 'Server error while fetching seats' });
    }
};

// @desc    Join the waitlist for a sold-out event
// @access  Private
exports.joinWaitlist = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.status !== 'published') return res.status(400).json({ success: false, message: 'Event is not active' });
        if (event.seating && event.seating.availableSeats > 0) return res.status(400).json({ success: false, message: 'Tickets are still available for this event' });

        const waitlistEntry = new Waitlist({ event: event._id, user: req.user._id, status: 'pending' });
        await waitlistEntry.save();

        res.status(201).json({ success: true, message: 'Successfully joined the waitlist', data: { waitlist: waitlistEntry } });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'You are already on the waitlist for this event' });
        logger.error('Join waitlist error:', error);
        res.status(500).json({ success: false, message: 'Server error while joining waitlist' });
    }
};

// @desc    Get waitlist for an event
// @access  Private (Admin/Organizer)
exports.getWaitlist = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view waitlist' });
        }

        const waitlist = await Waitlist.find({ event: event._id })
            .populate('user', 'name email phone')
            .sort({ createdAt: 1 });

        res.json({ success: true, data: { waitlist } });
    } catch (error) {
        logger.error('Get waitlist error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching waitlist' });
    }
};

// @desc    Approve a waitlist entry
// @access  Private (Admin/Organizer)
exports.approveWaitlist = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to approve waitlist' });
        }

        const waitlistEntry = await Waitlist.findOne({ _id: req.params.waitlistId, event: event._id });
        if (!waitlistEntry) return res.status(404).json({ success: false, message: 'Waitlist entry not found' });
        if (waitlistEntry.status !== 'pending') return res.status(400).json({ success: false, message: `Cannot approve entry in ${waitlistEntry.status} status` });

        waitlistEntry.status = 'notified';
        waitlistEntry.notifiedAt = new Date();
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        waitlistEntry.expiresAt = expires;

        await waitlistEntry.save();

        res.json({ success: true, message: 'Waitlist entry approved. User has 24 hours to purchase.', data: { waitlist: waitlistEntry } });
    } catch (error) {
        logger.error('Approve waitlist error:', error);
        res.status(500).json({ success: false, message: 'Server error while approving waitlist' });
    }
};

// Helper to escape CSV fields
function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    const strVal = String(str);
    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`;
    }
    return strVal;
}

// @desc    Export attendees list as CSV
// @access  Private (Admin/Organizer)
exports.exportAttendees = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to export attendees' });
        }

        const tickets = await Ticket.find({
            event: event._id,
            status: { $in: ['booked', 'used'] }
        }).populate('user', 'name email phone').sort({ bookingDate: 1 });

        let csvData = 'Ticket ID,Name,Email,Phone,Seat Number,Booking Date,Status,Payment Amount\n';

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
        logger.error('Export attendees error:', error);
        res.status(500).json({ success: false, message: 'Server error while exporting attendees' });
    }
};

// @desc    Publish a draft event
// @access  Private (organizer, admin)
exports.publishEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const isOwner = event.organizer.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to publish this event' });
        }

        if (event.status === 'published') {
            return res.status(400).json({ success: false, message: 'Event is already published' });
        }

        event.status = 'published';
        await event.save();

        res.json({ success: true, message: 'Event published successfully', data: { event } });
    } catch (error) {
        logger.error('Publish event error:', error);
        res.status(500).json({ success: false, message: 'Server error while publishing event' });
    }
};

// @desc    Get user's waitlist entries
// @access  Private
exports.getMyWaitlists = async (req, res) => {
    try {
        const waitlists = await Waitlist.find({ user: req.user._id })
            .populate('event', 'title date venue images category pricing')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: { waitlists } });
    } catch (error) {
        logger.error('Get my waitlists error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching waitlists' });
    }
};
