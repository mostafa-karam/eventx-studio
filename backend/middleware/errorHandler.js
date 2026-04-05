const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  // CSRF token errors from csrf-csrf
  if (err.message === 'invalid csrf token' || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  logger.error(`${err.statusCode || err.status || 500} — ${err.message} — ${req.originalUrl}`);

  const statusCode = err.statusCode || err.status || 500;

  // Only send detailed error messages for operational errors in non-production
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
};

module.exports = errorHandler;
