const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['conference', 'workshop', 'seminar', 'concert', 'sports', 'exhibition', 'networking', 'other'],
    default: 'other'
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function (value) {
        // Enforce future date on create, or when date is being changed
        if (this.isNew) return value > new Date();
        if (this.isModified('date')) return value > new Date();
        return true;
      },
      message: 'Event date must be in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !value || value > this.date;
      },
      message: 'End date must be after start date'
    }
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Venue address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: String,
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Venue capacity is required'],
      min: [1, 'Capacity must be at least 1']
    }
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (value) {
          // If event is paid, price must be greater than 0
          if (this.pricing && this.pricing.type === 'paid') {
            return value > 0;
          }
          return true;
        },
        message: 'Paid events must have a price greater than 0'
      }
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  seating: {
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Total seats must be at least 1']
    },
    availableSeats: {
      type: Number,
      required: true
    },
    seatMap: [{
      seatNumber: String,
      isBooked: {
        type: Boolean,
        default: false
      },
      bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  images: [{
    url: String,
    alt: String
  }],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  requirements: {
    ageLimit: {
      min: Number,
      max: Number
    },
    specialRequirements: [String]
  },
  socialMedia: {
    website: String,
    facebook: String,
    twitter: String,
    instagram: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware to initialize available seats
eventSchema.pre('save', function (next) {
  if (this.isNew) {
    // Only set availableSeats to totalSeats if availableSeats is not explicitly set
    if (this.seating.availableSeats === undefined || this.seating.availableSeats === null) {
      this.seating.availableSeats = this.seating.totalSeats;
    }

    // Ensure availableSeats doesn't exceed totalSeats
    if (this.seating.availableSeats > this.seating.totalSeats) {
      this.seating.availableSeats = this.seating.totalSeats;
    }

    // Initialize seat map if not provided
    if (!this.seating.seatMap || this.seating.seatMap.length === 0) {
      this.seating.seatMap = [];
      for (let i = 1; i <= this.seating.totalSeats; i++) {
        this.seating.seatMap.push({
          seatNumber: `S${i.toString().padStart(3, '0')}`,
          isBooked: false
        });
      }
    }
  }
  next();
});

// Method to book a seat
eventSchema.methods.bookSeat = function (seatNumber, userId) {
  const seat = this.seating.seatMap.find(s => s.seatNumber === seatNumber);
  if (!seat) {
    throw new Error('Seat not found');
  }
  if (seat.isBooked) {
    throw new Error('Seat is already booked');
  }

  seat.isBooked = true;
  seat.bookedBy = userId;
  this.seating.availableSeats -= 1;
  this.analytics.bookings += 1;

  if (this.pricing.type === 'paid') {
    this.analytics.revenue += this.pricing.amount;
  }

  return seat;
};

// Method to cancel seat booking
eventSchema.methods.cancelSeat = function (seatNumber) {
  const seat = this.seating.seatMap.find(s => s.seatNumber === seatNumber);
  if (!seat) {
    throw new Error('Seat not found');
  }
  if (!seat.isBooked) {
    throw new Error('Seat is not booked');
  }

  seat.isBooked = false;
  seat.bookedBy = null;
  this.seating.availableSeats += 1;
  this.analytics.bookings -= 1;

  if (this.pricing.type === 'paid') {
    this.analytics.revenue -= this.pricing.amount;
  }

  return seat;
};

// Index for better query performance
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);

