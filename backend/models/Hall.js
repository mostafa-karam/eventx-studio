const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hall name is required'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1']
    },
    equipment: [{
        type: String,
        trim: true,
        enum: [
            'projector', 'screen', 'sound_system', 'microphone', 'wifi',
            'stage', 'lighting', 'air_conditioning', 'whiteboard',
            'video_conferencing', 'recording_equipment', 'catering_area'
        ]
    }],
    hourlyRate: {
        type: Number,
        required: [true, 'Hourly rate is required'],
        min: [0, 'Hourly rate cannot be negative']
    },
    dailyRate: {
        type: Number,
        min: [0, 'Daily rate cannot be negative']
    },
    images: [{
        url: String,
        alt: String
    }],
    status: {
        type: String,
        enum: ['active', 'maintenance', 'retired'],
        default: 'active'
    },
    location: {
        floor: {
            type: String,
            trim: true
        },
        wing: {
            type: String,
            trim: true
        },
        mapUrl: String
    },
    amenities: [{
        type: String,
        trim: true
    }],
    rules: [{
        type: String,
        trim: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
hallSchema.index({ name: 1 }, { unique: true });
hallSchema.index({ capacity: 1, status: 1 });
hallSchema.index({ status: 1 });

module.exports = mongoose.model('Hall', hallSchema);
