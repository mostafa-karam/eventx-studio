const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, requireAdmin } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// Route: /dashboard
router.get('/dashboard', authenticate, requireAdmin, analyticsController.getDashboard);

// Route: /attendees
router.get('/attendees', authenticate, requireAdmin, analyticsController.getAttendees);

// Route: /events/:eventId
router.get('/events/:eventId', authenticate, analyticsController.getEventAnalytics);

// Route: /export
router.get('/export', authenticate, requireAdmin, analyticsController.exportAnalytics);

// Route: /attendee-insights
router.get('/attendee-insights', authenticate, requireAdmin, analyticsController.getAttendeeInsights);

// Route: /all-attendee-insights
router.get('/all-attendee-insights', authenticate, requireAdmin, analyticsController.getAllAttendeeInsights);

// Route: /reports
router.get('/reports', authenticate, requireAdmin, analyticsController.getReports);

// Route: /reports/generate
router.post('/reports/generate', authenticate, requireAdmin, analyticsController.generateReport);

// Route: /reports/:id/download
router.get('/reports/:id/download', authenticate, requireAdmin, analyticsController.downloadReport);

module.exports = router;