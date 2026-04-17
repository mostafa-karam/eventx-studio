const Event = require('../models/Event');
const Hall = require('../models/Hall');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/helpers');

const parsePositiveInt = (value, fallback, max = 100) => {
    if (value === undefined) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return Math.min(parsed, max);
};

const parseOptionalDate = (value) => {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

// @desc    Get published events with filters
// @access  Public
exports.getPublicEvents = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 12);
        if (!page || !limit) {
            return res.status(400).json({ success: false, message: 'page and limit must be positive integers' });
        }
        const skip = (page - 1) * limit;

        const filter = { status: 'published', date: { $gte: new Date() } };

        if (req.query.category) filter.category = req.query.category;
        if (req.query.city) filter['venue.city'] = { $regex: escapeRegex(req.query.city), $options: 'i' };
        if (req.query.pricing) filter['pricing.type'] = req.query.pricing; // 'free' | 'paid'
        if (req.query.search) {
            const safeSearch = escapeRegex(req.query.search);
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
                { tags: { $in: [new RegExp(safeSearch, 'i')] } },
            ];
        }
        const dateFrom = parseOptionalDate(req.query.dateFrom);
        const dateTo = parseOptionalDate(req.query.dateTo);
        if (dateFrom === null || dateTo === null) {
            return res.status(400).json({ success: false, message: 'dateFrom/dateTo must be valid ISO dates' });
        }
        if (dateFrom) filter.date.$gte = dateFrom;
        if (dateTo) filter.date.$lte = dateTo;

        const [events, total] = await Promise.all([
            Event.find(filter)
                .select('title description category date endDate venue pricing seating images tags analytics status')
                .populate('organizer', 'name')
                .sort({ date: 1 })
                .skip(skip)
                .limit(limit),
            Event.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: { events, pagination: { current: page, pages: Math.ceil(total / limit), total } },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single event detail (public)
// @access  Public
exports.getPublicEventById = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, status: 'published' })
            .populate('organizer', 'name')
            .populate('hall', 'name location')
            .select('-seating.seatMap.bookedBy');

        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        // Increment view count
        await Event.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.views': 1 } });

        res.json({ success: true, data: { event } });
    } catch (error) {
        logger.error('Get public event error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get active halls with filters
// @access  Public
exports.getPublicHalls = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 12);
        if (!page || !limit) {
            return res.status(400).json({ success: false, message: 'page and limit must be positive integers' });
        }
        const skip = (page - 1) * limit;

        const filter = { status: 'active' };
        const minCapacity = parsePositiveInt(req.query.minCapacity, undefined, Number.MAX_SAFE_INTEGER);
        const maxCapacity = parsePositiveInt(req.query.maxCapacity, undefined, Number.MAX_SAFE_INTEGER);
        if (minCapacity === null || maxCapacity === null) {
            return res.status(400).json({ success: false, message: 'minCapacity/maxCapacity must be positive integers' });
        }
        if (minCapacity && maxCapacity && minCapacity > maxCapacity) {
            return res.status(400).json({ success: false, message: 'minCapacity cannot be greater than maxCapacity' });
        }
        if (minCapacity) filter.capacity = { $gte: minCapacity };
        if (maxCapacity) filter.capacity = { ...filter.capacity, $lte: maxCapacity };
        if (req.query.equipment) filter.equipment = { $in: [req.query.equipment] };
        if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' };

        const [halls, total] = await Promise.all([
            Hall.find(filter)
                .select('name description capacity equipment hourlyRate dailyRate images location amenities status')
                .sort({ capacity: 1 })
                .skip(skip)
                .limit(limit),
            Hall.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: { halls, pagination: { current: page, pages: Math.ceil(total / limit), total } },
        });
    } catch (error) {
        logger.error('Get public halls error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single hall detail (public)
// @access  Public
exports.getPublicHallById = async (req, res) => {
    try {
        const hall = await Hall.findOne({ _id: req.params.id, status: 'active' });

        if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });

        res.json({ success: true, data: { hall } });
    } catch (error) {
        logger.error('Get public hall error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
