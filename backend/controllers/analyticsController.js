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

// In-memory reports store (replace with DB model later if needed)
const reportsStore = [];

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (Admin only)
// @access  Private/Admin
exports.getDashboard = async (req, res) => {
  try {
    const [overview, monthlyRevenue, categoryDistribution, demographics, topPerformers] = await Promise.all([
      analyticsService.getDashboardOverview(),
      analyticsService.getMonthlyRevenue(6),
      analyticsService.getCategoryDistribution(),
      analyticsService.getGlobalDemographics(),
      analyticsService.getTopPerformingEvents(),
    ]);

    // Top events with enhanced data
    const topEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title date venue.name venue.city seating category status createdAt pricing');

    // Latest event analytics
    let latestEventAnalytics = null;
    if (topEvents.length > 0) {
      const latest = topEvents[0];
      const eventTickets = await Ticket.aggregate([
        { $match: { event: latest._id, status: { $in: ['booked', 'used'] } } },
        {
          $group: {
            _id: null,
            totalTicketsSold: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
            averageTicketPrice: { $avg: { $ifNull: ['$payment.amount', 0] } },
          },
        },
      ]);

      const eventViews = await Event.findById(latest._id).select('analytics.views');

      latestEventAnalytics = {
        ...latest.toObject(),
        analytics: {
          ticketsSold: eventTickets[0]?.totalTicketsSold || 0,
          totalRevenue: eventTickets[0]?.totalRevenue || 0,
          averageTicketPrice: eventTickets[0]?.averageTicketPrice || 0,
          views: eventViews?.analytics?.views || 0,
          occupancyRate: latest.seating?.totalSeats > 0
            ? Math.round(((latest.seating.totalSeats - latest.seating.availableSeats) / latest.seating.totalSeats) * 100)
            : 0,
        },
      };
    }

    // Recent activity / notifications
    const [recentTickets, recentUsers, recentEvents] = await Promise.all([
      Ticket.find({}).populate('user', 'name email').populate('event', 'title date venue.name').sort({ bookingDate: -1 }).limit(8),
      require('../models/User').find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
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
        revenueData: monthlyRevenue.length > 0
          ? monthlyRevenue.map((item) => ({
              month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              revenue: item.revenue,
            }))
          : [
              { month: 'Jan 2025', revenue: overview.totalRevenue || 0 },
              { month: 'Feb 2025', revenue: Math.round((overview.totalRevenue || 0) * 0.8) },
              { month: 'Mar 2025', revenue: Math.round((overview.totalRevenue || 0) * 1.2) },
            ],
        eventCategories: categoryDistribution.map((item) => ({ name: item._id || 'Uncategorized', value: item.count })),
        trends: { monthlyRevenue },
        distributions: { categories: categoryDistribution },
        topPerformers: { events: topEvents },
        allEvents: topEvents,
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
    const attendees = await analyticsService.getAttendeeDemographics(req.user._id);

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

    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
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

    res.json({
      success: true,
      data: {
        event: {
          title: event.title,
          date: event.date,
          venue: event.venue,
          totalSeats: event.seating.totalSeats,
          availableSeats: event.seating.availableSeats,
          views: event.analytics.views,
        },
        tickets: { statistics: ticketStats, bookingTrend },
        attendees: eventAttendees,
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

    let data = {};

    if (type === 'events') {
      data = await Event.find({ organizer: req.user._id })
        .select('title date venue category pricing seating analytics status createdAt')
        .sort({ createdAt: -1 });
    } else if (type === 'tickets') {
      data = await Ticket.find()
        .populate({ path: 'event', match: { organizer: req.user._id }, select: 'title date venue' })
        .populate('user', 'name email')
        .select('ticketId seatNumber bookingDate status payment')
        .sort({ bookingDate: -1 });

      data = data.filter((ticket) => ticket.event);
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

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map((item) => {
    const obj = item.toObject ? item.toObject() : item;
    return headers
      .map((header) => {
        const value = obj[header];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

// @route   GET /api/analytics/attendee-insights
// @desc    Get attendee insights for a specific event or all events (Admin only)
// @access  Private/Admin
exports.getAttendeeInsights = async (req, res) => {
  try {
    const { eventId } = req.query;
    const attendees = await analyticsService.getAttendeeDemographics(req.user._id, eventId);

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
            ? Math.round((attendees.filter((a) => a.status === 'attended').length / attendees.length) * 100)
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
    const attendees = await analyticsService.getAttendeeDemographics(req.user._id);

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

    res.json({
      success: true,
      data: {
        overview: {
          totalAttendees: attendees.length,
          uniqueAttendees: attendees.length, // simplified
          averageAge: Math.round(averageAge),
          topLocation,
          dominantAgeGroup,
          dominantGender,
          topInterest,
          ageStats: { trend: 0, count: ageCount },
          genderStats: { trend: 0, count: `${Math.round((genderCount / attendees.length) * 100)}%` },
          locationStats: { trend: 0, count: locationCount },
          interestStats: { trend: 0, count: interestCount },
          socialEngagement: { platform: 'Social Media', trend: 0, count: `${(attendees.length * 0.8 / 1000).toFixed(1)}K` },
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
      },
    });
  } catch (error) {
    logger.error('All attendee insights error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching all attendee insights' });
  }
};

// ─── Reports ─────────────────────────────────────────────────────

// @route   GET /api/analytics/reports
exports.getReports = async (req, res) => {
  try {
    return res.json({ success: true, data: { reports: reportsStore } });
  } catch (error) {
    logger.error('Reports list error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching reports' });
  }
};

// @route   POST /api/analytics/reports/generate
exports.generateReport = async (req, res) => {
  try {
    const { type, filters } = req.body || {};
    if (!type) return res.status(400).json({ success: false, message: 'Report type is required' });

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const newReport = {
      _id: id,
      name: `${String(type).charAt(0).toUpperCase() + String(type).slice(1)} Report - ${now.toLocaleDateString()}`,
      type,
      status: 'generating',
      createdAt: now.toISOString(),
      fileSize: null,
      downloadUrl: null,
      parameters: filters || {},
    };

    reportsStore.unshift(newReport);

    setTimeout(() => {
      const idx = reportsStore.findIndex((r) => r._id === id);
      if (idx !== -1) {
        reportsStore[idx] = { ...reportsStore[idx], status: 'completed', fileSize: '2.1 MB', downloadUrl: `/api/analytics/reports/${id}/download` };
      }
    }, 2000);

    return res.status(201).json({ success: true, data: { report: newReport } });
  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating report' });
  }
};

// @route   GET /api/analytics/reports/:id/download
exports.downloadReport = async (req, res) => {
  try {
    const report = reportsStore.find((r) => r._id === req.params.id);
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
