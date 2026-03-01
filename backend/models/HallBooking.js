const mongoose = require('mongoose');

const hallBookingSchema = new mongoose.Schema({
    hall: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hall',
        required: [true, 'Hall is required']
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Organizer is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    totalCost: {
        type: Number,
        min: [0, 'Total cost cannot be negative'],
        default: 0
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot be more than 500 characters']
    },
    rejectionReason: {
        type: String,
        maxlength: [500, 'Rejection reason cannot be more than 500 characters']
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Pre-save: check for booking conflicts (only for approved bookings)
hallBookingSchema.pre('save', async function (next) {
    // Only check conflicts when approving a booking
    if (this.isModified('status') && this.status === 'approved') {
        const conflicting = await mongoose.model('HallBooking').findOne({
            hall: this.hall,
            _id: { $ne: this._id },
            status: 'approved',
            $or: [
                {
                    startDate: { $lt: this.endDate },
                    endDate: { $gt: this.startDate }
                }
            ]
        });

        if (conflicting) {
            const error = new Error('Hall is already booked for the selected time period');
            error.name = 'ConflictError';
            return next(error);
        }
    }
    next();
});

// Indexes for efficient queries
hallBookingSchema.index({ hall: 1, startDate: 1, endDate: 1 });
hallBookingSchema.index({ organizer: 1, status: 1 });
hallBookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HallBooking', hallBookingSchema);
