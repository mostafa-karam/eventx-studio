const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const ipKeyGenerator = rateLimit.ipKeyGenerator || ((req) => req.ip);
const STRICT_REDIS_DOWN_STATUS = 503;
const FINGERPRINT_HEADER = 'x-device-fingerprint';
const redisStrictMode = config.env === 'production';

const normalizeEmail = (email) => {
  if (typeof email !== 'string') return 'anonymous';
  return email.trim().toLowerCase();
};

const getClientIp = (req) => ipKeyGenerator(req);
const getUserAgent = (req) => String(req.get('user-agent') || 'unknown').slice(0, 256);
const getDeviceFingerprint = (req) => String(req.get(FINGERPRINT_HEADER) || 'none').slice(0, 256);
const getUserId = (req) => req.user?._id?.toString?.() || 'anonymous';

const hashRateKey = (parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex');

const compositeRateIdentity = (req) => {
  const ip = getClientIp(req);
  const userId = getUserId(req);
  const userAgent = getUserAgent(req);
  const deviceFingerprint = getDeviceFingerprint(req);
  return {
    ip,
    userId,
    userAgent,
    deviceFingerprint,
    hash: hashRateKey([ip, userId, userAgent, deviceFingerprint]),
  };
};

let redisClient = null;
let redisStore = null;
let redisUnavailableLogged = false;
let redisReady = false;

const buildStore = () => {
  const redisUrl = config.security.rateLimit.redisUrl;
  if (!redisUrl) {
    if (config.env === 'production') {
      throw new Error('REDIS_URL is required for rate limiting');
    }
    logger.warn('Redis URL missing for rate limiter; using in-memory store in non-production');
    return undefined;
  }

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (error) => {
      redisReady = false;
      if (!redisUnavailableLogged) {
        logger.error(`Redis rate limiter unavailable: ${error.message}`);
        redisUnavailableLogged = true;
      }
    });
    redisClient.on('ready', () => {
      redisReady = true;
      redisUnavailableLogged = false;
    });
    redisClient.on('end', () => {
      redisReady = false;
    });
  }

  if (!redisStore) {
    redisStore = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: config.security.rateLimit.redisPrefix,
    });
  }

  return redisStore;
};

const trackSuspiciousPattern = (req, scope) => {
  if (!redisClient || !redisReady) return;
  const userId = getUserId(req);
  const ip = getClientIp(req);
  if (userId === 'anonymous') return;

  const multiIpKey = `${config.security.rateLimit.redisPrefix}suspicious:user_ips:${scope}:${userId}`;
  const burstKey = `${config.security.rateLimit.redisPrefix}suspicious:burst:${scope}:${userId}`;

  redisClient
    .multi()
    .sadd(multiIpKey, ip)
    .expire(multiIpKey, 5 * 60)
    .incr(burstKey)
    .expire(burstKey, 60)
    .exec()
    .then((result) => {
      const cardinality = Number(result?.[0]?.[1] || 0);
      const burst = Number(result?.[2]?.[1] || 0);
      if (cardinality >= 4) {
        logger.warn('security_event', {
          event: 'rate_limit.multi_ip_same_user',
          userId,
          endpoint: req.originalUrl,
          ip,
          distinctIps: cardinality,
          requestId: req.id,
        });
      }
      if (burst >= 25) {
        logger.warn('security_event', {
          event: 'rate_limit.burst_activity',
          userId,
          endpoint: req.originalUrl,
          ip,
          burstRequestsPerMinute: burst,
          requestId: req.id,
        });
      }
    })
    .catch((error) => {
      logger.error(`Suspicious-pattern tracking failed: ${error.message}`);
    });
};

const ensureRedisAvailable = (scope) => (req, res, next) => {
  if (!redisStrictMode) return next();
  if (redisReady) return next();

  logger.error('security_event', {
    event: 'rate_limit.redis_down_block',
    scope,
    endpoint: req.originalUrl,
    ip: getClientIp(req),
    userId: getUserId(req),
    requestId: req.id,
  });

  return res.status(STRICT_REDIS_DOWN_STATUS).json({
    success: false,
    message: 'Service temporarily unavailable. Please retry shortly.',
  });
};

const defaultHandler = (message) => (req, res, _next, options) => {
  trackSuspiciousPattern(req, 'limit-exceeded');
  logger.warn('security_event', {
    event: 'rate_limit.exceeded',
    timestamp: new Date().toISOString(),
    route: req.originalUrl,
    endpoint: req.originalUrl,
    method: req.method,
    limiter: message,
    userId: req.user?._id?.toString?.(),
    ip: getClientIp(req),
    requestId: req.id,
  });

  res.status(options.statusCode).json({
    success: false,
    data: null,
    error: message,
    message,
    retryAfter: Number(res.getHeader('Retry-After')) || undefined,
  });
};

const createLimiter = ({
  scope,
  windowMs,
  max,
  message,
  withEmail = false,
  skipSuccessfulRequests = false,
  skipFailedRequests = false,
  strictRedis = false,
}) => {
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    store: buildStore(),
    passOnStoreError: false,
    keyGenerator: (req) => {
      const identity = compositeRateIdentity(req);
      const emailPart = withEmail ? normalizeEmail(req.body?.email) : 'none';
      trackSuspiciousPattern(req, scope);
      return `${scope}:${hashRateKey([identity.hash, emailPart])}`;
    },
    handler: defaultHandler(message),
  });

  if (!strictRedis) return limiter;
  return (req, res, next) => ensureRedisAvailable(scope)(req, res, () => limiter(req, res, next));
};

const globalLimiter = createLimiter({
  scope: 'global',
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: 'Too many requests, please try again later.',
});

const loginLimiter = createLimiter({
  scope: 'auth-login',
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.loginMax,
  message: 'Too many failed login attempts. Please try again later.',
  withEmail: true,
  skipSuccessfulRequests: true,
  strictRedis: true,
});

const registerLimiter = createLimiter({
  scope: 'auth-register',
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.registerMax,
  message: 'Too many registration attempts. Please try again later.',
  withEmail: true,
  strictRedis: true,
});

const passwordResetLimiter = createLimiter({
  scope: 'auth-password-reset',
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.passwordResetMax,
  message: 'Too many password reset attempts. Please try again later.',
  withEmail: true,
  strictRedis: true,
});

const refreshTokenLimiter = createLimiter({
  scope: 'auth-refresh',
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.refreshMax,
  message: 'Too many token refresh attempts. Please try again later.',
  strictRedis: true,
});

const paymentLimiter = createLimiter({
  scope: 'payment',
  windowMs: config.security.rateLimit.authWindowMs,
  max: config.security.rateLimit.paymentMax,
  message: 'Too many payment requests. Please try again later.',
  strictRedis: true,
});

const bookingLimiter = createLimiter({
  scope: 'booking',
  windowMs: config.security.rateLimit.bookingWindowMs,
  max: config.security.rateLimit.bookingMax,
  message: 'Too many booking requests. Please try again later.',
  strictRedis: true,
});

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshTokenLimiter,
  paymentLimiter,
  bookingLimiter,
  createLimiter,
};
