/**
 * Authentication Service
 * Core business logic for user registration, login, and token management.
 */

const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const {
  validatePasswordStrength,
  isDisposableEmail,
  generateAccessToken,
  generateRefreshToken,
  getDeviceInfo,
} = require('../utils/authUtils');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ─── Register ────────────────────────────────────────────────────────
exports.registerUser = async (userData, deviceInfo) => {
  const { name, email, password, role } = userData;

  // 1 — Disposable email check
  if (isDisposableEmail(email)) {
    const err = new Error('Disposable email addresses are not allowed.');
    err.status = 400;
    throw err;
  }

  // 2 — Password strength
  const pwErrors = validatePasswordStrength(password);
  if (pwErrors.length > 0) {
    const err = new Error('Password does not meet requirements: ' + pwErrors.join(', '));
    err.status = 400;
    throw err;
  }

  // 3 — Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  // 4 — Only allow user role during self-registration; organizer access requires separate approval
  const allowedRoles = ['user'];
  const safeRole = allowedRoles.includes(role) ? role : 'user';

  // 5 — Create user
  const user = new User({ name, email: email.toLowerCase(), password, role: safeRole });

  // 6 — Email verification token
  const verificationToken = user.generateEmailVerificationToken();
  // 7 — Session tracking
  const sessionId = crypto.randomUUID();
  user.addSession(sessionId, deviceInfo);

  await user.save();

  // 8 — Generate tokens
  const accessToken = generateAccessToken(user._id, sessionId);
  const refreshToken = generateRefreshToken(user._id);

  // 9 — Store hashed refresh token
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  // 10 — Send verification email (fire-and-forget)
  sendVerificationEmail(user.email, verificationToken).catch(err =>
    logger.error('Failed to send verification email: ' + err.message)
  );

  return { user, accessToken, refreshToken, role: safeRole };
};

// ─── Login ───────────────────────────────────────────────────────────
exports.loginUser = async (email, password, twoFactorCode, deviceInfo) => {
  if (!email || !password) {
    const err = new Error('Please provide email and password');
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +loginAttempts +lockUntil +twoFactorSecret +twoFactorEnabled +refreshToken');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockTime = user.lockUntil ? Math.ceil((user.lockUntil - Date.now()) / 1000 / 60) : 0;
    const err = new Error('Account is temporarily locked due to too many failed login attempts');
    err.status = 423;
    err.lockTimeRemaining = lockTime;
    throw err;
  }

  // Check if account is active
  if (!user.isActive) {
    const err = new Error('Account is deactivated. Please contact support.');
    err.status = 403;
    throw err;
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    const remaining = Math.max(0, 5 - (user.loginAttempts + 1));
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.attemptsRemaining = remaining;
    throw err;
  }

  // Check email verification
  if (!user.emailVerified) {
    const err = new Error('Please verify your email address before logging in');
    err.status = 403;
    err.emailVerificationRequired = true;
    err.email = user.email;
    throw err;
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return { twoFactorRequired: true, message: 'Two-factor authentication code required' };
    }
    const { authenticator } = require('otplib');
    const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret);
    if (!isValid) {
      const err = new Error('Invalid 2FA code');
      err.status = 401;
      throw err;
    }
  }

  // Reset login attempts on success
  if (user.loginAttempts > 0) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
  }

  // Session management
  const sessionId = crypto.randomUUID();
  user.addSession(sessionId, deviceInfo);

  user.lastLogin = new Date();
  const accessToken = generateAccessToken(user._id, sessionId);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  return { user, accessToken, refreshToken };
};

// ─── Refresh Token ───────────────────────────────────────────────────
exports.processRefreshToken = async (incomingRefresh, deviceInfo) => {
  let decoded;
  try {
    decoded = jwt.verify(incomingRefresh, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpires');
  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    throw error;
  }

  // Verify stored token against incoming hash
  const hashedIncoming = crypto.createHash('sha256').update(incomingRefresh).digest('hex');
  if (user.refreshToken !== hashedIncoming) {
    // Possible token reuse — invalidate all sessions
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;
    user.activeSessions = [];
    await user.save();
    logger.warn(`Refresh token reuse detected for user ${user._id}`);
    const error = new Error('Token reuse detected. All sessions have been invalidated.');
    error.status = 401;
    throw error;
  }

  // Rotate tokens
  const sessionId = crypto.randomUUID();
  user.addSession(sessionId, deviceInfo);

  const newAccessToken = generateAccessToken(user._id, sessionId);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  return { newAccessToken, newRefreshToken, user };
};
