/**
 * Centralized Authentication Utilities
 * 
 * Single source of truth for password validation, token generation,
 * cookie config, device info parsing, and audit logging.
 */

const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const AuditLog = require('../models/AuditLog');
const logger = require('./logger');
const config = require('../config');

// ─── Disposable Email Detection ──────────────────────────────────────
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com', 'temp-mail.org',
];

const isDisposableEmail = (email) =>
  DISPOSABLE_DOMAINS.includes(email.split('@')[1]);

// ─── Password Strength Validation ────────────────────────────────────
const validatePasswordStrength = (password) => {
  const errors = [];
  const commonPasswords = ['password', '123456', '12345678', 'qwerty', 'letmein', 'admin', 'welcome', 'monkey', 'dragon', 'football', 'iloveyou'];
  const lowerPassword = password.toLowerCase();

  if (password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/\?]/.test(password)) errors.push('At least one special character');
  if (/(.)\1\1/.test(password)) errors.push('No more than two repeated characters in a row');
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|7890|qwerty|asdf|zxcv/i.test(password)) {
    errors.push('Avoid sequential or predictable patterns');
  }
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    errors.push('Avoid common passwords or phrases');
  }
  return errors;
};

// ─── Token Generation ────────────────────────────────────────────────
const generateAccessToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sessionId = sessionId;
  return jwt.sign(payload, config.secrets.jwt, {
    expiresIn: config.jwt.accessExpire || '30m',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    config.secrets.jwtRefresh,
    { expiresIn: config.security.jwt.refreshExpiresIn || '30d' }
  );
};

// ─── Cookie Configuration ────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
};

const ACCESS_TOKEN_MAX_AGE = (() => {
  try {
    const exp = config.jwt.accessExpire || '30m';
    if (exp.endsWith('d')) return parseInt(exp) * 24 * 60 * 60 * 1000;
    if (exp.endsWith('h')) return parseInt(exp) * 60 * 60 * 1000;
    if (exp.endsWith('m')) return parseInt(exp) * 60 * 1000;
    return 30 * 60 * 1000; // default 30 minutes
  } catch {
    return 30 * 60 * 1000;
  }
})();

const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// ─── Audit Logging ───────────────────────────────────────────────────
const createAuditLog = async (req, actor, action, resource, resourceId, details = {}) => {
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

module.exports = {
  DISPOSABLE_DOMAINS,
  isDisposableEmail,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  getDeviceInfo,
  createAuditLog,
};
