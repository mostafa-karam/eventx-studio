const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

// GET /api/audit-log — admin only, paginated
router.get('/', authenticate, requireAdmin, asyncHandler(getAuditLogs);

module.exports = router;
