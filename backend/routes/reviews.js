const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
    getReviews,
    createReview,
    updateReview,
    deleteReview
} = require('../controllers/reviewsController');

const router = express.Router({ mergeParams: true }); // uses :eventId from parent

// GET /api/events/:eventId/reviews
router.get('/', optionalAuth, getReviews);

// POST /api/events/:eventId/reviews
router.post('/', authenticate, createReview);

// PUT /api/events/:eventId/reviews/:reviewId
router.put('/:reviewId', authenticate, updateReview);

// DELETE /api/events/:eventId/reviews/:reviewId
router.delete('/:reviewId', authenticate, deleteReview);

module.exports = router;
