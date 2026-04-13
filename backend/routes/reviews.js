const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, optionalAuth } = require('../middleware/auth');
const {
    getReviews,
    createReview,
    updateReview,
    deleteReview,
    replyToReview,
} = require('../controllers/reviewsController');

const router = express.Router({ mergeParams: true }); // uses :eventId from parent

// GET /api/events/:eventId/reviews
router.get('/', optionalAuth, asyncHandler(getReviews));

// POST /api/events/:eventId/reviews
router.post('/', authenticate, asyncHandler(createReview));

// PUT /api/events/:eventId/reviews/:reviewId
router.put('/:reviewId', authenticate, asyncHandler(updateReview));

// DELETE /api/events/:eventId/reviews/:reviewId
router.delete('/:reviewId', authenticate, asyncHandler(deleteReview));

// PATCH /api/events/:eventId/reviews/:reviewId/reply  (organizer/admin only)
router.patch('/:reviewId/reply', authenticate, asyncHandler(replyToReview));

module.exports = router;
