const auditService = require('../services/auditService');

// @desc    Get paginated audit logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
    try {
        const result = await auditService.query({
            page: req.query.page,
            limit: req.query.limit,
            action: req.query.action,
            resource: req.query.resource,
            actor: req.query.actor,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });

        res.json({
            success: true,
            data: {
                logs: result.logs,
                pagination: result.pagination,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
