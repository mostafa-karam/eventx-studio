const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    min: [13, 'Age must be at least 13'],
    max: [120, 'Age must be less than 120']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  interests: [{
    type: String,
    trim: true
  }],
  location: {
    city: String,
    state: String,
    country: String,
    timezone: String
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Security enhancements
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordHistory: [{
    password: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  // Session management
  activeSessions: [{
    sessionId: String,
    deviceInfo: {
      userAgent: String,
      ip: String,
      device: String,
      browser: String,
      os: String
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Store password in history before hashing new one
    if (this.password && !this.isNew) {
      const currentPassword = await this.constructor.findById(this._id).select('+password');
      if (currentPassword && currentPassword.password) {
        this.passwordHistory = this.passwordHistory || [];
        this.passwordHistory.push({
          password: currentPassword.password,
          createdAt: new Date()
        });
        // Keep only last 5 passwords
        if (this.passwordHistory.length > 5) {
          this.passwordHistory = this.passwordHistory.slice(-5);
        }
      }
    }
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Check if password was used recently
userSchema.methods.isPasswordRecentlyUsed = async function(password) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) return false;
  
  for (const oldPassword of this.passwordHistory) {
    const isMatch = await bcrypt.compare(password, oldPassword.password);
    if (isMatch) return true;
  }
  return false;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

// Add session
userSchema.methods.addSession = function(sessionId, deviceInfo) {
  this.activeSessions = this.activeSessions || [];
  
  // Remove existing session with same sessionId
  this.activeSessions = this.activeSessions.filter(s => s.sessionId !== sessionId);
  
  // Add new session
  this.activeSessions.push({
    sessionId,
    deviceInfo,
    lastActivity: new Date(),
    createdAt: new Date()
  });
  
  // Keep only last 10 sessions
  if (this.activeSessions.length > 10) {
    this.activeSessions = this.activeSessions.slice(-10);
  }
};

// Remove session
userSchema.methods.removeSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(s => s.sessionId !== sessionId);
};

// Update session activity
userSchema.methods.updateSessionActivity = function(sessionId) {
  const session = this.activeSessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
};

// Get user without sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordHistory;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.twoFactorSecret;
  delete userObject.activeSessions;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

