const rateLimit = require('express-rate-limit');
const ipKeyGenerator = rateLimit.ipKeyGenerator || ((req) => req.ip);

const jwt = require('jsonwebtoken');

// Global rate limiter — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth routes — 15 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for password reset — 5 requests per 15 minutes
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Refresh token limiter - 5 requests per 15 minutes, keyed by user ID
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many token refresh attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Try to extract user ID from the refresh token
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          return decoded.id; // Key by user ID
        }
      } catch (e) {
        // Ignore decoding errors here
      }
    }
    // Fallback to an IPv6-safe request key generator
    return ipKeyGenerator(req);
  }
});

// Payment token limiter - 10 requests per 15 minutes, keyed by user ID
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // payment routes use authenticate middleware, so req.user exists
    return req.user ? req.user._id.toString() : ipKeyGenerator(req);
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  refreshTokenLimiter,
  paymentLimiter
};
