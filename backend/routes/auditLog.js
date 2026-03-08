const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

// GET /api/audit-log — admin only, paginated
router.get('/', authenticate, requireAdmin, getAuditLogs);

module.exports = router;
