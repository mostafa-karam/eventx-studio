/**
 * Halls Service
 *
 * Encapsulates all hall-related database operations.
 * Controllers should delegate to this service instead of
 * querying Mongoose models directly.
 */

const Hall = require('../models/Hall');
const HallBooking = require('../models/HallBooking');
const { escapeRegex } = require('../utils/helpers');

class HallsService {
  /**
   * Build a query object from filters and user role.
   */
  buildQuery(queryParams, user) {
    const query = {};

    if (queryParams.ids) {
      query._id = { $in: queryParams.ids.split(',') };
    }

    // Status filtering — non-privileged users always see only active halls
    if (queryParams.status) {
      if (user && (user.role === 'admin' || user.role === 'venue_admin')) {
        query.status = queryParams.status;
      } else {
        query.status = 'active';
      }
    } else if (!user || (user.role !== 'admin' && user.role !== 'venue_admin')) {
      query.status = 'active';
    }

    if (queryParams.minCapacity || queryParams.maxCapacity) {
      query.capacity = {};
      if (queryParams.minCapacity) query.capacity.$gte = parseInt(queryParams.minCapacity);
      if (queryParams.maxCapacity) query.capacity.$lte = parseInt(queryParams.maxCapacity);
    }

    if (queryParams.equipment) {
      query.equipment = { $all: queryParams.equipment.split(',') };
    }

    if (queryParams.search) {
      query.name = { $regex: escapeRegex(queryParams.search), $options: 'i' };
    }

    return query;
  }

  /**
   * Get sort object from sort parameter.
   */
  getSortObject(sortParam) {
    if (sortParam === 'capacity-asc') return { capacity: 1 };
    if (sortParam === 'capacity-desc') return { capacity: -1 };
    if (sortParam === 'price-asc') return { hourlyRate: 1 };
    if (sortParam === 'price-desc') return { hourlyRate: -1 };
    if (sortParam === 'newest') return { createdAt: -1 };
    return { name: 1 };
  }

  /**
   * Get paginated list of halls.
   */
  async getHalls(queryParams, user) {
    const page = parseInt(queryParams.page) || 1;
    const limit = Math.min(parseInt(queryParams.limit) || 12, 100);
    const skip = (page - 1) * limit;

    const query = this.buildQuery(queryParams, user);
    const sort = this.getSortObject(queryParams.sort);

    const [halls, total] = await Promise.all([
      Hall.find(query)
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Hall.countDocuments(query),
    ]);

    return {
      halls,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
    };
  }

  /**
   * Get a single hall by ID.
   */
  async getHallById(hallId) {
    const hall = await Hall.findById(hallId).populate('createdBy', 'name email');
    if (!hall) throw Object.assign(new Error('Hall not found'), { status: 404 });
    return hall;
  }

  /**
   * Get hall availability for a date range.
   */
  async getHallAvailability(hallId, { from, to } = {}) {
    const hall = await Hall.findById(hallId);
    if (!hall) throw Object.assign(new Error('Hall not found'), { status: 404 });

    const startDate = from ? new Date(from) : new Date();
    const endDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookings = await HallBooking.find({
      hall: hallId,
      status: 'approved',
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    })
      .populate('organizer', 'name')
      .populate('event', 'title')
      .select('startDate endDate organizer event status')
      .sort({ startDate: 1 });

    return {
      hall: { _id: hall._id, name: hall.name, capacity: hall.capacity, status: hall.status },
      bookings,
      dateRange: { from: startDate, to: endDate },
    };
  }

  /**
   * Create a new hall.
   */
  async createHall(hallData, creatorId) {
    const hall = new Hall({ ...hallData, createdBy: creatorId });
    await hall.save();
    return Hall.findById(hall._id).populate('createdBy', 'name email');
  }

  /**
   * Update a hall by ID.
   */
  async updateHall(hallId, updateData) {
    const hall = await Hall.findById(hallId);
    if (!hall) throw Object.assign(new Error('Hall not found'), { status: 404 });

    const allowedFields = [
      'name', 'description', 'capacity', 'equipment', 'hourlyRate',
      'dailyRate', 'images', 'status', 'location', 'amenities', 'rules',
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) hall[field] = updateData[field];
    });

    await hall.save();
    return Hall.findById(hall._id).populate('createdBy', 'name email');
  }

  /**
   * Delete a hall by ID (only if no active bookings).
   */
  async deleteHall(hallId) {
    const hall = await Hall.findById(hallId);
    if (!hall) throw Object.assign(new Error('Hall not found'), { status: 404 });

    const activeBookings = await HallBooking.countDocuments({
      hall: hallId,
      status: { $in: ['pending', 'approved'] },
      endDate: { $gt: new Date() },
    });

    if (activeBookings > 0) {
      throw Object.assign(
        new Error(`Cannot delete hall with ${activeBookings} active/pending booking(s). Cancel them first.`),
        { status: 400 }
      );
    }

    await Hall.findByIdAndDelete(hallId);
    return true;
  }
}

module.exports = new HallsService();
