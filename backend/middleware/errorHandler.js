const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global Error Handler
 *
 * SECURITY (Phase 1.6):
 * - Never leaks stack traces to the client in production.
 * - Logs full stack traces server-side mapped to request IDs.
 * - Returns a generic message for 500 errors in production.
 */
const errorHandler = (err, req, res, _next) => {
  // CSRF token errors from csrf-csrf
  if (err.message === 'invalid csrf token' || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or missing CSRF token',
      requestId: req.id
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = config.env === 'production';

  // Log the full error on the server side mapped to the request ID
  logger.error(
    `[${req.id || 'NO-ID'}] ${statusCode} — ${err.message} — ${req.method} ${req.originalUrl}\n${err.stack}`
  );

  // Default to a generic error message
  let displayMessage = 'An unexpected error occurred. Please try again later.';

  // If it's a known operational error or a client error (4xx) or we are in development, show the real message
  if (!isProduction || statusCode < 500 || err.isOperational) {
    displayMessage = err.message;
  }

  const responsePayload = {
    success: false,
    message: displayMessage,
    requestId: req.id, // Provide request ID so users can report it to support
  };

  // Attach stack traces only in development
  if (!isProduction && config.env !== 'test') {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
