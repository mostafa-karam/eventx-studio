const express = require('express');
const logger = require('../utils/logger');
const Review = require('../models/Review');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // uses :eventId from parent

// GET /api/events/:eventId/reviews
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [reviews, total, stats] = await Promise.all([
            Review.find({ event: eventId })
                .populate('user', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Review.countDocuments({ event: eventId }),
            Review.aggregate([
                { $match: { event: require('mongoose').Types.ObjectId ? new (require('mongoose').Types.ObjectId)(eventId) : eventId } },
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

        // Mark if current user has already reviewed
        let userReviewId = null;
        if (req.user) {
            const userReview = await Review.findOne({ event: eventId, user: req.user._id }).select('_id');
            userReviewId = userReview?._id;
        }

        res.json({
            success: true,
            data: {
                reviews,
                pagination: { current: page, pages: Math.ceil(total / limit), total },
                stats: { ...ratingStats, avgRating: Math.round(ratingStats.avgRating * 10) / 10 },
                userReviewId,
            },
        });
    } catch (error) {
        logger.error('Get reviews error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error while fetching reviews' });
    }
});

// POST /api/events/:eventId/reviews
router.post('/', authenticate, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, title, body } = req.body;

        if (!rating) {
            return res.status(400).json({ success: false, message: 'Rating is required' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Only allow reviews for past events
        if (event.date > new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot review an event that has not yet happened' });
        }

        // Check if user attended (has a booked/used ticket)
        const ticket = await Ticket.findOne({
            event: eventId,
            user: req.user._id,
            status: { $in: ['booked', 'used'] },
        });

        const review = new Review({
            event: eventId,
            user: req.user._id,
            rating: Number(rating),
            title: title || '',
            body: body || '',
            attendedVerified: !!ticket,
        });

        await review.save();
        await review.populate('user', 'name avatar');

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: { review },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this event' });
        }
        logger.error('Create review error: ' + error.message);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
        }
        res.status(500).json({ success: false, message: 'Server error while creating review' });
    }
});

// PUT /api/events/:eventId/reviews/:reviewId
router.put('/:reviewId', authenticate, async (req, res) => {
    try {
        const { eventId, reviewId } = req.params;
        const { rating, title, body } = req.body;

        const review = await Review.findOne({ _id: reviewId, event: eventId });
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this review' });
        }

        if (rating !== undefined) review.rating = Number(rating);
        if (title !== undefined) review.title = title;
        if (body !== undefined) review.body = body;

        await review.save();
        await review.populate('user', 'name avatar');

        res.json({ success: true, message: 'Review updated', data: { review } });
    } catch (error) {
        logger.error('Update review error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error while updating review' });
    }
});

// DELETE /api/events/:eventId/reviews/:reviewId
router.delete('/:reviewId', authenticate, async (req, res) => {
    try {
        const { eventId, reviewId } = req.params;
        const review = await Review.findOne({ _id: reviewId, event: eventId });
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
        }

        await review.deleteOne();
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        logger.error('Delete review error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error while deleting review' });
    }
});

module.exports = router;
