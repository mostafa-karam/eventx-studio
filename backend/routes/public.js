const express = require('express');
const Event = require('../models/Event');
const Hall = require('../models/Hall');

const router = express.Router();

// GET /api/public/events — no auth required, published events with filters
router.get('/events', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const filter = { status: 'published', date: { $gte: new Date() } };

        if (req.query.category) filter.category = req.query.category;
        if (req.query.city) filter['venue.city'] = { $regex: req.query.city, $options: 'i' };
        if (req.query.pricing) filter['pricing.type'] = req.query.pricing; // 'free' | 'paid'
        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { tags: { $in: [new RegExp(req.query.search, 'i')] } },
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
});

// GET /api/public/events/:id — single event detail (public)
router.get('/events/:id', async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, status: 'published' })
            .populate('organizer', 'name')
            .populate('hall', 'name location');

        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        // Increment view count
        await Event.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.views': 1 } });

        res.json({ success: true, data: { event } });
    } catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/public/halls — no auth required, active halls
router.get('/halls', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const filter = { status: 'active' };
        if (req.query.minCapacity) filter.capacity = { $gte: parseInt(req.query.minCapacity) };
        if (req.query.maxCapacity) filter.capacity = { ...filter.capacity, $lte: parseInt(req.query.maxCapacity) };
        if (req.query.equipment) filter.equipment = { $in: [req.query.equipment] };
        if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

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
    } catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
