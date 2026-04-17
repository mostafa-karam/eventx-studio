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
    loginMax: toInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 8),
    registerMax: toInt(process.env.AUTH_REGISTER_RATE_LIMIT_MAX, 6),
    passwordResetMax: toInt(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX, 5),
    refreshMax: toInt(process.env.AUTH_REFRESH_RATE_LIMIT_MAX, 10),
    paymentMax: toInt(process.env.PAYMENT_RATE_LIMIT_MAX, 10),
    redisUrl: process.env.REDIS_URL || '',
    redisPrefix: process.env.REDIS_RATE_LIMIT_PREFIX || 'eventx:ratelimit:',
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
