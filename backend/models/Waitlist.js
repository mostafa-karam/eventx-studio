const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'notified', 'purchased', 'expired', 'cancelled'],
        default: 'pending'
    },
    notifiedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, { timestamps: true });

// Prevent duplicate pending entries for same user and event
waitlistSchema.index({ event: 1, user: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('Waitlist', waitlistSchema);
