const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  cors: {
    credentials: true,
  },
  request: {
    jsonLimit: process.env.REQUEST_BODY_LIMIT || '10kb',
  },
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 200),
    authWindowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    bookingWindowMs: toInt(process.env.BOOKING_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
    loginMax: toInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 8),
    registerMax: toInt(process.env.AUTH_REGISTER_RATE_LIMIT_MAX, 6),
    passwordResetMax: toInt(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX, 5),
    refreshMax: toInt(process.env.AUTH_REFRESH_RATE_LIMIT_MAX, 10),
    paymentMax: toInt(process.env.PAYMENT_RATE_LIMIT_MAX, 10),
    bookingMax: toInt(process.env.BOOKING_RATE_LIMIT_MAX, 40),
    redisUrl: process.env.REDIS_URL || '',
    redisPrefix: process.env.REDIS_RATE_LIMIT_PREFIX || 'eventx:ratelimit:',
    // If true, production refuses to start without Redis configured for rate limiting.
    // This prevents silently falling back to per-instance memory limits in multi-replica deployments.
    requireRedisInProduction: String(process.env.RATE_LIMIT_REQUIRE_REDIS || '').toLowerCase() === 'true',
  },
  db: {
    // If true, critical write workflows fail closed when Mongo transactions are unavailable.
    // Defaults to true in production.
    requireTransactions: String(process.env.REQUIRE_DB_TRANSACTIONS || '').toLowerCase() === 'true'
      || isProduction,
  },
  jwt: {
    issuer: process.env.JWT_ISSUER || 'eventx-studio-api',
    audience: process.env.JWT_AUDIENCE || 'eventx-studio-client',
    accessExpiresIn: process.env.JWT_EXPIRE || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  },
  csrf: {
    tokenCookieName: isProduction ? '__Host-eventx-csrf' : 'eventx-csrf',
    sessionCookieName: isProduction ? '__Host-eventx-csrf-session' : 'eventx-csrf-session',
    secureCookie: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  },
};
