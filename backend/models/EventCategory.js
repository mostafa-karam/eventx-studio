const mongoose = require('mongoose');

const eventCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  emoji: {
    type: String,
    default: '📅'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eventCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
eventCategorySchema.index({ name: 1 }, { unique: true });
eventCategorySchema.index({ isActive: 1 });

module.exports = mongoose.model('EventCategory', eventCategorySchema);
