const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const UAParser = require('ua-parser-js');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Token Helpers ───────────────────────────────────────────────────
const generateAccessToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sessionId = sessionId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: '30d',
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

const accessTokenMaxAge = (() => {
  try {
    const exp = process.env.JWT_EXPIRE || '7d';
    // crude parse for days
    if (exp.endsWith('d')) return parseInt(exp) * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
  } catch { return 7 * 24 * 60 * 60 * 1000; }
})();

const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000;

// ─── Password Strength ───────────────────────────────────────────────
const validatePasswordStrength = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('At least one special character');
  return errors;
};

// ─── Device Info ─────────────────────────────────────────────────────
const getDeviceInfo = (req) => {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
    device: result.device.model || 'Unknown',
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
  };
};

// ─── Audit Helper ────────────────────────────────────────────────────
const audit = async (req, actor, action, resource, resourceId, details = {}) => {
  try {
    await AuditLog.create({
      actor: actor._id || actor,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      resource,
      resourceId,
      details,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    logger.error('Audit log error: ' + err.message);
  }
};

// ─── Disposable Email Block ───────────────────────────────────────────
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com', 'temp-mail.org',
];
const isDisposableEmail = (email) => DISPOSABLE_DOMAINS.includes(email.split('@')[1]);

// ─── Routes ──────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, age, gender, interests, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ success: false, message: 'Disposable email addresses are not allowed' });
    }

    // Password strength
    const pwErrors = validatePasswordStrength(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'Password is too weak', errors: pwErrors });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const allowedRoles = ['user', 'organizer'];
    const safeRole = allowedRoles.includes(role) ? role : 'user';

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: safeRole,
      phone,
      age,
      gender,
      interests: interests || [],
      location: { ...location, timezone: location?.timezone || 'UTC' },
    });

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, verificationToken);

    const sessionId = crypto.randomUUID();
    const accessToken = generateAccessToken(user._id, sessionId);
    const refreshToken = generateRefreshToken(user._id);

    user.addSession(sessionId, getDeviceInfo(req));
    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
    await user.save();

    audit(req, user, 'user.create', 'User', user._id, { role: safeRole });

    // Set httpOnly cookies for tokens
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: accessTokenMaxAge });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: refreshTokenMaxAge });

    res.status(201).json({
      success: true,
      message: 'Registered successfully. Please verify your email (check your inbox or the dev email log).',
      data: { user: user.toJSON(), emailVerificationRequired: true },
    });
  } catch (error) {
    logger.error('Registration error: ' + error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +twoFactorSecret');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${lockTimeRemaining} minutes.`, lockTimeRemaining });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: Math.max(0, 5 - (user.loginAttempts + 1)),
      });
    }

    // Email verification — required for all roles
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox (or the dev email log).',
        emailVerificationRequired: true,
        email: user.email,
      });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ success: true, twoFactorRequired: true, message: 'Please provide your 2FA code.' });
      }
      const { authenticator } = require('otplib');
      const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid 2FA code.' });
      }
    }

    if (user.loginAttempts > 0) await user.resetLoginAttempts();

    user.lastLogin = new Date();
    const sessionId = crypto.randomUUID();
    const accessToken = generateAccessToken(user._id, sessionId);
    const refreshToken = generateRefreshToken(user._id);
    const deviceInfo = getDeviceInfo(req);

    user.addSession(sessionId, deviceInfo);
    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
    await user.save();

    audit(req, user, 'auth.login', 'Auth', user._id, { device: deviceInfo.device });

    // Set httpOnly cookies
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: accessTokenMaxAge });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: refreshTokenMaxAge });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        lastLogin: user.lastLogin,
        sessionInfo: { device: deviceInfo.device, browser: deviceInfo.browser, os: deviceInfo.os },
      },
    });
  } catch (error) {
    logger.error('Login error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// POST /api/auth/refresh — get new access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    // Support reading refresh token from httpOnly cookie
    const incomingRefresh = req.body.refreshToken || req.cookies?.refreshToken;
    if (!incomingRefresh) return res.status(400).json({ success: false, message: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(incomingRefresh, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const hashedToken = crypto.createHash('sha256').update(incomingRefresh).digest('hex');
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: hashedToken,
      refreshTokenExpires: { $gt: Date.now() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Refresh token is no longer valid' });
    }

    const sessionId = crypto.randomUUID();
    const newAccessToken = generateAccessToken(user._id, sessionId);
    const newRefreshToken = generateRefreshToken(user._id);

    user.addSession(sessionId, getDeviceInfo(req));
    user.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
    await user.save();

    // Set cookies
    res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: accessTokenMaxAge });
    res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: refreshTokenMaxAge });

    res.json({ success: true, data: { message: 'Token refreshed' } });
  } catch (error) {
    logger.error('Refresh token error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Clear refresh token server-side
    const user = await User.findById(req.user._id).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      user.refreshTokenExpires = undefined;
      await user.save();
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    logger.error('Logout error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, age, gender, interests, location } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (age !== undefined) user.age = age;
    if (gender) user.gender = gender;
    if (interests) user.interests = interests;
    if (location) user.location = { ...user.location.toObject?.() || user.location, ...location };
    await user.save();
    res.json({ success: true, message: 'Profile updated successfully', data: { user: user.toJSON() } });
  } catch (error) {
    logger.error('Update profile error: ' + error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    const pwErrors = validatePasswordStrength(newPassword);
    if (pwErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'New password is too weak', errors: pwErrors });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const recentlyUsed = await user.isPasswordRecentlyUsed(newPassword);
    if (recentlyUsed) return res.status(400).json({ success: false, message: 'Cannot reuse a recently used password' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpires: { $gt: Date.now() } });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    logger.error('Email verification error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'If the account exists, a verification email has been sent.' });
    if (user.emailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();
    sendVerificationEmail(user.email, verificationToken);

    res.json({ success: true, message: 'Verification email sent. Check your inbox (or the dev email log).' });
  } catch (error) {
    logger.error('Resend verification error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    // Always return success to prevent email enumeration
    if (!email) return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const resetToken = user.generatePasswordResetToken();
      await user.save();
      sendPasswordResetEmail(user.email, resetToken);
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' });

    const pwErrors = validatePasswordStrength(password);
    if (pwErrors.length > 0) return res.status(400).json({ success: false, message: 'Password is too weak', errors: pwErrors });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } }).select('+password');

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    const recentlyUsed = await user.isPasswordRecentlyUsed(password);
    if (recentlyUsed) return res.status(400).json({ success: false, message: 'Cannot reuse a recently used password' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    audit(req, user, 'auth.password_reset', 'Auth', user._id);
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
});

// ─── 2FA Routes ───────────────────────────────────────────────────────

// POST /api/auth/2fa/setup — generate secret + QR code URL
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const { authenticator } = require('otplib');
    const qrcode = require('qrcode');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(req.user.email, 'EventX Studio', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Store secret temporarily (not enabled yet until verified)
    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });

    res.json({ success: true, data: { secret, qrCodeDataUrl } });
  } catch (error) {
    logger.error('2FA setup error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to set up 2FA' });
  }
});

// POST /api/auth/2fa/enable — verify code then enable 2FA
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '2FA code is required' });

    const { authenticator } = require('otplib');
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: 'Please call /2fa/setup first' });

    const isValid = authenticator.check(code, user.twoFactorSecret);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid 2FA code' });

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('2FA enable error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// DELETE /api/auth/2fa — disable 2FA
router.delete('/2fa', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(400).json({ success: false, message: 'Password is incorrect' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ success: true, message: '2FA disabled' });
  } catch (error) {
    logger.error('2FA disable error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// ─── Session Routes ───────────────────────────────────────────────────

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activeSessions');
    const sessions = user.activeSessions.map(s => ({
      sessionId: s.sessionId,
      deviceInfo: s.deviceInfo,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt,
      isCurrent: s.sessionId === req.sessionId,
    }));
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.removeSession(req.params.sessionId);
    await user.save();
    res.json({ success: true, message: 'Session removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.activeSessions = user.activeSessions.filter(s => s.sessionId === req.sessionId);
    await user.save();
    res.json({ success: true, message: 'All other sessions removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/users (Admin)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find().select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await User.countDocuments();
    res.json({ success: true, data: { users, pagination: { current: page, pages: Math.ceil(total / limit), total } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Role Upgrade Request ─────────────────────────────────────────────

// POST /api/auth/role-upgrade — user requests organizer role
router.post('/role-upgrade', authenticate, async (req, res) => {
  try {
    const { reason, organizationName } = req.body;
    if (req.user.role !== 'user') {
      return res.status(400).json({ success: false, message: 'Only regular users can request role upgrades' });
    }
    // Store upgrade request in user document
    await User.findByIdAndUpdate(req.user._id, {
      roleUpgradeRequest: { reason, organizationName, requestedAt: new Date(), status: 'pending' },
    });
    res.json({ success: true, message: 'Role upgrade request submitted. An admin will review it shortly.' });
  } catch (error) {
    logger.error('Role upgrade request error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/role-upgrade-requests (Admin)
router.get('/role-upgrade-requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ 'roleUpgradeRequest.status': 'pending' }).select('name email roleUpgradeRequest createdAt');
    res.json({ success: true, data: { requests: users } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/role-upgrade-requests/:userId (Admin approve/deny)
router.put('/role-upgrade-requests/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' | 'deny'
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (action === 'approve') {
      user.role = 'organizer';
      user.roleUpgradeRequest.status = 'approved';
      audit(req, req.user, 'auth.role_upgrade_approve', 'User', user._id, { newRole: 'organizer' });
    } else {
      user.roleUpgradeRequest.status = 'denied';
    }
    await user.save();
    res.json({ success: true, message: `Request ${action}d successfully` });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
