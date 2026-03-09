const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    body: {
        type: String,
        trim: true,
        maxlength: [1000, 'Review body cannot exceed 1000 characters'],
    },
    attendedVerified: {
        type: Boolean,
        default: false,
    },
    // Organizer reply
    reply: {
        body: { type: String, trim: true, maxlength: [500, 'Reply cannot exceed 500 characters'] },
        repliedAt: { type: Date },
    },
    // Soft-delete timestamp — used to enforce 24h re-review cooldown
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
});

// One review per user per event
reviewSchema.index({ event: 1, user: 1 }, { unique: true });
reviewSchema.index({ event: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
