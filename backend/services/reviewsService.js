/**
 * Reviews Service
 *
 * Encapsulates all review-related database operations.
 * Controllers should delegate to this service instead of
 * querying Mongoose models directly.
 */

const mongoose = require('mongoose');
const Review = require('../models/Review');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

class ReviewsService {
  /**
   * Get reviews for an event with stats and pagination.
   */
  async getReviews(eventId, { page = 1, limit = 10, userId } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      Review.find({ event: eventId, deletedAt: null })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ event: eventId, deletedAt: null }),
      Review.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId), deletedAt: null } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const ratingStats = stats[0] || { avgRating: 0, totalReviews: 0 };

    let userReviewId = null;
    if (userId) {
      const userReview = await Review.findOne({ event: eventId, user: userId, deletedAt: null }).select('_id');
      userReviewId = userReview?._id;
    }

    return {
      reviews,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
      stats: { ...ratingStats, avgRating: Math.round(ratingStats.avgRating * 10) / 10 },
      userReviewId,
    };
  }

  /**
   * Create a review for an event.
   */
  async createReview(eventId, userId, { rating, title, body }) {
    if (!rating) throw Object.assign(new Error('Rating is required'), { status: 400 });

    const event = await Event.findById(eventId);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

    if (event.date > new Date()) {
      throw Object.assign(new Error('Cannot review an event that has not yet happened'), { status: 400 });
    }

    const ticket = await Ticket.findOne({
      event: eventId,
      user: userId,
      status: { $in: ['booked', 'used'] },
    });

    if (!ticket) {
      throw Object.assign(
        new Error('Only attendees with a ticket for this event may submit a review'),
        { status: 403 },
      );
    }

    // Enforce 24-hour cooldown after deletion to prevent delete/repost abuse.
    const previousReview = await Review.findOne({ event: eventId, user: userId })
      .sort({ createdAt: -1 })
      .select('deletedAt createdAt');
    if (previousReview?.deletedAt) {
      const cooldownUntil = new Date(previousReview.deletedAt.getTime() + 24 * 60 * 60 * 1000);
      if (cooldownUntil > new Date()) {
        throw Object.assign(new Error('You must wait 24 hours after deleting a review before creating a new one'), { status: 400 });
      }
    }

    const review = new Review({
      event: eventId,
      user: userId,
      rating: Number(rating),
      title: title || '',
      body: body || '',
      attendedVerified: true,
    });

    await review.save();
    await review.populate('user', 'name avatar');
    return review;
  }

  /**
   * Update a review.
   */
  async updateReview(eventId, reviewId, user, { rating, title, body }) {
    const review = await Review.findOne({ _id: reviewId, event: eventId, deletedAt: null });
    if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });

    if (review.user.toString() !== user._id.toString() && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to edit this review'), { status: 403 });
    }

    if (rating !== undefined) review.rating = Number(rating);
    if (title !== undefined) review.title = title;
    if (body !== undefined) review.body = body;

    await review.save();
    await review.populate('user', 'name avatar');
    return review;
  }

  /**
   * Soft-delete a review with 24h cooldown.
   */
  async deleteReview(eventId, reviewId, user) {
    const review = await Review.findOne({ _id: reviewId, event: eventId });
    if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });

    if (review.user.toString() !== user._id.toString() && user.role !== 'admin') {
      throw Object.assign(new Error('Not authorized to delete this review'), { status: 403 });
    }

    review.deletedAt = new Date();
    await review.save();
    return true;
  }

  /**
   * Organizer reply to a review.
   */
  async replyToReview(eventId, reviewId, user, replyBody) {
    if (!replyBody || !replyBody.trim()) {
      throw Object.assign(new Error('Reply body is required'), { status: 400 });
    }

    const review = await Review.findOne({ _id: reviewId, event: eventId, deletedAt: null })
      .populate('event', 'organizer');
    if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });

    const isOrganizer = review.event?.organizer?.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOrganizer && !isAdmin) {
      throw Object.assign(new Error('Only the event organizer can reply to this review'), { status: 403 });
    }

    review.reply = { body: replyBody.trim(), repliedAt: new Date() };
    await review.save();
    return review;
  }
}

module.exports = new ReviewsService();
