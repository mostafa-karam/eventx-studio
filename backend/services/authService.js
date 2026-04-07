/**
 * Authentication Service
 * Core business logic for user registration, login, and token management.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const config = require('../config');
const {
  validatePasswordStrength,
  isDisposableEmail,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_MAX_AGE,
} = require('../utils/authUtils');

const REFRESH_SECRET = config.secrets.jwtRefresh;

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    if (decoded?.type && decoded.type !== 'refresh') {
      const error = new Error('Invalid refresh token type');
      error.status = 401;
      throw error;
    }

    if (decoded?.iss && decoded.iss !== config.security.jwt.issuer) {
      const error = new Error('Invalid refresh token issuer');
      error.status = 401;
      throw error;
    }

    if (decoded?.aud) {
      const audiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
      if (!audiences.includes(config.security.jwt.audience)) {
        const error = new Error('Invalid refresh token audience');
        error.status = 401;
        throw error;
      }
    }

    if (!decoded?.sessionId) {
      const error = new Error('Invalid refresh token session');
      error.status = 401;
      throw error;
    }

    return decoded;
  } catch (error) {
    const authError = new Error('Invalid or expired refresh token');
    authError.status = 401;
    throw authError;
  }
};

const attachRefreshTokenToSession = (user, sessionId, refreshToken) => {
  const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

  user.setSessionRefreshToken(sessionId, hashToken(refreshToken), refreshTokenExpiry);
  user.refreshToken = hashToken(refreshToken);
  user.refreshTokenExpires = refreshTokenExpiry;
};

const rotateSessionTokens = (user, sessionId) => {
  const accessToken = generateAccessToken(user._id, sessionId);
  const refreshToken = generateRefreshToken(user._id, sessionId);

  attachRefreshTokenToSession(user, sessionId, refreshToken);

  return { accessToken, refreshToken };
};

// Register
exports.registerUser = async (userData, deviceInfo) => {
  const { name, email, password, role } = userData;

  if (isDisposableEmail(email)) {
    const error = new Error('Disposable email addresses are not allowed.');
    error.status = 400;
    throw error;
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    const error = new Error(`Password does not meet requirements: ${passwordErrors.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.status = 409;
    throw error;
  }

  const allowedRoles = ['user'];
  const safeRole = allowedRoles.includes(role) ? role : 'user';

  const user = new User({
    name,
    email: email.toLowerCase(),
    password,
    role: safeRole,
  });

  const verificationToken = user.generateEmailVerificationToken();
  const sessionId = crypto.randomUUID();
  user.addSession(sessionId, deviceInfo);

  const { accessToken, refreshToken } = rotateSessionTokens(user, sessionId);
  await user.save();

  sendVerificationEmail(user.email, verificationToken).catch((error) =>
    logger.error(`Failed to send verification email: ${error.message}`),
  );

  return { user, accessToken, refreshToken, role: safeRole, sessionId };
};

// Login
exports.loginUser = async (email, password, twoFactorCode, deviceInfo) => {
  if (!email || !password) {
    const error = new Error('Please provide email and password');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +loginAttempts +lockUntil +twoFactorSecret +twoFactorEnabled +refreshToken');

  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (user.isLocked) {
    const lockTime = user.lockUntil ? Math.ceil((user.lockUntil - Date.now()) / 1000 / 60) : 0;
    const error = new Error('Account is temporarily locked due to too many failed login attempts');
    error.status = 423;
    error.lockTimeRemaining = lockTime;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact support.');
    error.status = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    const remaining = Math.max(0, 5 - (user.loginAttempts + 1));
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.attemptsRemaining = remaining;
    throw error;
  }

  if (!user.emailVerified) {
    const error = new Error('Please verify your email address before logging in');
    error.status = 403;
    error.emailVerificationRequired = true;
    error.email = user.email;
    throw error;
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return { twoFactorRequired: true, message: 'Two-factor authentication code required' };
    }

    const { authenticator } = require('otplib');
    const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret);
    if (!isValid) {
      const error = new Error('Invalid 2FA code');
      error.status = 401;
      throw error;
    }
  }

  if (user.loginAttempts > 0) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
  }

  const sessionId = crypto.randomUUID();
  user.addSession(sessionId, deviceInfo);
  user.lastLogin = new Date();

  const { accessToken, refreshToken } = rotateSessionTokens(user, sessionId);
  await user.save();

  return { user, accessToken, refreshToken, sessionId };
};

// Refresh token
exports.processRefreshToken = async (incomingRefresh, deviceInfo) => {
  const decoded = verifyRefreshToken(incomingRefresh);

  const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpires +activeSessions.refreshTokenHash');
  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    throw error;
  }

  const sessionId = decoded.sessionId;
  const session = user.getSession(sessionId);
  if (!session || session.revokedAt) {
    const error = new Error('Session has expired or been revoked');
    error.status = 401;
    throw error;
  }

  const hashedIncoming = hashToken(incomingRefresh);
  if (!session.refreshTokenHash || session.refreshTokenHash !== hashedIncoming) {
    user.clearSessionRefreshToken(sessionId);
    user.removeSession(sessionId);
    await user.save();

    logger.warn(`Refresh token reuse detected for user ${user._id} on session ${sessionId}`);

    const error = new Error('Refresh token reuse detected. The session has been revoked.');
    error.status = 401;
    throw error;
  }

  if (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt <= new Date()) {
    user.clearSessionRefreshToken(sessionId);
    user.removeSession(sessionId);
    await user.save();

    const error = new Error('Refresh token has expired');
    error.status = 401;
    throw error;
  }

  session.deviceInfo = deviceInfo;
  session.ipAddress = deviceInfo?.ipAddress || deviceInfo?.ip;
  session.lastActivity = new Date();

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = rotateSessionTokens(user, sessionId);
  await user.save();

  return {
    newAccessToken,
    newRefreshToken,
    user,
    sessionId,
  };
};
