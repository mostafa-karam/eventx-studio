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

// ---- TOTP verification (RFC-6238) ----
// We use this instead of `otplib` so Jest doesn't fail parsing otplib's ESM deps.
const base32Decode = (input) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input).toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    while (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotp = (secret, timeMs = Date.now(), stepSeconds = 30, digits = 6) => {
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(timeMs / (stepSeconds * 1000)));

  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[19] & 0x0f;
  const codeInt = (hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits);
  return String(codeInt).padStart(digits, '0');
};

const verifyTotpCode = (token, secret, { windowSteps = 1, stepSeconds = 30, digits = 6 } = {}) => {
  if (!token || !secret) return false;
  const expectedDigits = String(digits);
  const cleanToken = String(token).trim();

  if (!/^\d+$/.test(cleanToken)) return false;
  if (cleanToken.length !== digits) return false;
  if (!Number.isFinite(Number(expectedDigits))) return false;

  const now = Date.now();
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const timeMs = now + offset * stepSeconds * 1000;
    if (generateTotp(secret, timeMs, stepSeconds, digits) === cleanToken) return true;
  }

  return false;
};

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
  await user.save();

  sendVerificationEmail(user.email, verificationToken).catch((error) =>
    logger.error(`Failed to send verification email: ${error.message}`),
  );

  // IMPORTANT: Do NOT create a session or issue tokens until the user verifies email.
  // This prevents unverified accounts from receiving valid auth cookies.
  return { user, role: safeRole };
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

  const invalidCredentialsError = () => Object.assign(new Error('Invalid email or password'), { status: 401 });

  if (!user) {
    logger.warn('Failed login attempt for unknown user', { email: String(email).toLowerCase() });
    throw invalidCredentialsError();
  }

  if (user.isLocked) {
    logger.warn('Blocked login attempt on locked account', { userId: user._id, email: user.email });
    throw invalidCredentialsError();
  }

  if (!user.isActive) {
    logger.warn('Blocked login attempt on inactive account', { userId: user._id, email: user.email });
    throw invalidCredentialsError();
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    logger.warn('Failed login attempt due to invalid password', { userId: user._id, email: user.email });
    throw invalidCredentialsError();
  }

  if (!user.emailVerified) {
    logger.warn('Blocked login attempt on unverified account', { userId: user._id, email: user.email });
    throw invalidCredentialsError();
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return { twoFactorRequired: true, message: 'Two-factor authentication code required' };
    }

    const plainTwoFactorSecret = user.getTwoFactorSecret();
    const isValid = plainTwoFactorSecret
      ? verifyTotpCode(twoFactorCode, plainTwoFactorSecret)
      : false;
    if (!isValid) {
      logger.warn('Failed login attempt due to invalid 2FA code', { userId: user._id, email: user.email });
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

  // Enforce user state before rotating refresh/access tokens.
  // This prevents inactive/unverified accounts from using still-valid refresh tokens.
  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact support.');
    error.status = 403;
    throw error;
  }

  if (!user.emailVerified) {
    const error = new Error('Please verify your email address before logging in');
    error.status = 403;
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
