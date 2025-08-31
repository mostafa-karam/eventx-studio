const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'social', 'push'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'paused'],
    default: 'draft'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  eventName: {
    type: String
  },
  subject: {
    type: String
  },
  content: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'registered', 'potential', 'vip', 'custom'],
    default: 'all'
  },
  scheduledAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  metrics: {
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    }
  },
  settings: {
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    allowUnsubscribe: {
      type: Boolean,
      default: true
    }
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
campaignSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
campaignSchema.index({ eventId: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
