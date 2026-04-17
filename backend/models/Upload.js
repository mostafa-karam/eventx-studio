const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    filename: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    originalName: {
        type: String,
        required: true,
        trim: true,
    },
    mimeType: {
        type: String,
        required: true,
        trim: true,
    },
    size: {
        type: Number,
        required: true,
        min: 0,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

module.exports = mongoose.model('Upload', uploadSchema);
