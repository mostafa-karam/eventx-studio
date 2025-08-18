const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    default: () => `TKT-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  seatNumber: {
    type: String,
    required: [true, 'Seat number is required']
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['booked', 'cancelled', 'used', 'expired'],
    default: 'booked'
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'free'],
      default: 'free'
    },
    transactionId: String,
    paymentDate: Date
  },
  qrCode: {
    type: String,
    required: true
  },
  checkIn: {
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: Date,
    checkInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate QR code data
ticketSchema.pre('save', function(next) {
  if (this.isNew) {
    // QR code will contain ticket verification data
    const qrData = {
      ticketId: this.ticketId,
      eventId: this.event,
      userId: this.user,
      seatNumber: this.seatNumber,
      timestamp: Date.now()
    };
    this.qrCode = JSON.stringify(qrData);
  }
  next();
});

// Method to check in ticket
ticketSchema.methods.performCheckIn = function(checkedInBy) {
  if (this.checkIn.isCheckedIn) {
    throw new Error('Ticket is already checked in');
  }
  if (this.status !== 'booked') {
    throw new Error('Ticket is not in valid status for check-in');
  }
  
  this.checkIn.isCheckedIn = true;
  this.checkIn.checkInTime = new Date();
  this.checkIn.checkInBy = checkedInBy;
  this.status = 'used';
  
  return this;
};

// Method to cancel ticket
ticketSchema.methods.cancel = function() {
  if (this.status === 'used') {
    throw new Error('Cannot cancel a used ticket');
  }
  if (this.checkIn.isCheckedIn) {
    throw new Error('Cannot cancel a checked-in ticket');
  }
  
  this.status = 'cancelled';
  return this;
};

// Virtual for formatted ticket ID
ticketSchema.virtual('formattedTicketId').get(function() {
  return this.ticketId;
});

// Index for better query performance
ticketSchema.index({ event: 1, user: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ bookingDate: -1 });

// Compound index for user's tickets
ticketSchema.index({ user: 1, status: 1, bookingDate: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);

