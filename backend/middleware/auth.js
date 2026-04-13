const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const config = require('../config');

const getTokenFromRequest = (req) => {
  const headerToken = req.header('Authorization')?.match(/^Bearer\s+(\S+)/)?.[1];
  const cookieToken = req.cookies?.accessToken || req.cookies?.token;
  const token = headerToken || cookieToken;

  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }

  return token;
};

const validateStandardClaims = (decoded, expectedType) => {
  if (decoded?.type && decoded.type !== expectedType) {
    const error = new Error('Invalid token type.');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  if (decoded?.iss && decoded.iss !== config.security.jwt.issuer) {
    const error = new Error('Invalid token issuer.');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  if (decoded?.aud) {
    const audiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    if (!audiences.includes(config.security.jwt.audience)) {
      const error = new Error('Invalid token audience.');
      error.name = 'JsonWebTokenError';
      throw error;
    }
  }
};

const loadUserFromToken = async (req, { optional = false } = {}) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    if (optional) return null;
    return { error: { status: 401, message: 'Access denied. No token provided.' } };
  }

  try {
    const decoded = jwt.verify(token, config.secrets.jwt);
    validateStandardClaims(decoded, 'access');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      if (optional) return null;
      return { error: { status: 401, message: 'Token is not valid. User not found.' } };
    }

    if (!user.isActive) {
      if (optional) return null;
      return { error: { status: 401, message: 'Account is deactivated.' } };
    }

    if (user.isLocked) {
      if (optional) return null;
      return { error: { status: 423, message: 'Account is temporarily locked due to security reasons.' } };
    }

    if (decoded.sessionId) {
      const session = user.activeSessions?.find((entry) => entry.sessionId === decoded.sessionId);
      if (!session || session.revokedAt) {
        if (optional) return null;
        return { error: { status: 401, message: 'Session has been revoked. Please log in again.' } };
      }

      req.sessionId = decoded.sessionId;

      const now = Date.now();
      const debounceMs = 60 * 1000;
      if (!session.lastActivity || (now - new Date(session.lastActivity).getTime()) > debounceMs) {
        User.updateOne(
          { _id: user._id, 'activeSessions.sessionId': decoded.sessionId },
          { $set: { 'activeSessions.$.lastActivity': new Date() } },
        ).catch((error) => logger.error(`Session update error for user ${user._id} session ${decoded.sessionId}: ${error.message}`));
      }
    }

    req.user = user;
    return user;
  } catch (error) {
    logger.error('Authentication error:', error);
    if (optional) return null;

    if (error.name === 'JsonWebTokenError') {
      return { error: { status: 401, message: 'Invalid token.' } };
    }

    if (error.name === 'TokenExpiredError') {
      return { error: { status: 401, message: 'Token has expired.' } };
    }

    return { error: { status: 500, message: 'Server error during authentication.' } };
  }
};

const authenticate = async (req, res, next) => {
  const result = await loadUserFromToken(req);

  if (result?.error) {
    return res.status(result.error.status).json({
      success: false,
      message: result.error.message,
    });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  return next();
};

const requireAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = req.user._id.toString() === req.params.userId
    || req.user._id.toString() === req.params.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient privileges.',
    });
  }

  return next();
};

const requireOrganizer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Organizer privileges required.',
    });
  }

  return next();
};

const requireVenueAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'venue_admin' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Venue admin privileges required.',
    });
  }

  return next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of: ${roles.join(', ')}`,
    });
  }

  return next();
};

const optionalAuth = async (req, _res, next) => {
  await loadUserFromToken(req, { optional: true });
  return next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrOwner,
  requireOrganizer,
  requireVenueAdmin,
  requireRole,
  optionalAuth,
};
