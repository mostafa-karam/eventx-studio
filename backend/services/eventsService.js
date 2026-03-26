const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const Ticket = require('../models/Ticket');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');

class EventsService {
    buildEventQuery(queryParams) {
        const { category, search, city, dateFrom, dateTo, priceMin, priceMax, organizerId } = queryParams;
        let query = { status: 'published' };

        if (organizerId) query.organizer = organizerId;
        if (category) query.category = category;

        if (search) {
            const safeSearch = escapeRegex(search);
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
                { 'venue.name': { $regex: safeSearch, $options: 'i' } },
                { 'venue.city': { $regex: safeSearch, $options: 'i' } }
            ];
        }

        if (city) query['venue.city'] = { $regex: escapeRegex(city), $options: 'i' };

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
        page = parseInt(page);
        limit = Math.min(parseInt(limit), 100);
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
        page = parseInt(page);
        limit = Math.min(parseInt(limit), 100);
        const skip = (page - 1) * limit;

        const query = user.role === 'admin' ? {} : { organizer: user._id };
        if (queryParams.search) {
            const safeSearch = escapeRegex(queryParams.search);
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
                { 'venue.name': { $regex: safeSearch, $options: 'i' } },
                { 'venue.city': { $regex: safeSearch, $options: 'i' } }
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
            const isOwner = user && event.organizer._id.toString() === user._id.toString();
            const isAdmin = user && user.role === 'admin';
            if (!isOwner && !isAdmin) throw Object.assign(new Error('Event not found'), { status: 404 });
        }

        await Event.findByIdAndUpdate(eventId, { $inc: { 'analytics.views': 1 } });
        return event;
    }

    async createEvent(eventData, organizerId) {
        const event = new Event({ ...eventData, organizer: organizerId });
        await event.save();
        return await Event.findById(event._id).populate('organizer', 'name email');
    }

    async cloneEvent(eventId, user) {
        const originalEvent = await Event.findById(eventId);
        if (!originalEvent) throw Object.assign(new Error('Event not found'), { status: 404 });

        if (originalEvent.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
            throw Object.assign(new Error('Not authorized to clone this event'), { status: 403 });
        }

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

        if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
            throw Object.assign(new Error('Not authorized to update this event'), { status: 403 });
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
        const event = await Event.findById(eventId);
        if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

        if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
            throw Object.assign(new Error('Not authorized to delete this event'), { status: 403 });
        }

        await Event.findByIdAndDelete(eventId);
        return true;
    }
}

module.exports = new EventsService();
