const Review = require('../models/Review');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// @desc    Get reviews for an event
// @access  Public (Optional Auth)
exports.getReviews = async (req, res) => {
    try {
        const { eventId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
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

        // Mark if current user has already reviewed
        let userReviewId = null;
        if (req.user) {
            const userReview = await Review.findOne({ event: eventId, user: req.user._id, deletedAt: null }).select('_id');
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
};

// @desc    Create a review for an event
// @access  Private
exports.createReview = async (req, res) => {
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
};

// @desc    Update a review
// @access  Private
exports.updateReview = async (req, res) => {
    try {
        const { eventId, reviewId } = req.params;
        const { rating, title, body } = req.body;

        const review = await Review.findOne({ _id: reviewId, event: eventId, deletedAt: null });
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
};

// @desc    Delete a review (soft delete with 24h cooldown)
// @access  Private
exports.deleteReview = async (req, res) => {
    try {
        const { eventId, reviewId } = req.params;
        const review = await Review.findOne({ _id: reviewId, event: eventId });
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
        }

        // Soft-delete: stamp deletedAt so user must wait 24h before re-reviewing
        review.deletedAt = new Date();
        await review.save();
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        logger.error('Delete review error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error while deleting review' });
    }
};

// @desc    Organizer reply to a review
// @access  Private (organizer or admin)
exports.replyToReview = async (req, res) => {
    try {
        const { eventId, reviewId } = req.params;
        const { body } = req.body;

        if (!body || !body.trim()) {
            return res.status(400).json({ success: false, message: 'Reply body is required' });
        }

        const review = await Review.findOne({ _id: reviewId, event: eventId, deletedAt: null })
            .populate('event', 'organizer');
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        // Only the event organizer or admin can reply
        const isOrganizer = review.event?.organizer?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only the event organizer can reply to this review' });
        }

        review.reply = { body: body.trim(), repliedAt: new Date() };
        await review.save();

        res.json({ success: true, message: 'Reply posted', data: { review } });
    } catch (error) {
        logger.error('Reply to review error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
