/**
 * Analytics Controller
 *
 * Thin HTTP adapter — delegates all heavy lifting to analyticsService.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const analyticsService = require('../services/analyticsService');

const User = require('../models/User');
// FIX C-02 — Database-backed Report model replaces in-memory array
const Report = require('../models/Report');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (Admin only)
// @access  Private/Admin
exports.getDashboard = async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 36);
    const [overview, monthlyRevenue, categoryDistribution, demographics, topPerformers] = await Promise.all([
      analyticsService.getDashboardOverview(),
      analyticsService.getMonthlyRevenue(months),
      analyticsService.getCategoryDistribution(),
      analyticsService.getGlobalDemographics(),
      analyticsService.getTopPerformingEvents(),
    ]);

    // Top events with enhanced data
    // Top events with enhanced data — single aggregate instead of N+1 queries (P-01)
    const enrichedTopEvents = await Ticket.aggregate([
      { $match: { status: { $in: ['booked', 'used'] } } },
      {
        $group: {
          _id: '$event',
          totalTicketsSold: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
          averageTicketPrice: { $avg: { $ifNull: ['$payment.amount', 0] } },
        },
      },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'eventData' } },
      { $unwind: '$eventData' },
      { $sort: { 'eventData.createdAt': -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: '$eventData._id',
          title: '$eventData.title',
          date: '$eventData.date',
          venue: '$eventData.venue',
          seating: '$eventData.seating',
          category: '$eventData.category',
          status: '$eventData.status',
          createdAt: '$eventData.createdAt',
          pricing: '$eventData.pricing',
          analytics: {
            ticketsSold: '$totalTicketsSold',
            totalRevenue: '$totalRevenue',
            averageTicketPrice: '$averageTicketPrice',
            views: { $ifNull: ['$eventData.analytics.views', 0] },
            occupancyRate: {
              $cond: {
                if: { $gt: [{ $ifNull: ['$eventData.seating.totalSeats', 0] }, 0] },
                then: {
                  $round: [{
                    $multiply: [{
                      $divide: [
                        { $subtract: ['$eventData.seating.totalSeats', { $ifNull: ['$eventData.seating.availableSeats', 0] }] },
                        '$eventData.seating.totalSeats'
                      ]
                    }, 100]
                  }]
                },
                else: 0
              }
            },
          },
        },
      },
    ]);

    // Latest event analytics
    let latestEventAnalytics = enrichedTopEvents.length > 0 ? enrichedTopEvents[0] : null;

    // Recent activity / notifications
    const [recentTickets, recentUsers, recentEvents] = await Promise.all([
      Ticket.find({}).populate('user', 'name email').populate('event', 'title date venue.name').sort({ bookingDate: -1 }).limit(8),
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
      Event.find({}).sort({ createdAt: -1 }).limit(3).select('title date status createdAt'),
    ]);

    const notifications = [];

    recentTickets.forEach((ticket) => {
      if (ticket.user && ticket.event) {
        const eventDate = ticket.event.date ? new Date(ticket.event.date).toLocaleDateString() : 'TBD';
        const venue = ticket.event.venue?.name || 'Venue TBD';
        notifications.push({
          id: `booking-${ticket._id}`,
          message: `${ticket.user.name} booked a ticket for "${ticket.event.title}"`,
          description: `Event on ${eventDate} at ${venue}`,
          type: 'booking',
          timestamp: ticket.bookingDate || ticket.createdAt,
          user: { name: ticket.user.name, email: ticket.user.email },
          event: { title: ticket.event.title, date: ticket.event.date, venue: ticket.event.venue?.name },
          metadata: { ticketId: ticket.ticketId, seatNumber: ticket.seatNumber, amount: ticket.payment?.amount },
        });
      }
    });

    recentUsers.forEach((user) => {
      notifications.push({
        id: `user-${user._id}`,
        message: `New user ${user.name} registered`,
        description: 'Welcome to EventX platform',
        type: 'registration',
        timestamp: user.createdAt,
        user: { name: user.name, email: user.email },
        metadata: { source: 'platform' },
      });
    });

    recentEvents.forEach((event) => {
      const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
      const statusText = event.status === 'published' ? 'published' : 'created';
      notifications.push({
        id: `event-${event._id}`,
        message: `Event "${event.title}" was ${statusText}`,
        description: `Scheduled for ${eventDate}`,
        type: 'event',
        timestamp: event.createdAt,
        event: { title: event.title, date: event.date, status: event.status },
        metadata: { action: statusText },
      });
    });

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        overview: { ...overview, totalAttendees: overview.totalTicketsSold },
        revenueData: monthlyRevenue.map((item) => ({
            month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: item.revenue,
          })),
        eventCategories: categoryDistribution.map((item) => ({ name: item._id || 'Uncategorized', value: item.count })),
        trends: { monthlyRevenue },
        distributions: { categories: categoryDistribution },
        topPerformers: { events: topPerformers },
        allEvents: enrichedTopEvents,
        latestEventAnalytics,
        notifications: notifications.slice(0, 8),
        attendeeDemographics: demographics,
        topEvents: topPerformers,
      },
    });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching dashboard analytics' });
  }
};

// @route   GET /api/analytics/attendees
// @desc    Get attendee demographics (Admin only)
// @access  Private/Admin
exports.getAttendees = async (req, res) => {
  try {
    const attendees = await analyticsService.getAttendeeDemographics(req.user);

    if (attendees.length === 0) {
      return res.json({
        success: true,
        data: { demographics: { ageGroups: [], genderDistribution: [], locationDistribution: [], interestDistribution: [] } },
      });
    }

    const demographics = analyticsService.buildDemographics(attendees);

    res.json({
      success: true,
      data: { demographics, totalAttendees: attendees.length },
    });
  } catch (error) {
    logger.error('Attendee analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching attendee analytics' });
  }
};

// @route   GET /api/analytics/events/:eventId
// @desc    Get analytics for a specific event (Admin only)
// @access  Private/Admin
exports.getEventAnalytics = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const query = { _id: eventId };
    if (req.user.role !== 'admin') {
      query.organizer = req.user._id;
    }

    const event = await Event.findOne(query);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or not authorized' });
    }

    const [ticketStats, bookingTrend] = await Promise.all([
      analyticsService.getEventTicketStats(eventId),
      analyticsService.getEventBookingTrend(eventId),
    ]);

    // Attendee demographics for this event
    const eventAttendees = await Ticket.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId), status: { $in: ['booked', 'used'] } } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userData' } },
      { $unwind: '$userData' },
      { $project: { age: '$userData.age', gender: '$userData.gender', city: '$userData.location.city', country: '$userData.location.country' } },
    ]);

    const growthResults = await analyticsService.getAttendeeGrowth(req.user, eventId);
    const demographics = await analyticsService.getAttendeeDemographics(req.user, eventId);
    
    res.json({
      success: true,
      data: {
        event,
        growth: growthResults,
        demographics,
        tickets: {
          statistics: ticketStats,
          bookingTrend: bookingTrend,
        },
      },
    });
  } catch (error) {
    logger.error('Event analytics error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(500).json({ success: false, message: 'Server error while fetching event analytics' });
  }
};

// @route   GET /api/analytics/export
// @desc    Export analytics data (Admin only)
// @access  Private/Admin
exports.exportAnalytics = async (req, res) => {
  try {
    const { type = 'events', format = 'json' } = req.query;
    // FIX M-01 — Make export limit dynamic but capped
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);

    let data = {};

    if (type === 'events') {
      const filter = req.user.role === 'admin' ? {} : { organizer: req.user._id };
      data = await Event.find(filter)
        .select('title date venue category pricing seating analytics status createdAt')
        .sort({ createdAt: -1 })
        .limit(limit);
    } else if (type === 'tickets') {
      // FIX H-06 — Query user's event IDs first, then filter Tickets at DB level 
      // Prevents massive memory spike and data leak from fetching all tickets
      const filter = req.user.role === 'admin' ? {} : { organizer: req.user._id };
      const userEvents = await Event.find(filter).select('_id');
      const eventIds = userEvents.map(e => e._id);

      const ticketFilter = req.user.role === 'admin' ? {} : { event: { $in: eventIds } };
      data = await Ticket.find(ticketFilter)
        .populate({ path: 'event', select: 'title date venue' })
        .populate('user', 'name email')
        .select('ticketId seatNumber bookingDate status payment')
        .sort({ bookingDate: -1 })
        .limit(limit);
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data, exportedAt: new Date(), type, count: data.length });
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error while exporting analytics' });
  }
};

// Helper to escape CSV fields to prevent formula injection
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  const strVal = String(str);
  if (/^[=+\-@]/.test(strVal)) {
    return `"'${strVal.replace(/"/g, '""')}"`;
  }
  if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
    return `"${strVal.replace(/"/g, '""')}"`;
  }
  return strVal;
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map((item) => {
    const obj = item.toObject ? item.toObject() : item;
    return headers.map((header) => {
      const value = obj[header];
      const str = typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value ?? '');
      return escapeCSV(str);
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

// @route   GET /api/analytics/attendee-insights
// @desc    Get attendee insights for a specific event or all events (Admin only)
// @access  Private/Admin
exports.getAttendeeInsights = async (req, res) => {
  try {
    const { eventId } = req.query;
    const attendees = await analyticsService.getAttendeeDemographics(req.user, eventId);

    if (attendees.length === 0) {
      return res.json({
        success: true,
        data: {
          demographics: { ageGroups: [], genderDistribution: [], locationDistribution: [], interestDistribution: [] },
          trends: { registrationTrend: [], attendanceRate: 0 },
          totalAttendees: 0,
        },
      });
    }

    const demographics = analyticsService.buildDemographics(attendees);

    // Registration trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const registrationTrend = {};
    attendees.forEach((a) => {
      if (a.bookingDate && new Date(a.bookingDate) >= thirtyDaysAgo) {
        const date = new Date(a.bookingDate).toISOString().split('T')[0];
        registrationTrend[date] = (registrationTrend[date] || 0) + 1;
      }
    });

    const trendData = Object.entries(registrationTrend)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({ date, registrations: count }));

    res.json({
      success: true,
      data: {
        demographics,
        trends: {
          registrationTrend: trendData,
          attendanceRate: attendees.length > 0
            ? Math.round((attendees.filter((a) => a.checkedIn === true || a.ticketStatus === 'used').length / attendees.length) * 100)
            : 0,
        },
        totalAttendees: attendees.length,
      },
    });
  } catch (error) {
    logger.error('Attendee insights error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching attendee insights' });
  }
};

// @route   GET /api/analytics/all-attendee-insights
// @desc    Get comprehensive attendee insights across all events (Admin only)
// @access  Private/Admin
exports.getAllAttendeeInsights = async (req, res) => {
  try {
    const attendees = await analyticsService.getAttendeeDemographics(req.user);

    if (attendees.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: { totalAttendees: 0, uniqueAttendees: 0, averageAge: 0, topLocation: 'N/A' },
          demographics: { ageGroups: [], genderDistribution: [], locationDistribution: [], interestDistribution: [] },
          trends: { monthlyTrend: [], categoryPreferences: [] },
        },
      });
    }

    const demographics = analyticsService.buildDemographics(attendees);

    // Calculate overview metrics
    const averageAge = attendees.filter((a) => a.age).reduce((sum, a) => sum + a.age, 0) / attendees.filter((a) => a.age).length || 0;

    // Monthly trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const monthlyTrend = {};
    attendees.forEach((a) => {
      if (a.bookingDate && new Date(a.bookingDate) >= twelveMonthsAgo) {
        const monthYear = new Date(a.bookingDate).toISOString().substring(0, 7);
        monthlyTrend[monthYear] = (monthlyTrend[monthYear] || 0) + 1;
      }
    });

    // Category preferences
    const categoryPreferences = {};
    attendees.forEach((a) => {
      if (a.eventCategory) {
        categoryPreferences[a.eventCategory] = (categoryPreferences[a.eventCategory] || 0) + 1;
      }
    });

    // Dominant values
    const dominantAgeGroup = demographics.ageGroups.sort((a, b) => b.count - a.count)[0]?.group || '18-24';
    const dominantGender = demographics.genderDistribution.sort((a, b) => b.count - a.count)[0]?.gender || 'balanced';
    const topLocation = demographics.locationDistribution[0]?.location || 'N/A';
    const topInterest = demographics.interestDistribution[0]?.interest || 'N/A';

    // Location & interest counts for overview
    const locationCount = demographics.locationDistribution[0]?.count || 0;
    const interestCount = demographics.interestDistribution[0]?.count || 0;

    // Age-group count for dominant
    const ageCount = demographics.ageGroups.find((a) => a.group === dominantAgeGroup)?.count || 0;
    const genderCount = demographics.genderDistribution.find((g) => g.gender === dominantGender)?.count || 0;

    const growthRate = await analyticsService.getAttendeeGrowth(req.user);

    res.json({
      success: true,
      data: {
        overview: {
          totalAttendees: attendees.length,
          uniqueAttendees: new Set(attendees.map(a => String(a.userId))).size,
          averageAge: Math.round(averageAge),
          topLocation,
          dominantAgeGroup,
          dominantGender,
          topInterest,
          ageStats: { trend: null, count: ageCount },
          genderStats: { trend: null, count: genderCount },
          locationStats: { trend: null, count: locationCount },
          interestStats: { trend: null, count: interestCount },
          socialEngagement: { platform: 'Social Media', trend: null, count: `${(attendees.length * 0.8 / 1000).toFixed(1)}K` },
        },
        demographics,
        ageData: demographics.ageGroups
          .filter((a) => a.count > 0)
          .map((a) => ({ age: a.group, count: a.count, percentage: Math.round((a.count / attendees.length) * 100) })),
        locationData: demographics.locationDistribution.slice(0, 6).map((l) => ({ city: l.location, count: l.count })),
        interestData: demographics.interestDistribution.slice(0, 6).map((i) => ({ name: i.interest, value: i.count })),
        socialEngagement: { platform: 'Social Media', engagement: `${(attendees.length * 0.8 / 1000).toFixed(1)}K`, trend: 0 },
        trends: {
          monthlyTrend: Object.entries(monthlyTrend)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([month, count]) => ({ month, attendees: count })),
          categoryPreferences: Object.entries(categoryPreferences)
            .sort(([, a], [, b]) => b - a)
            .map(([category, count]) => ({ category, count })),
        },
        recentRegistrations: attendees
          .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
          .slice(0, 5)
          .map(a => ({
            name: a.name,
            eventTitle: a.eventTitle,
            date: a.bookingDate,
            category: a.eventCategory
          })),
      },
    });
  } catch (error) {
    logger.error('All attendee insights error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching all attendee insights' });
  }
};

// ─── Reports ─────────────────────────────────────────────────────

// @route   GET /api/analytics/reports
// FIX C-02 — Query database instead of in-memory array
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ generatedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ success: true, data: { reports } });
  } catch (error) {
    logger.error('Reports list error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching reports' });
  }
};

// @route   POST /api/analytics/reports/generate
// FIX C-02 — Persist to database instead of in-memory array
exports.generateReport = async (req, res) => {
  try {
    const { type, filters } = req.body || {};
    if (!type) return res.status(400).json({ success: false, message: 'Report type is required' });

    const now = new Date();
    const report = await Report.create({
      name: `${String(type).charAt(0).toUpperCase() + String(type).slice(1)} Report - ${now.toLocaleDateString()}`,
      type,
      status: 'generating',
      parameters: filters || {},
      generatedBy: req.user._id,
    });

    // Simulate async report generation; in production replace with a job queue
    setTimeout(async () => {
      try {
        await Report.findByIdAndUpdate(report._id, {
          status: 'completed',
          fileSize: '2.1 MB',
          downloadUrl: `/api/analytics/reports/${report._id}/download`,
        });
      } catch (err) {
        logger.error('Report finalization error:', err);
        await Report.findByIdAndUpdate(report._id, { status: 'failed' }).catch(() => {});
      }
    }, 2000);

    return res.status(201).json({ success: true, data: { report } });
  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating report' });
  }
};

// @route   GET /api/analytics/reports/:id/download
// FIX C-02 — Read from database instead of in-memory array
exports.downloadReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      generatedBy: req.user._id,
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'completed') return res.status(409).json({ success: false, message: 'Report not ready yet' });

    const csv = `name,type,status,createdAt\n"${report.name}","${report.type}","${report.status}","${report.createdAt}"`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.csv"`);
    return res.send(csv);
  } catch (error) {
    logger.error('Report download error:', error);
    res.status(500).json({ success: false, message: 'Server error while downloading report' });
  }
};
