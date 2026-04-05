const Event = require('../models/Event');
const Hall = require('../models/Hall');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/helpers');

// @desc    Get published events with filters
// @access  Public
exports.getPublicEvents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
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
        if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
        if (req.query.dateTo) filter.date.$lte = new Date(req.query.dateTo);

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
            .populate('hall', 'name location');

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const filter = { status: 'active' };
        if (req.query.minCapacity) filter.capacity = { $gte: parseInt(req.query.minCapacity) };
        if (req.query.maxCapacity) filter.capacity = { ...filter.capacity, $lte: parseInt(req.query.maxCapacity) };
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
