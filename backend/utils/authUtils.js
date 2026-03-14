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
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('At least one special character');
  return errors;
};

// ─── Token Generation ────────────────────────────────────────────────
const generateAccessToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sessionId = sessionId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30m',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );
};

// ─── Cookie Configuration ────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const ACCESS_TOKEN_MAX_AGE = (() => {
  try {
    const exp = process.env.JWT_EXPIRE || '30m';
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
