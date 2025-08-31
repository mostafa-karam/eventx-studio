const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token with session ID
const generateToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sessionId = sessionId;
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper function to get device info
const getDeviceInfo = (req) => {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();
  
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    device: result.device.model || 'Unknown',
    browser: `${result.browser.name} ${result.browser.version}`,
    os: `${result.os.name} ${result.os.version}`
  };
};

// Helper function to validate email domain
const isDisposableEmail = (email) => {
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org'
  ];
  const domain = email.split('@')[1];
  return disposableDomains.includes(domain);
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, age, gender, interests, location } = req.body;

    // Enhanced email validation
    if (isDisposableEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Disposable email addresses are not allowed'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Add timezone if not provided
    const userLocation = {
      ...location,
      timezone: location?.timezone || 'UTC'
    };

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'user',
      phone,
      age,
      gender,
      interests: interests || [],
      location: userLocation
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Generate session token
    const sessionId = crypto.randomUUID();
    const token = generateToken(user._id, sessionId);
    
    // Add session info
    const deviceInfo = getDeviceInfo(req);
    user.addSession(sessionId, deviceInfo);
    await user.save();

    // TODO: Send verification email (implement email service)
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: user.toJSON(),
        token,
        emailVerificationRequired: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Try again in ${lockTimeRemaining} minutes.`,
        lockTimeRemaining
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: Math.max(0, 5 - (user.loginAttempts + 1))
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Check if email is verified (optional enforcement)
    const emailVerificationRequired = !user.emailVerified && user.role === 'admin';
    
    // Update last login
    user.lastLogin = new Date();
    
    // Generate session token
    const sessionId = crypto.randomUUID();
    const token = generateToken(user._id, sessionId);
    
    // Add session info
    const deviceInfo = getDeviceInfo(req);
    user.addSession(sessionId, deviceInfo);
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
        lastLogin: user.lastLogin,
        emailVerificationRequired,
        sessionInfo: {
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, age, gender, interests, location } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (interests) user.interests = interests;
    if (location) user.location = { ...user.location, ...location };

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // TODO: Send verification email
    console.log(`New verification token for ${email}: ${verificationToken}`);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if password was recently used
    const wasRecentlyUsed = await user.isPasswordRecentlyUsed(password);
    if (wasRecentlyUsed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reuse a recently used password. Please choose a different password.'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// @route   GET /api/auth/sessions
// @desc    Get user's active sessions
// @access  Private
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activeSessions');
    
    const sessions = user.activeSessions.map(session => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionId
    }));

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/auth/sessions/:sessionId
// @desc    Remove a specific session
// @access  Private
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user._id);
    
    user.removeSession(sessionId);
    await user.save();

    res.json({
      success: true,
      message: 'Session removed successfully'
    });
  } catch (error) {
    console.error('Remove session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/auth/sessions
// @desc    Remove all sessions except current
// @access  Private
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Keep only current session
    user.activeSessions = user.activeSessions.filter(s => s.sessionId === req.sessionId);
    await user.save();

    res.json({
      success: true,
      message: 'All other sessions removed successfully'
    });
  } catch (error) {
    console.error('Remove all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

