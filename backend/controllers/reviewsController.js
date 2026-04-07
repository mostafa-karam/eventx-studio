const logger = require('../utils/logger');
const reviewsService = require('../services/reviewsService');

// @desc    Get reviews for an event
// @access  Public (Optional Auth)
exports.getReviews = async (req, res) => {
    try {
        const result = await reviewsService.getReviews(req.params.eventId, {
            page: req.query.page,
            limit: req.query.limit,
            userId: req.user?._id,
        });
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get reviews error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error while fetching reviews' });
    }
};

// @desc    Create a review for an event
// @access  Private
exports.createReview = async (req, res) => {
    try {
        const review = await reviewsService.createReview(req.params.eventId, req.user._id, req.body);
        res.status(201).json({ success: true, message: 'Review submitted successfully', data: { review } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this event' });
        }
        logger.error('Create review error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
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
        const review = await reviewsService.updateReview(req.params.eventId, req.params.reviewId, req.user, req.body);
        res.json({ success: true, message: 'Review updated', data: { review } });
    } catch (error) {
        logger.error('Update review error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while updating review' });
    }
};

// @desc    Delete a review (soft delete with 24h cooldown)
// @access  Private
exports.deleteReview = async (req, res) => {
    try {
        await reviewsService.deleteReview(req.params.eventId, req.params.reviewId, req.user);
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        logger.error('Delete review error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while deleting review' });
    }
};

// @desc    Organizer reply to a review
// @access  Private (organizer or admin)
exports.replyToReview = async (req, res) => {
    try {
        const review = await reviewsService.replyToReview(req.params.eventId, req.params.reviewId, req.user, req.body.body);
        res.json({ success: true, message: 'Reply posted', data: { review } });
    } catch (error) {
        logger.error('Reply to review error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
