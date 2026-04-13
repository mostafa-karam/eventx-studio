// FIX C-02 — Database-backed Report model replaces in-memory reportsStore[]
// Prevents data loss on restart and unbounded memory growth (OOM)
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Report name is required'],
        maxlength: [200, 'Report name cannot be more than 200 characters']
    },
    type: {
        type: String,
        required: [true, 'Report type is required'],
        enum: ['events', 'tickets', 'revenue', 'attendees', 'summary']
    },
    status: {
        type: String,
        enum: ['generating', 'completed', 'failed'],
        default: 'generating'
    },
    fileSize: {
        type: String,
        default: null
    },
    downloadUrl: {
        type: String,
        default: null
    },
    parameters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Report generator is required']
    }
}, {
    timestamps: true
});

// Index for efficient queries by user and status
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', reportSchema);
