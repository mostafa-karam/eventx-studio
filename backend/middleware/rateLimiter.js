const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const ipKeyGenerator = rateLimit.ipKeyGenerator || ((req) => req.ip);

const getTestKeyOverride = (req) =>
  config.env === 'test' ? req.headers['x-test-rate-limit-key'] : undefined;

const normalizeEmail = (email) => {
  if (typeof email !== 'string') return 'anonymous';
  return email.trim().toLowerCase();
};

const resolveKey = (req, resolver) => {
  const override = getTestKeyOverride(req);
  if (override) return String(override);

  return resolver(req);
};

const defaultHandler = (message) => (req, res, _next, options) => {
  logger.warn('Rate limit exceeded', {
    route: req.originalUrl,
    method: req.method,
    limiter: message,
    ipAddress: req.ip,
  });

  res.status(options.statusCode).json({
    success: false,
    data: null,
    error: message,
    message,
    retryAfter: Number(res.getHeader('Retry-After')) || undefined,
  });
};

let redisClient = null;
let redisStore = null;
let redisUnavailableLogged = false;

const buildStore = () => {
  const redisUrl = config.security.rateLimit.redisUrl;
  if (!redisUrl) return undefined;

  try {
    if (!redisClient) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
      });

      redisClient.on('error', (error) => {
        if (!redisUnavailableLogged) {
          logger.warn(`Redis rate limiter unavailable, using in-memory fallback: ${error.message}`);
          redisUnavailableLogged = true;
        }
      });
      redisClient.on('ready', () => {
        redisUnavailableLogged = false;
      });
    }

    if (!redisStore) {
      redisStore = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: config.security.rateLimit.redisPrefix,
      });
    }
    return redisStore;
  } catch (error) {
    logger.warn(`Failed to initialize Redis rate limiter, using memory fallback: ${error.message}`);
    return undefined;
  }
};

const createLimiter = ({
  windowMs,
  max,
  message,
  keyGenerator,
  skipSuccessfulRequests = false,
  skipFailedRequests = false,
}) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests,
  skipFailedRequests,
  store: buildStore(),
  keyGenerator,
  handler: defaultHandler(message),
});

const globalLimiter = createLimiter({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => resolveKey(req, (currentReq) => `global:${ipKeyGenerator(currentReq)}`),
});

const loginLimiter = createLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.loginMax,
  message: 'Too many failed login attempts. Please try again later.',
  skipSuccessfulRequests: true,
  keyGenerator: (req) => resolveKey(
    req,
    (currentReq) => `auth:login:${ipKeyGenerator(currentReq)}:${normalizeEmail(currentReq.body?.email)}`,
  ),
});

const registerLimiter = createLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.registerMax,
  message: 'Too many registration attempts. Please try again later.',
  keyGenerator: (req) => resolveKey(
    req,
    (currentReq) => `auth:register:${ipKeyGenerator(currentReq)}:${normalizeEmail(currentReq.body?.email)}`,
  ),
});

const passwordResetLimiter = createLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.passwordResetMax,
  message: 'Too many password reset attempts. Please try again later.',
  keyGenerator: (req) => resolveKey(
    req,
    (currentReq) => `auth:password-reset:${ipKeyGenerator(currentReq)}:${normalizeEmail(currentReq.body?.email)}`,
  ),
});

const refreshTokenLimiter = createLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.refreshMax,
  message: 'Too many token refresh attempts. Please try again later.',
  keyGenerator: (req) => resolveKey(req, (currentReq) => {
    const incomingToken = currentReq.body?.refreshToken || currentReq.cookies?.refreshToken;

    if (incomingToken) {
      try {
        const decoded = jwt.decode(incomingToken);
        if (decoded?.sessionId) {
          return `auth:refresh:${decoded.sessionId}`;
        }
        if (decoded?.id) {
          return `auth:refresh:${decoded.id}`;
        }
      } catch (error) {
        logger.warn(`Failed to decode refresh token for rate limiting: ${error.message}`);
      }
    }

    return `auth:refresh:${ipKeyGenerator(currentReq)}`;
  }),
});

const paymentLimiter = createLimiter({
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.paymentMax,
  message: 'Too many payment requests. Please try again later.',
  keyGenerator: (req) => resolveKey(
    req,
    (currentReq) => `payment:${currentReq.user?._id?.toString() || ipKeyGenerator(currentReq)}`,
  ),
});

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshTokenLimiter,
  paymentLimiter,
  createLimiter,
};
