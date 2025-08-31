const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// In-memory reports store (replace with DB model later if needed)
const reportsStore = [];

// Helper function to get real attendee demographics
const getAttendeesDemographics = async () => {
  try {
    // Get users who have booked tickets
    const attendees = await Ticket.aggregate([
      {
        $match: { status: { $in: ['booked', 'used'] } }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          age: '$userData.age',
          city: '$userData.location.city',
          country: '$userData.location.country'
        }
      }
    ]);

    // Calculate age groups
    const ageGroups = {
      '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0
    };
    
    attendees.forEach(attendee => {
      const age = attendee.age;
      if (age >= 18 && age <= 24) ageGroups['18-24']++;
      else if (age >= 25 && age <= 34) ageGroups['25-34']++;
      else if (age >= 35 && age <= 44) ageGroups['35-44']++;
      else if (age >= 45 && age <= 54) ageGroups['45-54']++;
      else if (age >= 55) ageGroups['55+']++;
    });

    // Calculate location distribution
    const locationCounts = {};
    attendees.forEach(attendee => {
      if (attendee.city) {
        const location = attendee.country ? `${attendee.city}, ${attendee.country}` : attendee.city;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    const locations = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    return {
      ageGroups: Object.entries(ageGroups).map(([age, count]) => ({ age, count })),
      locations: locations.length > 0 ? locations : [
        { city: 'No location data', count: attendees.length }
      ]
    };
  } catch (error) {
    console.error('Error getting demographics:', error);
    return {
      ageGroups: [{ age: '25-34', count: 0 }],
      locations: [{ city: 'No data', count: 0 }]
    };
  }
};

// Helper function to get real top performing events
const getTopPerformingEvents = async () => {
  try {
    const eventPerformance = await Ticket.aggregate([
      {
        $match: { status: { $in: ['booked', 'used'] } }
      },
      {
        $group: {
          _id: '$event',
          ticketsSold: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } }
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'eventData'
        }
      },
      {
        $unwind: '$eventData'
      },
      {
        $project: {
          name: '$eventData.title',
          tickets: '$ticketsSold',
          revenue: '$totalRevenue',
          attendees: '$ticketsSold' // Assuming 1 ticket = 1 attendee
        }
      },
      {
        $sort: { revenue: -1, tickets: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return eventPerformance.length > 0 ? eventPerformance : [
      { name: 'No events with sales', tickets: 0, revenue: 0, attendees: 0 }
    ];
  } catch (error) {
    console.error('Error getting top events:', error);
    return [{ name: 'Error loading events', tickets: 0, revenue: 0, attendees: 0 }];
  }
};

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (Admin only)
// @access  Private/Admin
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get date range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Basic counts - show all system data for admin dashboard
    const totalEvents = await Event.countDocuments({});
    const activeEvents = await Event.countDocuments({ 
      status: 'published',
      date: { $gte: new Date() }
    });
    const totalTicketsSold = await Ticket.countDocuments({
      status: { $in: ['booked', 'used'] }
    });
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Revenue calculation - calculate from all tickets with payment data
    const revenueData = await Ticket.aggregate([
      {
        $match: {
          status: { $in: ['booked', 'used'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
          averageTicketPrice: { $avg: { $ifNull: ['$payment.amount', 0] } },
          totalTickets: { $sum: 1 }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, averageTicketPrice: 0 };

    // Monthly revenue trend (last 6 months) - all system tickets
    const monthlyRevenue = await Ticket.aggregate([
      {
        $match: {
          status: { $in: ['booked', 'used'] },
          bookingDate: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' }
          },
          revenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
          tickets: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Event category distribution - all events
    const categoryDistribution = await Event.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Top performing events - all events
    const topEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title date venue.name venue.city seating');

    // Recent activity - get recent bookings and user registrations
    const recentTickets = await Ticket.find({})
      .populate('user', 'name')
      .populate('event', 'title')
      .sort({ bookingDate: -1 })
      .limit(5);

    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('name createdAt');

    // Format notifications/activity
    const notifications = [];
    
    // Add recent bookings
    recentTickets.forEach(ticket => {
      if (ticket.user && ticket.event) {
        notifications.push({
          id: ticket._id,
          message: `${ticket.user.name} booked a ticket for ${ticket.event.title}`,
          type: 'booking',
          timestamp: ticket.bookingDate || ticket.createdAt
        });
      }
    });

    // Add recent user registrations
    recentUsers.forEach(user => {
      notifications.push({
        id: user._id,
        message: `New user ${user.name} registered`,
        type: 'registration',
        timestamp: user.createdAt
      });
    });

    // Sort by timestamp and limit to 5 most recent
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentNotifications = notifications.slice(0, 5);

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          activeEvents,
          totalTicketsSold,
          totalUsers,
          totalRevenue: revenue.totalRevenue,
          averageTicketPrice: revenue.averageTicketPrice
        },
        revenueData: monthlyRevenue.length > 0 ? monthlyRevenue.map(item => ({
          month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: item.revenue
        })) : [
          // Provide sample data if no monthly data exists
          { month: 'Jan 2025', revenue: revenue.totalRevenue || 0 },
          { month: 'Feb 2025', revenue: Math.round((revenue.totalRevenue || 0) * 0.8) },
          { month: 'Mar 2025', revenue: Math.round((revenue.totalRevenue || 0) * 1.2) }
        ],
        eventCategories: categoryDistribution.length > 0 ? categoryDistribution.map(item => ({
          name: item._id || 'Uncategorized',
          value: item.count
        })) : [],
        trends: {
          monthlyRevenue
        },
        distributions: {
          categories: categoryDistribution
        },
        topPerformers: {
          events: topEvents
        },
        notifications: recentNotifications,
        // Real demographics data from actual users
        attendeeDemographics: await getAttendeesDemographics(),
        // Real top events data based on actual ticket sales
        topEvents: await getTopPerformingEvents(),
        overview: {
          totalEvents,
          activeEvents,
          totalTicketsSold,
          totalUsers,
          totalRevenue: revenue.totalRevenue,
          averageTicketPrice: revenue.averageTicketPrice,
          totalAttendees: totalTicketsSold
        }
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard analytics'
    });
  }
});

// @route   GET /api/analytics/attendees
// @desc    Get attendee demographics (Admin only)
// @access  Private/Admin
router.get('/attendees', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get attendees for events organized by current admin
    const attendeeData = await Ticket.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventData'
        }
      },
      {
        $unwind: '$eventData'
      },
      {
        $match: {
          'eventData.organizer': req.user._id,
          status: { $in: ['booked', 'used'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $group: {
          _id: null,
          attendees: {
            $push: {
              age: '$userData.age',
              gender: '$userData.gender',
              city: '$userData.location.city',
              country: '$userData.location.country',
              interests: '$userData.interests'
            }
          }
        }
      }
    ]);

    if (!attendeeData[0]) {
      return res.json({
        success: true,
        data: {
          demographics: {
            ageGroups: [],
            genderDistribution: [],
            locationDistribution: [],
            interestDistribution: []
          }
        }
      });
    }

    const attendees = attendeeData[0].attendees;

    // Age group distribution
    const ageGroups = {
      '13-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
      'Unknown': 0
    };

    attendees.forEach(attendee => {
      const age = attendee.age;
      if (!age) {
        ageGroups['Unknown']++;
      } else if (age >= 13 && age <= 17) {
        ageGroups['13-17']++;
      } else if (age >= 18 && age <= 24) {
        ageGroups['18-24']++;
      } else if (age >= 25 && age <= 34) {
        ageGroups['25-34']++;
      } else if (age >= 35 && age <= 44) {
        ageGroups['35-44']++;
      } else if (age >= 45 && age <= 54) {
        ageGroups['45-54']++;
      } else if (age >= 55 && age <= 64) {
        ageGroups['55-64']++;
      } else if (age >= 65) {
        ageGroups['65+']++;
      }
    });

    // Gender distribution
    const genderDistribution = {};
    attendees.forEach(attendee => {
      const gender = attendee.gender || 'prefer-not-to-say';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Location distribution (top 10 cities)
    const locationDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.city) {
        const location = `${attendee.city}${attendee.country ? ', ' + attendee.country : ''}`;
        locationDistribution[location] = (locationDistribution[location] || 0) + 1;
      }
    });

    // Interest distribution (top 10 interests)
    const interestDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.interests && Array.isArray(attendee.interests)) {
        attendee.interests.forEach(interest => {
          interestDistribution[interest] = (interestDistribution[interest] || 0) + 1;
        });
      }
    });

    // Convert to arrays and sort
    const topLocations = Object.entries(locationDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    const topInterests = Object.entries(interestDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([interest, count]) => ({ interest, count }));

    res.json({
      success: true,
      data: {
        demographics: {
          ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
          genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({ gender, count })),
          locationDistribution: topLocations,
          interestDistribution: topInterests
        },
        totalAttendees: attendees.length
      }
    });
  } catch (error) {
    console.error('Attendee analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendee analytics'
    });
  }
});

// @route   GET /api/analytics/events/:eventId
// @desc    Get analytics for a specific event (Admin only)
// @access  Private/Admin
router.get('/events/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Verify event belongs to current admin
    const event = await Event.findOne({ 
      _id: eventId, 
      organizer: req.user._id 
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not authorized'
      });
    }

    // Get ticket statistics
    const ticketStats = await Ticket.aggregate([
      {
        $match: { event: new mongoose.Types.ObjectId(eventId) }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$payment.amount' }
        }
      }
    ]);

    // Daily booking trend (last 30 days)
    const bookingTrend = await Ticket.aggregate([
      {
        $match: { 
          event: new mongoose.Types.ObjectId(eventId),
          bookingDate: { 
            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' },
            day: { $dayOfMonth: '$bookingDate' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$payment.amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Attendee demographics for this event
    const eventAttendees = await Ticket.aggregate([
      {
        $match: { 
          event: new mongoose.Types.ObjectId(eventId),
          status: { $in: ['booked', 'used'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          age: '$userData.age',
          gender: '$userData.gender',
          city: '$userData.location.city',
          country: '$userData.location.country'
        }
      }
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
          views: event.analytics.views
        },
        tickets: {
          statistics: ticketStats,
          bookingTrend
        },
        attendees: eventAttendees
      }
    });
  } catch (error) {
    console.error('Event analytics error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event analytics'
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data (Admin only)
// @access  Private/Admin
router.get('/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type = 'events', format = 'json' } = req.query;

    let data = {};

    if (type === 'events') {
      data = await Event.find({ organizer: req.user._id })
        .select('title date venue category pricing seating analytics status createdAt')
        .sort({ createdAt: -1 });
    } else if (type === 'tickets') {
      data = await Ticket.find()
        .populate({
          path: 'event',
          match: { organizer: req.user._id },
          select: 'title date venue'
        })
        .populate('user', 'name email')
        .select('ticketId seatNumber bookingDate status payment')
        .sort({ bookingDate: -1 });
      
      // Filter out tickets where event is null (not belonging to this admin)
      data = data.filter(ticket => ticket.event);
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: data,
      exportedAt: new Date(),
      type,
      count: data.length
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting analytics'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(item => {
    const obj = item.toObject ? item.toObject() : item;
    return headers.map(header => {
      const value = obj[header];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

// @route   GET /api/analytics/attendee-insights
// @desc    Get attendee insights for a specific event or all events (Admin only)
// @access  Private/Admin
router.get('/attendee-insights', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.query;
    
    let matchCondition = {
      'eventData.organizer': req.user._id,
      status: { $in: ['booked', 'used'] }
    };
    
    if (eventId) {
      matchCondition['eventData._id'] = new mongoose.Types.ObjectId(eventId);
    }

    // Get attendee data with demographics
    const attendeeData = await Ticket.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventData'
        }
      },
      {
        $unwind: '$eventData'
      },
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $group: {
          _id: null,
          attendees: {
            $push: {
              age: '$userData.age',
              gender: '$userData.gender',
              city: '$userData.location.city',
              country: '$userData.location.country',
              interests: '$userData.interests',
              eventTitle: '$eventData.title',
              eventDate: '$eventData.date',
              bookingDate: '$bookingDate'
            }
          }
        }
      }
    ]);

    if (!attendeeData[0]) {
      return res.json({
        success: true,
        data: {
          demographics: {
            ageGroups: [],
            genderDistribution: [],
            locationDistribution: [],
            interestDistribution: []
          },
          trends: {
            registrationTrend: [],
            attendanceRate: 0
          },
          totalAttendees: 0
        }
      });
    }

    const attendees = attendeeData[0].attendees;

    // Age group distribution
    const ageGroups = {
      '13-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
      'Unknown': 0
    };

    attendees.forEach(attendee => {
      const age = attendee.age;
      if (!age) {
        ageGroups['Unknown']++;
      } else if (age >= 13 && age <= 17) {
        ageGroups['13-17']++;
      } else if (age >= 18 && age <= 24) {
        ageGroups['18-24']++;
      } else if (age >= 25 && age <= 34) {
        ageGroups['25-34']++;
      } else if (age >= 35 && age <= 44) {
        ageGroups['35-44']++;
      } else if (age >= 45 && age <= 54) {
        ageGroups['45-54']++;
      } else if (age >= 55 && age <= 64) {
        ageGroups['55-64']++;
      } else if (age >= 65) {
        ageGroups['65+']++;
      }
    });

    // Gender distribution
    const genderDistribution = {};
    attendees.forEach(attendee => {
      const gender = attendee.gender || 'prefer-not-to-say';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Location distribution (top 10 cities)
    const locationDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.city) {
        const location = `${attendee.city}${attendee.country ? ', ' + attendee.country : ''}`;
        locationDistribution[location] = (locationDistribution[location] || 0) + 1;
      }
    });

    // Interest distribution (top 10 interests)
    const interestDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.interests && Array.isArray(attendee.interests)) {
        attendee.interests.forEach(interest => {
          interestDistribution[interest] = (interestDistribution[interest] || 0) + 1;
        });
      }
    });

    // Registration trend (last 30 days)
    const registrationTrend = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    attendees.forEach(attendee => {
      if (attendee.bookingDate && new Date(attendee.bookingDate) >= thirtyDaysAgo) {
        const date = new Date(attendee.bookingDate).toISOString().split('T')[0];
        registrationTrend[date] = (registrationTrend[date] || 0) + 1;
      }
    });

    // Convert to arrays and sort
    const topLocations = Object.entries(locationDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    const topInterests = Object.entries(interestDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([interest, count]) => ({ interest, count }));

    const trendData = Object.entries(registrationTrend)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({ date, registrations: count }));

    res.json({
      success: true,
      data: {
        demographics: {
          ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
          genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({ gender, count })),
          locationDistribution: topLocations,
          interestDistribution: topInterests
        },
        trends: {
          registrationTrend: trendData,
          attendanceRate: attendees.length > 0 ? Math.round((attendees.filter(a => a.status === 'attended').length / attendees.length) * 100) : 0
        },
        totalAttendees: attendees.length
      }
    });
  } catch (error) {
    console.error('Attendee insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendee insights'
    });
  }
});

// @route   GET /api/analytics/all-attendee-insights
// @desc    Get comprehensive attendee insights across all events (Admin only)
// @access  Private/Admin
router.get('/all-attendee-insights', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all attendee data across all events for this admin
    const attendeeData = await Ticket.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventData'
        }
      },
      {
        $unwind: '$eventData'
      },
      {
        $match: {
          'eventData.organizer': req.user._id,
          status: { $in: ['booked', 'used'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $group: {
          _id: null,
          attendees: {
            $push: {
              age: '$userData.age',
              gender: '$userData.gender',
              city: '$userData.location.city',
              country: '$userData.location.country',
              interests: '$userData.interests',
              eventTitle: '$eventData.title',
              eventDate: '$eventData.date',
              eventCategory: '$eventData.category',
              bookingDate: '$bookingDate'
            }
          }
        }
      }
    ]);

    if (!attendeeData[0]) {
      return res.json({
        success: true,
        data: {
          overview: {
            totalAttendees: 0,
            uniqueAttendees: 0,
            averageAge: 0,
            topLocation: 'N/A'
          },
          demographics: {
            ageGroups: [],
            genderDistribution: [],
            locationDistribution: [],
            interestDistribution: []
          },
          trends: {
            monthlyTrend: [],
            categoryPreferences: []
          }
        }
      });
    }

    const attendees = attendeeData[0].attendees;

    // Calculate overview metrics
    const uniqueAttendees = new Set(attendees.map(a => a.userData?._id)).size;
    const averageAge = attendees.filter(a => a.age).reduce((sum, a) => sum + a.age, 0) / attendees.filter(a => a.age).length || 0;
    
    // Age group distribution
    const ageGroups = {
      '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, 
      '45-54': 0, '55-64': 0, '65+': 0, 'Unknown': 0
    };

    attendees.forEach(attendee => {
      const age = attendee.age;
      if (!age) ageGroups['Unknown']++;
      else if (age >= 13 && age <= 17) ageGroups['13-17']++;
      else if (age >= 18 && age <= 24) ageGroups['18-24']++;
      else if (age >= 25 && age <= 34) ageGroups['25-34']++;
      else if (age >= 35 && age <= 44) ageGroups['35-44']++;
      else if (age >= 45 && age <= 54) ageGroups['45-54']++;
      else if (age >= 55 && age <= 64) ageGroups['55-64']++;
      else if (age >= 65) ageGroups['65+']++;
    });

    // Gender distribution
    const genderDistribution = {};
    attendees.forEach(attendee => {
      const gender = attendee.gender || 'prefer-not-to-say';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Location distribution
    const locationDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.city) {
        const location = `${attendee.city}${attendee.country ? ', ' + attendee.country : ''}`;
        locationDistribution[location] = (locationDistribution[location] || 0) + 1;
      }
    });

    // Interest distribution
    const interestDistribution = {};
    attendees.forEach(attendee => {
      if (attendee.interests && Array.isArray(attendee.interests)) {
        attendee.interests.forEach(interest => {
          interestDistribution[interest] = (interestDistribution[interest] || 0) + 1;
        });
      }
    });

    // Monthly trend (last 12 months)
    const monthlyTrend = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    attendees.forEach(attendee => {
      if (attendee.bookingDate && new Date(attendee.bookingDate) >= twelveMonthsAgo) {
        const monthYear = new Date(attendee.bookingDate).toISOString().substring(0, 7);
        monthlyTrend[monthYear] = (monthlyTrend[monthYear] || 0) + 1;
      }
    });

    // Category preferences
    const categoryPreferences = {};
    attendees.forEach(attendee => {
      if (attendee.eventCategory) {
        categoryPreferences[attendee.eventCategory] = (categoryPreferences[attendee.eventCategory] || 0) + 1;
      }
    });

    // Get dominant demographics
    const dominantAgeGroup = Object.entries(ageGroups)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '18-24';
    
    const dominantGender = Object.entries(genderDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'balanced';
    
    const topLocation = Object.entries(locationDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    const topInterest = Object.entries(interestDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Calculate trends (mock percentage changes for now - would need historical data)
    const ageTrend = Math.floor(Math.random() * 60) - 10; // -10 to 50
    const genderTrend = Math.floor(Math.random() * 40) - 5; // -5 to 35
    const locationTrend = Math.floor(Math.random() * 50) - 20; // -20 to 30
    const interestTrend = Math.floor(Math.random() * 80) - 10; // -10 to 70
    const engagementTrend = Math.floor(Math.random() * 50) - 15; // -15 to 35

    res.json({
      success: true,
      data: {
        overview: {
          totalAttendees: attendees.length,
          uniqueAttendees,
          averageAge: Math.round(averageAge),
          topLocation,
          dominantAgeGroup,
          dominantGender,
          topInterest,
          ageStats: {
            trend: ageTrend,
            count: ageGroups[dominantAgeGroup] || 0
          },
          genderStats: {
            trend: genderTrend,
            count: `${Math.round((genderDistribution[dominantGender] || 0) / attendees.length * 100)}%`
          },
          locationStats: {
            trend: locationTrend,
            count: locationDistribution[topLocation] || 0
          },
          interestStats: {
            trend: interestTrend,
            count: interestDistribution[topInterest] || 0
          },
          socialEngagement: {
            platform: 'Social Media',
            trend: engagementTrend,
            count: `${(attendees.length * 0.8 / 1000).toFixed(1)}K`
          }
        },
        demographics: {
          ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
          genderDistribution: Object.entries(genderDistribution).map(([gender, count]) => ({ gender, count })),
          locationDistribution: Object.entries(locationDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([location, count]) => ({ location, count })),
          interestDistribution: Object.entries(interestDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([interest, count]) => ({ interest, count }))
        },
        ageData: Object.entries(ageGroups)
          .filter(([,count]) => count > 0)
          .map(([group, count]) => ({ age: group, count, percentage: Math.round((count / attendees.length) * 100) })),
        locationData: Object.entries(locationDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([city, count]) => ({ city, count })),
        interestData: Object.entries(interestDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([interest, count]) => ({ name: interest, value: count })),
        socialEngagement: {
          platform: 'Social Media',
          engagement: `${(attendees.length * 0.8 / 1000).toFixed(1)}K`,
          trend: engagementTrend
        },
        trends: {
          monthlyTrend: Object.entries(monthlyTrend)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([month, count]) => ({ month, attendees: count })),
          categoryPreferences: Object.entries(categoryPreferences)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => ({ category, count }))
        }
      }
    });
  } catch (error) {
    console.error('All attendee insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all attendee insights'
    });
  }
});

// @route   GET /api/analytics/attendee-insights
// @desc    Get single event attendee insights (Admin only)
// @access  Private/Admin
router.get('/attendee-insights', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get attendees for this event
    const attendees = await Ticket.aggregate([
      {
        $match: { 
          event: new mongoose.Types.ObjectId(eventId),
          status: { $in: ['booked', 'used'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          age: '$userData.age',
          gender: '$userData.gender',
          city: '$userData.location.city',
          country: '$userData.location.country',
          interests: '$userData.interests',
          createdAt: '$createdAt'
        }
      }
    ]);

    // Calculate demographics
    const ageGroups = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };
    const genderCounts = { male: 0, female: 0, other: 0 };
    const locationCounts = {};
    const interestCounts = {};

    attendees.forEach(attendee => {
      // Age groups
      const age = attendee.age;
      if (age >= 18 && age <= 24) ageGroups['18-24']++;
      else if (age >= 25 && age <= 34) ageGroups['25-34']++;
      else if (age >= 35 && age <= 44) ageGroups['35-44']++;
      else if (age >= 45) ageGroups['45+']++;

      // Gender
      if (attendee.gender) {
        genderCounts[attendee.gender.toLowerCase()] = (genderCounts[attendee.gender.toLowerCase()] || 0) + 1;
      }

      // Location
      if (attendee.city) {
        const location = attendee.country ? `${attendee.city}, ${attendee.country}` : attendee.city;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }

      // Interests
      if (attendee.interests && Array.isArray(attendee.interests)) {
        attendee.interests.forEach(interest => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        });
      }
    });

    // Get dominant values - handle empty data for single event
    const ageEntries = Object.entries(ageGroups).filter(([,count]) => count > 0);
    const genderEntries = Object.entries(genderCounts).filter(([,count]) => count > 0);
    
    const dominantAgeGroup = ageEntries.length > 0 ? 
      ageEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] : '25-34';
    const dominantGender = genderEntries.length > 0 ? 
      genderEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'male';
    const topLocation = Object.entries(locationCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    const topInterest = Object.entries(interestCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';

    // Real age trend data over time (based on booking dates)
    const ageOverTime = await Ticket.aggregate([
      {
        $match: { 
          event: new mongoose.Types.ObjectId(eventId),
          status: { $in: ['booked', 'used'] },
          bookingDate: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          age: '$userData.age',
          day: { $dayOfMonth: '$bookingDate' }
        }
      },
      {
        $group: {
          _id: '$day',
          '18-24': { $sum: { $cond: [{ $and: [{ $gte: ['$age', 18] }, { $lte: ['$age', 24] }] }, 1, 0] } },
          '25-34': { $sum: { $cond: [{ $and: [{ $gte: ['$age', 25] }, { $lte: ['$age', 34] }] }, 1, 0] } },
          '35-44': { $sum: { $cond: [{ $and: [{ $gte: ['$age', 35] }, { $lte: ['$age', 44] }] }, 1, 0] } },
          '45+': { $sum: { $cond: [{ $gte: ['$age', 45] }, 1, 0] } }
        }
      },
      {
        $sort: { '_id': 1 }
      },
      {
        $project: {
          label: { $toString: '$_id' },
          '18-24': 1,
          '25-34': 1,
          '35-44': 1,
          '45+': 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalAttendees: attendees.length,
          dominantAgeGroup: `${dominantAgeGroup} Years`,
          dominantGender: dominantGender.charAt(0).toUpperCase() + dominantGender.slice(1),
          topLocation,
          topInterest,
          ageStats: {
            count: ageGroups[dominantAgeGroup],
            trend: null
          },
          genderStats: {
            count: genderCounts[dominantGender],
            trend: null
          },
          locationStats: {
            count: locationCounts[topLocation] || 0,
            trend: null
          },
          interestStats: {
            count: interestCounts[topInterest] || 0,
            trend: null
          },
          socialEngagement: {
            platform: 'Event Check-ins',
            count: attendees.length,
            trend: null,
            instagram: 0,
            facebook: 0,
            twitter: 0
          },
          checkIns: attendees.length,
          socialTotal: attendees.length
        },
        ageData: Object.entries(ageGroups).map(([age, count]) => ({ name: age, value: count })),
        locationData: Object.entries(locationCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([city, count]) => ({ city, count })),
        interestData: Object.entries(interestCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8)
          .map(([name, value]) => ({ name, value })),
        trends: {
          ageOverTime
        }
      }
    });
  } catch (error) {
    console.error('Attendee insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendee insights'
    });
  }
});

// @route   GET /api/analytics/all-attendee-insights
// @desc    Get all events attendee insights (Admin only)
// @access  Private/Admin
router.get('/all-attendee-insights', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all attendees across all events
    const attendees = await Ticket.aggregate([
      {
        $match: { status: { $in: ['booked', 'used'] } }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          age: '$userData.age',
          gender: '$userData.gender',
          city: '$userData.location.city',
          country: '$userData.location.country',
          interests: '$userData.interests',
          createdAt: '$createdAt'
        }
      }
    ]);

    // Calculate demographics
    const ageGroups = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };
    const genderCounts = { male: 0, female: 0, other: 0 };
    const locationCounts = {};
    const interestCounts = {};

    attendees.forEach(attendee => {
      // Age groups
      const age = attendee.age;
      if (age >= 18 && age <= 24) ageGroups['18-24']++;
      else if (age >= 25 && age <= 34) ageGroups['25-34']++;
      else if (age >= 35 && age <= 44) ageGroups['35-44']++;
      else if (age >= 45) ageGroups['45+']++;

      // Gender
      if (attendee.gender) {
        genderCounts[attendee.gender.toLowerCase()] = (genderCounts[attendee.gender.toLowerCase()] || 0) + 1;
      }

      // Location
      if (attendee.city) {
        const location = attendee.country ? `${attendee.city}, ${attendee.country}` : attendee.city;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }

      // Interests
      if (attendee.interests && Array.isArray(attendee.interests)) {
        attendee.interests.forEach(interest => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        });
      }
    });

    // Get dominant values - handle empty data for all events
    const ageEntries = Object.entries(ageGroups).filter(([,count]) => count > 0);
    const genderEntries = Object.entries(genderCounts).filter(([,count]) => count > 0);
    
    const dominantAgeGroup = ageEntries.length > 0 ? 
      ageEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] : '25-34';
    const dominantGender = genderEntries.length > 0 ? 
      genderEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'male';
    const topLocation = Object.entries(locationCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    const topInterest = Object.entries(interestCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';

    res.json({
      success: true,
      data: {
        overview: {
          totalAttendees: attendees.length,
          dominantAgeGroup: `${dominantAgeGroup} Years`,
          dominantGender: dominantGender.charAt(0).toUpperCase() + dominantGender.slice(1),
          topLocation,
          topInterest,
          ageStats: {
            count: ageGroups[dominantAgeGroup],
            trend: null
          },
          genderStats: {
            count: genderCounts[dominantGender],
            trend: null
          },
          locationStats: {
            count: locationCounts[topLocation] || 0,
            trend: null
          },
          interestStats: {
            count: interestCounts[topInterest] || 0,
            trend: null
          },
          socialEngagement: {
            platform: 'Event Check-ins',
            count: attendees.length,
            trend: null
          }
        },
        demographics: {
          ageGroups: Object.entries(ageGroups).map(([age, count]) => ({ age, count })),
          locationDistribution: Object.entries(locationCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([location, count]) => ({ location, count })),
          interestDistribution: Object.entries(interestCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([interest, count]) => ({ interest, count }))
        }
      }
    });
  } catch (error) {
    console.error('All attendee insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all attendee insights'
    });
  }
});

module.exports = router;

// Reports Center Endpoints
// @route   GET /api/analytics/reports
// @desc    List generated reports for the current admin
// @access  Private/Admin
router.get('/reports', authenticate, requireAdmin, async (req, res) => {
  try {
    // Filter by organizer if we later persist with DB; for now, return all in-memory
    return res.json({
      success: true,
      data: { reports: reportsStore },
    });
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching reports' });
  }
});

// @route   POST /api/analytics/reports/generate
// @desc    Generate a new report (simulated)
// @access  Private/Admin
router.post('/reports/generate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, filters } = req.body || {};
    if (!type) {
      return res.status(400).json({ success: false, message: 'Report type is required' });
    }

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

    // Push initial generating state
    reportsStore.unshift(newReport);

    // Simulate async completion after 2 seconds
    setTimeout(() => {
      const idx = reportsStore.findIndex(r => r._id === id);
      if (idx !== -1) {
        reportsStore[idx] = {
          ...reportsStore[idx],
          status: 'completed',
          fileSize: '2.1 MB',
          downloadUrl: `/api/analytics/reports/${id}/download`,
        };
      }
    }, 2000);

    return res.status(201).json({ success: true, data: { report: newReport } });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating report' });
  }
});

// @route   GET /api/analytics/reports/:id/download
// @desc    Download generated report (simulated as CSV)
// @access  Private/Admin
router.get('/reports/:id/download', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const report = reportsStore.find(r => r._id === id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (report.status !== 'completed') {
      return res.status(409).json({ success: false, message: 'Report not ready yet' });
    }

    // For demo, return a tiny CSV payload
    const csv = `name,type,status,createdAt\n"${report.name}","${report.type}","${report.status}","${report.createdAt}"`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ success: false, message: 'Server error while downloading report' });
  }
});

