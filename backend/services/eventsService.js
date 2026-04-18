const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const Ticket = require('../models/Ticket');

const maxCsvExportRows = () => Number.parseInt(process.env.MAX_CSV_EXPORT_ROWS, 10) || 50000;
const { sanitizeSearchInput, createSafeRegex } = require('../utils/helpers');
const { enforceOwnership } = require('../utils/authorization');
const { withTransactionRetry } = require('../utils/transaction');

class EventsService {
    toPositiveInt(value, fallback) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }
        return parsed;
    }

    buildEventQuery(queryParams) {
        const { category, search, city, dateFrom, dateTo, priceMin, priceMax, organizerId } = queryParams;
        let query = { status: 'published' };

        if (organizerId) query.organizer = organizerId;
        if (category) query.category = category;

        if (search) {
            const searchRegex = createSafeRegex(sanitizeSearchInput(search));
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { 'venue.name': searchRegex },
                { 'venue.city': searchRegex }
            ];
        }

        if (city) query['venue.city'] = createSafeRegex(sanitizeSearchInput(city));

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        if (priceMin || priceMax) {
            query['pricing.amount'] = {};
            if (priceMin) query['pricing.amount'].$gte = parseFloat(priceMin);
            if (priceMax) query['pricing.amount'].$lte = parseFloat(priceMax);
        }

        return query;
    }

    getSortObject(sortParam) {
        let sort = { date: 1 };
        if (sortParam === 'popular') {
            sort = { 'analytics.views': -1, 'analytics.bookings': -1 };
        } else if (sortParam === 'newest') {
            sort = { createdAt: -1 };
        } else if (sortParam === 'price-low') {
            sort = { 'pricing.amount': 1 };
        } else if (sortParam === 'price-high') {
            sort = { 'pricing.amount': -1 };
        }
        return sort;
    }

    async getEvents(queryParams, page = 1, limit = 12) {
        page = this.toPositiveInt(page, 1);
        limit = Math.min(this.toPositiveInt(limit, 12), 100);
        const skip = (page - 1) * limit;

        const query = this.buildEventQuery(queryParams);
        const sort = this.getSortObject(queryParams.sort);

        const events = await Event.find(query)
            .populate('organizer', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-seating.seatMap');

        const total = await Event.countDocuments(query);
        const categories = await Event.distinct('category', { status: 'published' });
        const cities = await Event.distinct('venue.city', { status: 'published' });

        return {
            events,
            pagination: { current: page, pages: Math.ceil(total / limit), total },
            filters: { categories, cities }
        };
    }

    async getMyEvents(user, queryParams, page = 1, limit = 10) {
        page = this.toPositiveInt(page, 1);
        limit = Math.min(this.toPositiveInt(limit, 10), 100);
        const skip = (page - 1) * limit;

        const query = user.role === 'admin' ? {} : { organizer: user._id };
        if (queryParams.search) {
            const searchRegex = createSafeRegex(sanitizeSearchInput(queryParams.search));
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { 'venue.name': searchRegex },
                { 'venue.city': searchRegex }
            ];
        }
        if (queryParams.category) query.category = queryParams.category;
        if (queryParams.dateFrom || queryParams.dateTo) {
            query.date = {};
            if (queryParams.dateFrom) query.date.$gte = new Date(queryParams.dateFrom);
            if (queryParams.dateTo) query.date.$lte = new Date(queryParams.dateTo);
        }

        const events = await Event.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-seating.seatMap');

        const total = await Event.countDocuments(query);

        return { events, pagination: { current: page, pages: Math.ceil(total / limit), total } };
    }

    async getEventById(eventId, user) {
        const event = await Event.findById(eventId).populate('organizer', 'name email phone');
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

        if (event.status !== 'published') {
            try {
                enforceOwnership(event, user, 'organizer', 'view unpublished');
            } catch (authErr) {
                throw Object.assign(new Error('Event not found'), { status: 404 });
            }
        }

        await Event.findByIdAndUpdate(eventId, { $inc: { 'analytics.views': 1 } });
        
        const eventObj = event.toObject();
        // Use the atomically maintained analytics counter for display
        eventObj.ticketCount = event.analytics?.bookings || 0;
        
        return eventObj;
    }

    async createEvent(eventData, organizerId) {
        const event = new Event({ ...eventData, organizer: organizerId });
        await event.save();
        return await Event.findById(event._id).populate('organizer', 'name email');
    }

    async cloneEvent(eventId, user) {
        const originalEvent = await Event.findById(eventId);
        if (!originalEvent) throw Object.assign(new Error('Event not found'), { status: 404 });

        enforceOwnership(originalEvent, user, 'organizer', 'clone');

        const eventData = originalEvent.toObject();
        delete eventData._id;
        delete eventData.createdAt;
        delete eventData.updatedAt;
        delete eventData.__v;

        eventData.title = `${originalEvent.title} (Copy)`;
        eventData.status = 'draft';
        // Auto-fix date to bypass validation: Push forward 30 days securely
        if (eventData.date) {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);
            eventData.date = nextMonth;
        }
        if (eventData.endDate) {
            const nextMonthEnd = new Date(eventData.date);
            nextMonthEnd.setHours(nextMonthEnd.getHours() + 4);
            eventData.endDate = nextMonthEnd;
        }
        
        eventData.analytics = { views: 0, bookings: 0 };
        if (eventData.seating) {
            eventData.seating.availableSeats = eventData.seating.totalSeats;
            eventData.seating.seatMap = [];
        }

        const newEvent = new Event(eventData);
        await newEvent.save();
        return await Event.findById(newEvent._id).populate('organizer', 'name email');
    }

    async updateEvent(eventId, updateData, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

        enforceOwnership(event, user, 'organizer', 'update');

        // Check for critical changes in published events with bookings
        if (event.status === 'published') {
            const CRITICAL_FIELDS = ['date', 'venue', 'pricing', 'hall'];
            const hasCriticalUpdate = CRITICAL_FIELDS.some(key => updateData[key] !== undefined);

            if (hasCriticalUpdate) {
                const ticketCount = await Ticket.countDocuments({ event: eventId, status: { $in: ['booked', 'used'] } });
                if (ticketCount > 0) {
                    throw Object.assign(new Error('Cannot update critical event details (date, venue, pricing, hall) once tickets have been booked. Please cancel and create a new event if necessary.'), { status: 400 });
                }
            }
        }

        const ALLOWED_UPDATE_FIELDS = [
            'title', 'description', 'category', 'date', 'endDate', 'venue',
            'pricing', 'seating', 'images', 'status', 'tags', 'requirements',
            'socialMedia', 'hall'
        ];

        ALLOWED_UPDATE_FIELDS.forEach(key => {
            if (updateData[key] !== undefined && key !== 'organizer') {
                event[key] = updateData[key];
            }
        });

        await event.save();
        return await Event.findById(event._id).populate('organizer', 'name email');
    }

    async deleteEvent(eventId, user) {
        const event = await Event.findById(eventId).select('organizer');
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        enforceOwnership(event, user, 'organizer', 'delete');

        await withTransactionRetry(async (session) => {
            const Notification = require('../models/Notification');
            const HallBooking = require('../models/HallBooking');
            const eventInSessionQuery = Event.findById(eventId);
            if (session) eventInSessionQuery.session(session);
            const eventInSession = await eventInSessionQuery;
            if (!eventInSession) {
                throw Object.assign(new Error('Event not found'), { status: 404 });
            }

            await Promise.all([
                Ticket.deleteMany({ event: eventId }, session ? { session } : undefined),
                Waitlist.deleteMany({ event: eventId }, session ? { session } : undefined),
                HallBooking.deleteMany({ event: eventId }, session ? { session } : undefined),
                Notification.deleteMany({ 'metadata.eventId': String(eventId) }, session ? { session } : undefined),
                Event.deleteOne({ _id: eventId }, session ? { session } : undefined),
            ]);
        }, { allowFallback: process.env.NODE_ENV === 'test' });
        return true;
    }

    // FIX H-02 — Strip bookedBy to prevent data leak for non-organizers
    async getSeats(eventId, user) {
        const event = await Event.findById(eventId).select('seating title date venue.name organizer status');
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

        const isAuthorized = user && (user.role === 'admin' || event.organizer.toString() === user._id.toString());
        if (event.status !== 'published' && !isAuthorized) {
            throw Object.assign(new Error('Event not found'), { status: 404 });
        }
        const eventData = event.toObject();

        if (!isAuthorized && eventData.seating && eventData.seating.seatMap) {
            eventData.seating.seatMap = eventData.seating.seatMap.map(seat => {
                if (seat.bookedBy) {
                    delete seat.bookedBy;
                }
                return seat;
            });
        }

        return eventData;
    }

    async joinWaitlist(eventId, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        if (event.status !== 'published') throw Object.assign(new Error('Event is not active'), { status: 400 });
        if (event.seating && event.seating.availableSeats > 0) throw Object.assign(new Error('Tickets are still available for this event'), { status: 400 });

        const Waitlist = require('../models/Waitlist');
        const waitlistEntry = new Waitlist({ event: event._id, user: user._id, status: 'pending' });
        await waitlistEntry.save();
        return waitlistEntry;
    }

    async getWaitlist(eventId, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        enforceOwnership(event, user, 'organizer', 'view waitlist');

        const Waitlist = require('../models/Waitlist');
        return await Waitlist.find({ event: event._id })
            .populate('user', 'name email phone')
            .sort({ createdAt: 1 });
    }

    async approveWaitlist(eventId, waitlistId, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        enforceOwnership(event, user, 'organizer', 'approve waitlist');

        const Waitlist = require('../models/Waitlist');
        const waitlistEntry = await Waitlist.findOne({ _id: waitlistId, event: event._id });
        if (!waitlistEntry) throw Object.assign(new Error('Waitlist entry not found'), { status: 404 });
        if (waitlistEntry.status !== 'pending') throw Object.assign(new Error(`Cannot approve entry in ${waitlistEntry.status} status`), { status: 400 });

        waitlistEntry.status = 'notified';
        waitlistEntry.notifiedAt = new Date();
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        waitlistEntry.expiresAt = expires;
        await waitlistEntry.save();

        return waitlistEntry;
    }

    /**
     * Validates export permission and row cap; returns counts for streaming CSV in the controller.
     */
    async exportAttendees(eventId, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        enforceOwnership(event, user, 'organizer', 'export attendees');

        const total = await Ticket.countDocuments({
            event: event._id,
            status: { $in: ['booked', 'used'] },
        });
        const maxRows = maxCsvExportRows();
        if (total > maxRows) {
            throw Object.assign(
                new Error(`Export exceeds maximum of ${maxRows} rows`),
                { status: 413 },
            );
        }
        return { event, total };
    }

    /** Batched ticket fetch for CSV streaming (bounded memory). */
    async getAttendeesExportBatch(eventId, skip, limit) {
        return Ticket.find({
            event: eventId,
            status: { $in: ['booked', 'used'] },
        })
            .populate('user', 'name email phone')
            .sort({ bookingDate: 1 })
            .skip(skip)
            .limit(limit);
    }

    async publishEvent(eventId, user) {
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
        enforceOwnership(event, user, 'organizer', 'publish');

        if (event.status === 'published') {
            throw Object.assign(new Error('Event is already published'), { status: 400 });
        }
        event.status = 'published';
        await event.save();
        return event;
    }

    async getMyWaitlists(user, { page = 1, limit = 20 } = {}) {
        page = this.toPositiveInt(page, 1);
        limit = Math.min(this.toPositiveInt(limit, 20), 100);
        const skip = (page - 1) * limit;
        const Waitlist = require('../models/Waitlist');
        const query = { user: user._id };
        const [waitlists, total] = await Promise.all([
            Waitlist.find(query)
                .populate('event', 'title date venue images category pricing')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Waitlist.countDocuments(query)
        ]);
        return {
            waitlists,
            pagination: { current: page, pages: Math.max(1, Math.ceil(total / limit)), total, limit }
        };
    }
}

module.exports = new EventsService();
