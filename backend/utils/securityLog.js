const logger = require('./logger');

const nowIso = () => new Date().toISOString();

const baseFromReq = (req) => ({
  timestamp: nowIso(),
  requestId: req?.id,
  userId: req?.user?._id?.toString?.(),
  ip: req?.ip,
  endpoint: req?.originalUrl,
  method: req?.method,
});

/**
 * Structured security event logging.
 *
 * Keep payloads intentionally small and avoid sensitive values (tokens, passwords).
 */
const logSecurityEvent = (req, event, details = {}, level = 'warn') => {
  const safeDetails = details && typeof details === 'object' ? details : { detail: String(details) };

  logger[level]('security_event', {
    event,
    ...baseFromReq(req),
    ...safeDetails,
  });
};

module.exports = {
  logSecurityEvent,
};

