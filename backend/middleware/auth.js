const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Support Authorization header OR httpOnly cookie named `accessToken`
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to security reasons.'
      });
    }

    // Add session ID to request if present
    if (decoded.sessionId) {
      req.sessionId = decoded.sessionId;

      // Debounced session activity update: only save if last activity > 60s ago
      const session = user.activeSessions?.find(s => s.sessionId === decoded.sessionId);
      const now = Date.now();
      const DEBOUNCE_MS = 60 * 1000;
      if (!session || !session.lastActivity || (now - new Date(session.lastActivity).getTime()) > DEBOUNCE_MS) {
        // Run updateOne asynchronously to avoid blocking the API request and bypassing heavy pre-save hooks
        User.updateOne(
          { _id: user._id, 'activeSessions.sessionId': decoded.sessionId },
          { $set: { 'activeSessions.$.lastActivity': new Date() } }
        ).catch(err => logger.error('Session update error:', err));
      }
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Middleware to check if user is admin or accessing their own data
const requireAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = req.user._id.toString() === req.params.userId ||
    req.user._id.toString() === req.params.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient privileges.'
    });
  }

  next();
};

// Middleware to check if user is an organizer (or admin)
const requireOrganizer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Organizer privileges required.'
    });
  }

  next();
};

// Middleware to check if user is a venue admin (or admin)
const requireVenueAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'venue_admin' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Venue admin privileges required.'
    });
  }

  next();
};

// Generic role-check factory — accepts array of allowed roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;
    const token = headerToken || cookieToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        if (decoded.sessionId) {
          req.sessionId = decoded.sessionId;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrOwner,
  requireOrganizer,
  requireVenueAdmin,
  requireRole,
  optionalAuth
};

