const logger = require('../utils/logger');
const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const Ticket = require('../models/Ticket');
const { escapeRegex } = require('../utils/helpers');
const auditService = require('../services/auditService');
const eventsService = require('../services/eventsService');
const eventLifecycleService = require('../services/eventLifecycleService');
const { enforceOwnership } = require('../utils/authorization');

const isPlainObject = (value) =>
    Object.prototype.toString.call(value) === '[object Object]';

const stripEmptyObjects = (value) => {
    if (Array.isArray(value)) {
        return value.map(stripEmptyObjects);
    }

    if (!isPlainObject(value)) {
        return value;
    }

    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
        const cleanedValue = stripEmptyObjects(nestedValue);
        if (!(isPlainObject(cleanedValue) && Object.keys(cleanedValue).length === 0)) {
            accumulator[key] = cleanedValue;
        }
        return accumulator;
    }, {});
};

// @desc    Get all events (public with optional auth)
// @access  Public
exports.getEvents = async (req, res) => {
    try {
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
        const result = await eventsService.getMyEvents(req.user, req.query, req.query.page, req.query.limit);
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
        const payload = stripEmptyObjects(req.body);
        const event = await eventsService.createEvent(payload, req.user._id);
        await auditService.log({ req, actor: req.user, action: 'event.create', resource: 'Event', resourceId: event._id, details: { title: event.title } });
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
        const event = await eventsService.cloneEvent(req.params.id, req.user);
        await auditService.log({ req, actor: req.user, action: 'event.create', resource: 'Event', resourceId: event._id, details: { title: event.title, clonedFrom: req.params.id } });
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
        const payload = stripEmptyObjects(req.body);
        const event = await eventsService.updateEvent(req.params.id, payload, req.user);
        await auditService.log({ req, actor: req.user, action: 'event.update', resource: 'Event', resourceId: event._id, details: { updatedFields: Object.keys(payload) } });
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
        await eventsService.deleteEvent(req.params.id, req.user);
        await auditService.log({ req, actor: req.user, action: 'event.delete', resource: 'Event', resourceId: req.params.id });
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        logger.error('Delete event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Event not found' });
        res.status(500).json({ success: false, message: 'Server error while deleting event' });
    }
};

// @desc    Get available seats for an event
// @access  Public (Optional Auth)
exports.getSeats = async (req, res) => {
    try {
        // FIX H-02 — Pass req.user to allow checking permissions
        const event = await eventsService.getSeats(req.params.id, req.user);
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
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while fetching seats' });
    }
};

// @desc    Join the waitlist for a sold-out event
// @access  Private
exports.joinWaitlist = async (req, res) => {
    try {
        const waitlistEntry = await eventsService.joinWaitlist(req.params.id, req.user);
        res.status(201).json({ success: true, message: 'Successfully joined the waitlist', data: { waitlist: waitlistEntry } });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'You are already on the waitlist for this event' });
        logger.error('Join waitlist error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while joining waitlist' });
    }
};

// @desc    Get waitlist for an event
// @access  Private (Admin/Organizer)
exports.getWaitlist = async (req, res) => {
    try {
        const waitlist = await eventsService.getWaitlist(req.params.id, req.user);
        res.json({ success: true, data: { waitlist } });
    } catch (error) {
        logger.error('Get waitlist error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while fetching waitlist' });
    }
};

// @desc    Approve a waitlist entry
// @access  Private (Admin/Organizer)
exports.approveWaitlist = async (req, res) => {
    try {
        const waitlistEntry = await eventsService.approveWaitlist(req.params.id, req.params.waitlistId, req.user);
        res.json({ success: true, message: 'Waitlist entry approved. User has 24 hours to purchase.', data: { waitlist: waitlistEntry } });
    } catch (error) {
        logger.error('Approve waitlist error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while approving waitlist' });
    }
};

// Helper to escape CSV fields
function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    const strVal = String(str);
    
    // FIX M-02 — Prevent CSV Injection by escaping formula prefixes
    if (/^[=+\-@]/.test(strVal)) {
        return `"'${strVal.replace(/"/g, '""')}"`;
    }

    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`;
    }
    return strVal;
}

// @desc    Export attendees list as CSV
// @access  Private (Admin/Organizer)
exports.exportAttendees = async (req, res) => {
    try {
        const { event, tickets } = await eventsService.exportAttendees(req.params.id, req.user);

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
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while exporting attendees' });
    }
};

// @desc    Publish a draft event
// @access  Private (organizer, admin)
exports.publishEvent = async (req, res) => {
    try {
        const event = await eventsService.publishEvent(req.params.id, req.user);
        await auditService.log({ req, actor: req.user, action: 'event.publish', resource: 'Event', resourceId: event._id, details: { status: event.status } });
        res.json({ success: true, message: 'Event published successfully', data: { event } });
    } catch (error) {
        logger.error('Publish event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while publishing event' });
    }
};

// @desc    Get user's waitlist entries
// @access  Private
exports.getMyWaitlists = async (req, res) => {
    try {
        const waitlists = await eventsService.getMyWaitlists(req.user);
        res.json({ success: true, data: { waitlists } });
    } catch (error) {
        logger.error('Get my waitlists error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching waitlists' });
    }
};
// @desc    Cancel an event
// @access  Private (organizer, admin)
exports.cancelEvent = async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await eventLifecycleService.cancelEvent(req.params.id, req.user, reason);
        await auditService.log({
            req,
            actor: req.user,
            action: 'event.cancel',
            resource: 'Event',
            resourceId: req.params.id,
            details: { reason },
        });
        
        res.json({ 
            success: true, 
            message: 'Event cancelled successfully. Attendees have been notified.', 
            data: result 
        });
    } catch (error) {
        logger.error('Cancel event error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while cancelling event' });
    }
};
