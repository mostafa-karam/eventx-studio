/**
 * Analytics Service
 *
 * Extracts the heavy aggregation pipelines from analyticsController
 * into reusable, tested functions. The controller becomes a thin
 * HTTP adapter that calls these functions and sends JSON responses.
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const logger = require('../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Classify an age into an age-group bucket.
 */
const ageGroup = (age) => {
  if (!age) return 'Unknown';
  if (age >= 13 && age <= 17) return '13-17';
  if (age >= 18 && age <= 24) return '18-24';
  if (age >= 25 && age <= 34) return '25-34';
  if (age >= 35 && age <= 44) return '35-44';
  if (age >= 45 && age <= 54) return '45-54';
  if (age >= 55 && age <= 64) return '55-64';
  if (age >= 65) return '65+';
  return 'Unknown';
};

/**
 * Build demographic distributions from an array of attendee objects.
 * Returns { ageGroups, genderDistribution, locationDistribution, interestDistribution }
 */
const buildDemographics = (attendees) => {
  const ageGroups = { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0, Unknown: 0 };
  const genderDist = {};
  const locationDist = {};
  const interestDist = {};

  for (const a of attendees) {
    ageGroups[ageGroup(a.age)]++;
    const g = a.gender || 'prefer-not-to-say';
    genderDist[g] = (genderDist[g] || 0) + 1;
    if (a.city) {
      const loc = a.country ? `${a.city}, ${a.country}` : a.city;
      locationDist[loc] = (locationDist[loc] || 0) + 1;
    }
    if (a.interests && Array.isArray(a.interests)) {
      for (const i of a.interests) {
        interestDist[i] = (interestDist[i] || 0) + 1;
      }
    }
  }

  const topN = (obj, n = 10) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n);

  return {
    ageGroups: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
    genderDistribution: Object.entries(genderDist).map(([gender, count]) => ({ gender, count })),
    locationDistribution: topN(locationDist).map(([location, count]) => ({ location, count })),
    interestDistribution: topN(interestDist).map(([interest, count]) => ({ interest, count })),
  };
};

// ─── Core Queries ───────────────────────────────────────────────────

/**
 * Get attendee demographics across all events (or admin dashboard).
 */
exports.getGlobalDemographics = async () => {
  try {
    const attendees = await Ticket.aggregate([
      { $match: { status: { $in: ['booked', 'used'] } } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userData' } },
      { $unwind: '$userData' },
      { $project: { age: '$userData.age', city: '$userData.location.city', country: '$userData.location.country' } },
    ]);

    const ageGroups = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    attendees.forEach((a) => {
      if (a.age >= 18 && a.age <= 24) ageGroups['18-24']++;
      else if (a.age >= 25 && a.age <= 34) ageGroups['25-34']++;
      else if (a.age >= 35 && a.age <= 44) ageGroups['35-44']++;
      else if (a.age >= 45 && a.age <= 54) ageGroups['45-54']++;
      else if (a.age >= 55) ageGroups['55+']++;
    });

    const locationCounts = {};
    attendees.forEach((a) => {
      if (a.city) {
        const loc = a.country ? `${a.city}, ${a.country}` : a.city;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    });

    const locations = Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    return {
      ageGroups: Object.entries(ageGroups).map(([age, count]) => ({ age, count })),
      locations: locations.length > 0 ? locations : [{ city: 'No location data', count: attendees.length }],
    };
  } catch (error) {
    logger.error('Error getting demographics:', error);
    return { ageGroups: [{ age: '25-34', count: 0 }], locations: [{ city: 'No data', count: 0 }] };
  }
};

/**
 * Get top performing events by ticket revenue.
 */
exports.getTopPerformingEvents = async () => {
  try {
    const eventPerformance = await Ticket.aggregate([
      { $match: { status: { $in: ['booked', 'used'] } } },
      { $group: { _id: '$event', ticketsSold: { $sum: 1 }, totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } } } },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'eventData' } },
      { $unwind: '$eventData' },
      { $project: { name: '$eventData.title', tickets: '$ticketsSold', revenue: '$totalRevenue', attendees: '$ticketsSold' } },
      { $sort: { revenue: -1, tickets: -1 } },
      { $limit: 5 },
    ]);

    return eventPerformance.length > 0
      ? eventPerformance
      : [{ name: 'No events with sales', tickets: 0, revenue: 0, attendees: 0 }];
  } catch (error) {
    logger.error('Error getting top events:', error);
    return [{ name: 'Error loading events', tickets: 0, revenue: 0, attendees: 0 }];
  }
};

/**
 * Get dashboard overview numbers.
 */
exports.getDashboardOverview = async () => {
  const [totalEvents, activeEvents, totalTicketsSold, totalUsers] = await Promise.all([
    Event.countDocuments({}),
    Event.countDocuments({ status: 'published', date: { $gte: new Date() } }),
    Ticket.countDocuments({ status: { $in: ['booked', 'used'] } }),
    User.countDocuments({ role: 'user' }),
  ]);

  const revenueData = await Ticket.aggregate([
    { $match: { status: { $in: ['booked', 'used'] } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ['$payment.amount', 0] } },
        averageTicketPrice: { $avg: { $ifNull: ['$payment.amount', 0] } },
      },
    },
  ]);

  const revenue = revenueData[0] || { totalRevenue: 0, averageTicketPrice: 0 };

  return { totalEvents, activeEvents, totalTicketsSold, totalUsers, totalRevenue: revenue.totalRevenue, averageTicketPrice: revenue.averageTicketPrice };
};

/**
 * Monthly revenue trend (last N months).
 */
exports.getMonthlyRevenue = async (months = 6) => {
  return Ticket.aggregate([
    {
      $match: {
        status: { $in: ['booked', 'used'] },
        bookingDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - months)) },
      },
    },
    { $group: { _id: { year: { $year: '$bookingDate' }, month: { $month: '$bookingDate' } }, revenue: { $sum: { $ifNull: ['$payment.amount', 0] } }, tickets: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

/**
 * Event category distribution.
 */
exports.getCategoryDistribution = async () => {
  return Event.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Get attendee demographics filtered by organizer (and optionally by event).
 */
exports.getAttendeeDemographics = async (organizerId, eventId) => {
  const matchCondition = {
    'eventData.organizer': organizerId,
    status: { $in: ['booked', 'used'] },
  };
  if (eventId) {
    matchCondition['eventData._id'] = new mongoose.Types.ObjectId(eventId);
  }

  const attendeeData = await Ticket.aggregate([
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventData' } },
    { $unwind: '$eventData' },
    { $match: matchCondition },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userData' } },
    { $unwind: '$userData' },
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
            bookingDate: '$bookingDate',
          },
        },
      },
    },
  ]);

  return attendeeData[0]?.attendees || [];
};

/**
 * Get ticket statistics for a specific event.
 */
exports.getEventTicketStats = async (eventId) => {
  return Ticket.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$payment.amount' } } },
  ]);
};

/**
 * Get daily booking trend for a specific event (last 30 days).
 */
exports.getEventBookingTrend = async (eventId) => {
  return Ticket.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId), bookingDate: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } },
    { $group: { _id: { year: { $year: '$bookingDate' }, month: { $month: '$bookingDate' }, day: { $dayOfMonth: '$bookingDate' } }, bookings: { $sum: 1 }, revenue: { $sum: '$payment.amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);
};

// Re-export helper for use in controller
exports.buildDemographics = buildDemographics;
