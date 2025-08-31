const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'feature-request', 'bug-report'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],
  responses: [{
    message: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isStaff: Boolean,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  ticketNumber: {
    type: String
  }
}, {
  timestamps: true
});

// Generate ticket number before saving
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Index for efficient queries
supportTicketSchema.index({ userId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ ticketNumber: 1 }, { unique: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
