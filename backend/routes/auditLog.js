const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// GET /api/audit-log — admin only, paginated
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.resource) filter.resource = req.query.resource;
        if (req.query.actor) filter.actor = req.query.actor;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('actor', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: { current: page, pages: Math.ceil(total / limit), total },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
