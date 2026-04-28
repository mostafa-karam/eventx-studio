const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const STRICT_REDIS_DOWN_STATUS = 503;
const FINGERPRINT_HEADER = 'x-device-fingerprint';
const redisStrictMode = config.env === 'production';
const emergencyBuckets = new Map();
const EMERGENCY_WINDOW_MS = 60 * 1000;
const EMERGENCY_MAX_REQUESTS = 10;

const normalizeEmail = (email) => {
  if (typeof email !== 'string') return 'anonymous';
  return email.trim().toLowerCase();
};

const getClientIp = (req) => String(req.ip || req.connection?.remoteAddress || 'unknown').trim();
const getIpSubnet = (ipRaw) => {
  const ip = String(ipRaw || '').replace('::ffff:', '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return `${parts.slice(0, 4).join(':')}::/64`;
  }
  return ip || 'unknown';
};
const getUserAgent = (req) => String(req.get('user-agent') || 'unknown').slice(0, 256);
const getDeviceFingerprint = (req) => String(req.get(FINGERPRINT_HEADER) || 'none').slice(0, 256);
const getUserId = (req) => req.user?._id?.toString?.() || 'anonymous';
const getEndpointScope = (req) => `${req.method}:${req.baseUrl || ''}${req.path || ''}`;

const hashRateKey = (parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex');

const compositeRateIdentity = (req) => {
  const ip = getClientIp(req);
  const ipSubnet = getIpSubnet(ip);
  const userId = getUserId(req);
  const userAgent = getUserAgent(req);
  const deviceFingerprint = getDeviceFingerprint(req);
  return {
    ip,
    ipSubnet,
    endpoint: getEndpointScope(req),
    userId,
    userAgent,
    deviceFingerprint,
    primaryHash: hashRateKey([ipSubnet, userId, getEndpointScope(req)]),
    telemetryHash: hashRateKey([ip, userAgent, deviceFingerprint]),
  };
};

let redisClient = null;
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

  // Create a NEW RedisStore instance for each limiter to avoid store reuse error
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: config.security.rateLimit.redisPrefix,
  });
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

  const allowEmergencyMode = String(process.env.RATE_LIMIT_EMERGENCY_MODE || 'true').toLowerCase() === 'true';
  if (!allowEmergencyMode) {
    return res.status(STRICT_REDIS_DOWN_STATUS).json({
      success: false,
      message: 'Service temporarily unavailable. Please retry shortly.',
    });
  }

  const emergencyKey = `${scope}:${getIpSubnet(getClientIp(req))}:${getUserId(req)}:${getEndpointScope(req)}`;
  const now = Date.now();
  const bucket = emergencyBuckets.get(emergencyKey) || { count: 0, windowStart: now };
  if ((now - bucket.windowStart) > EMERGENCY_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count += 1;
  emergencyBuckets.set(emergencyKey, bucket);
  if (bucket.count > EMERGENCY_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit temporarily tightened. Please retry shortly.',
    });
  }
  return next();
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
  // Build store fresh for each limiter to avoid store reuse error
  const store = buildStore();

  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    store,
    passOnStoreError: !strictRedis,
    keyGenerator: (req) => {
      const identity = compositeRateIdentity(req);
      const emailPart = withEmail ? normalizeEmail(req.body?.email) : 'none';
      trackSuspiciousPattern(req, scope);
      return `${scope}:${hashRateKey([identity.primaryHash, emailPart])}`;
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

/** POST /api/tickets/lookup-qr — authenticated brute-force / noisy trials */
const qrLookupLimiter = createLimiter({
  scope: 'tickets-qr-lookup',
  windowMs: config.security.rateLimit.qrLookupWindowMs,
  max: config.security.rateLimit.qrLookupMax,
  message: 'Too many QR lookup attempts. Please try again later.',
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
  qrLookupLimiter,
  createLimiter,
};
