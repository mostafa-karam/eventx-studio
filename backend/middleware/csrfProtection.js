const crypto = require('crypto');
const { doubleCsrf } = require('csrf-csrf');
const config = require('../config');

const csrfSecret = process.env.CSRF_SECRET || config.secrets.jwt;
const {
  tokenCookieName,
  sessionCookieName,
  secureCookie,
  sameSite,
} = config.security.csrf;

const sessionCookieOptions = {
  httpOnly: true,
  secure: secureCookie,
  sameSite,
  path: '/',
  signed: true,
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const resolveSessionId = (req, res) => {
  const existingSessionId = req.csrfSessionId
    || req.signedCookies?.[sessionCookieName]
    || req.cookies?.[sessionCookieName];

  if (existingSessionId) {
    req.csrfSessionId = existingSessionId;
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();
  req.csrfSessionId = newSessionId;
  res.cookie(sessionCookieName, newSessionId, sessionCookieOptions);
  return newSessionId;
};

const shouldSkipCsrfProtection = (req) => {
  const hasBearerAuth = /^Bearer\s+/i.test(req.headers.authorization || '');
  const hasSessionCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  const isAuthRoute = req.originalUrl.startsWith('/api/auth');

  if (hasSessionCookie) return false;
  if (hasBearerAuth) return true;
  return !isAuthRoute;
};

const {
  doubleCsrfProtection,
  generateCsrfToken,
} = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.csrfSessionId
    || req.signedCookies?.[sessionCookieName]
    || req.cookies?.[sessionCookieName]
    || req.ip
    || 'anonymous',
  cookieName: tokenCookieName,
  cookieOptions: {
    httpOnly: true,
    secure: secureCookie,
    sameSite,
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  skipCsrfProtection: shouldSkipCsrfProtection,
  errorConfig: {
    statusCode: 403,
    message: 'Invalid or missing CSRF token',
    code: 'EBADCSRFTOKEN',
  },
});

const attachCsrfSession = (req, res, next) => {
  resolveSessionId(req, res);
  next();
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || shouldSkipCsrfProtection(req)) {
    return next();
  }

  resolveSessionId(req, res);
  return doubleCsrfProtection(req, res, next);
};

const issueCsrfToken = (req, res, options = {}) => {
  resolveSessionId(req, res);
  return generateCsrfToken(req, res, options);
};

module.exports = {
  attachCsrfSession,
  csrfProtection,
  issueCsrfToken,
  shouldSkipCsrfProtection,
  sessionCookieName,
  tokenCookieName,
};
