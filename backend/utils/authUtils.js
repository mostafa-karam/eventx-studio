/**
 * Centralized authentication utilities.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Bowser = require('bowser');
const config = require('../config');

const DISPOSABLE_DOMAINS = [
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
];

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  path: '/',
  priority: 'high',
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  priority: 'high',
};

const parseDurationToMs = (duration, fallbackMs) => {
  if (typeof duration !== 'string') return fallbackMs;

  const match = duration.match(/^(\d+)([mhd])$/i);
  if (!match) return fallbackMs;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;

  return fallbackMs;
};

const ACCESS_TOKEN_MAX_AGE = parseDurationToMs(config.security.jwt.accessExpiresIn, 15 * 60 * 1000);
const REFRESH_TOKEN_MAX_AGE = parseDurationToMs(config.security.jwt.refreshExpiresIn, 30 * 24 * 60 * 60 * 1000);

const isDisposableEmail = (email = '') =>
  DISPOSABLE_DOMAINS.includes(String(email).split('@')[1]);

const validatePasswordStrength = (password = '') => {
  const errors = [];
  const commonPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'letmein',
    'admin',
    'welcome',
    'monkey',
    'dragon',
    'football',
    'iloveyou',
  ];
  const lowerPassword = password.toLowerCase();

  if (password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('At least one special character');
  if (/(.)\1\1/.test(password)) errors.push('No more than two repeated characters in a row');
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|7890|qwerty|asdf|zxcv/i.test(password)) {
    errors.push('Avoid sequential or predictable patterns');
  }
  if (commonPasswords.some((common) => lowerPassword.includes(common))) {
    errors.push('Avoid common passwords or phrases');
  }

  return errors;
};

const buildJwtClaims = (userId, sessionId, tokenType) => ({
  id: userId,
  sessionId,
  type: tokenType,
  jti: crypto.randomUUID(),
});

const generateAccessToken = (userId, sessionId) => jwt.sign(
  buildJwtClaims(userId, sessionId, 'access'),
  config.secrets.jwt,
  {
    expiresIn: config.security.jwt.accessExpiresIn,
    issuer: config.security.jwt.issuer,
    audience: config.security.jwt.audience,
    subject: String(userId),
  },
);

const generateRefreshToken = (userId, sessionId) => jwt.sign(
  buildJwtClaims(userId, sessionId, 'refresh'),
  config.secrets.jwtRefresh,
  {
    expiresIn: config.security.jwt.refreshExpiresIn,
    issuer: config.security.jwt.issuer,
    audience: config.security.jwt.audience,
    subject: String(userId),
  },
);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  let parsed = {};
  try {
    parsed = Bowser.parse(userAgent);
  } catch (_error) {
    parsed = {};
  }
  const platform = parsed.platform || {};
  const browser = parsed.browser || {};
  const os = parsed.os || {};

  return {
    userAgent,
    ipAddress: req.ip || req.connection?.remoteAddress,
    device: platform.type || 'Unknown',
    browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
    os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
  };
};

module.exports = {
  DISPOSABLE_DOMAINS,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  isDisposableEmail,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getDeviceInfo,
};
