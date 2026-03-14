/**
 * Audit Service
 * 
 * Single writer to the AuditLog collection.
 * Consolidates the audit() helper from authController and direct
 * AuditLog.create() calls across the codebase.
 */

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Create an audit log entry
 * @param {object} options
 * @param {object} options.req - Express request (for IP / user-agent)
 * @param {object|string} options.actor - User object or userId
 * @param {string} options.action - One of the AuditLog action enum values
 * @param {string} options.resource - Resource type (e.g. 'User', 'Event')
 * @param {string} options.resourceId - ObjectId of the resource
 * @param {object} [options.details] - Extra structured data
 */
exports.log = async ({ req, actor, action, resource, resourceId, details = {} }) => {
  try {
    await AuditLog.create({
      actor: actor._id || actor,
      actorName: actor.name || 'System',
      actorRole: actor.role || 'system',
      action,
      resource,
      resourceId,
      details,
      ip: req?.ip || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
    });
  } catch (err) {
    // Audit failures should never crash the parent operation
    logger.error(`AuditService error: ${err.message}`);
  }
};

/**
 * Query audit logs with pagination
 */
exports.query = async ({ page = 1, limit = 50, action, resource, actor, startDate, endDate } = {}) => {
  const filter = {};
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (actor) filter.actor = actor;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, pagination: { current: page, pages: Math.ceil(total / limit), total } };
};
