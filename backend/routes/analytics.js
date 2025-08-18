const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (Admin only)
// @access  Private/Admin
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get date range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Basic counts
    const totalEvents = await Event.countDocuments({ organizer: req.user._id });
    const activeEvents = await Event.countDocuments({ 
      organizer: req.user._id, 
      status: 'published',
      date: { $gte: new Date() }
    });
    const totalTicketsSold = await Ticket.countDocuments({
      status: { $in: ['booked', 'used'] }
    });
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Revenue calculation
    const revenueData = await Ticket.aggregate([
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
          status: { $in: ['booked', 'used'] },
          'payment.status': 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$payment.amount' },
          averageTicketPrice: { $avg: '$payment.amount' }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, averageTicketPrice: 0 };

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = await Ticket.aggregate([
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
          status: { $in: ['booked', 'used'] },
          'payment.status': 'completed',
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
          revenue: { $sum: '$payment.amount' },
          tickets: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Event category distribution
    const categoryDistribution = await Event.aggregate([
      {
        $match: { organizer: req.user._id }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$analytics.revenue' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Top performing events
    const topEvents = await Event.find({ organizer: req.user._id })
      .sort({ 'analytics.revenue': -1, 'analytics.bookings': -1 })
      .limit(5)
      .select('title date analytics venue.name venue.city');

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
        trends: {
          monthlyRevenue
        },
        distributions: {
          categories: categoryDistribution
        },
        topPerformers: {
          events: topEvents
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

module.exports = router;

