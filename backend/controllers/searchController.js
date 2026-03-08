const Event = require('../models/Event');
const Hall = require('../models/Hall');
const logger = require('../utils/logger');

// Escape special regex chars to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Global Search across Events and Halls
// @access  Public
exports.globalSearch = async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters',
            });
        }

        const regex = new RegExp(escapeRegex(q.trim()), 'i');
        const results = { events: [], halls: [] };

        if (type === 'all' || type === 'events') {
            results.events = await Event.find({
                status: 'published',
                $or: [
                    { title: regex },
                    { description: regex },
                    { category: regex },
                    { 'venue.name': regex },
                ],
            })
                .select('title description category date venue.name pricing.amount images status')
                .sort({ date: 1 })
                .limit(20)
                .lean();
        }

        if (type === 'all' || type === 'halls') {
            results.halls = await Hall.find({
                status: 'active',
                $or: [
                    { name: regex },
                    { description: regex },
                    { 'location.floor': regex },
                ],
            })
                .select('name description capacity hourlyRate location images status')
                .limit(20)
                .lean();
        }

        res.json({
            success: true,
            data: {
                query: q,
                results,
                totalResults: results.events.length + results.halls.length,
            },
        });
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};
