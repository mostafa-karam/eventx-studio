/**
 * Authorization Helpers
 *
 * SECURITY (Phase 1.3 — IDOR Prevention):
 * Centralized ownership and role checks to prevent Insecure Direct Object
 * Reference vulnerabilities across all mutation endpoints.
 */

const logger = require('./logger');

/**
 * Check if a user owns a resource or is an admin.
 * @param {object} resource - Must have an `organizer` or `user` field (ObjectId)
 * @param {object} user - Authenticated user from req.user
 * @param {string} [ownerField='organizer'] - Field name that holds the owner ID
 * @returns {boolean}
 */
const isOwnerOrAdmin = (resource, user, ownerField = 'organizer') => {
  if (!resource || !user) return false;
  if (user.role === 'admin') return true;

  const ownerId = resource[ownerField];
  if (!ownerId) return false;

  return ownerId.toString() === user._id.toString();
};

/**
 * Enforce ownership — throws a 403 error if the user doesn't own the resource.
 * @param {object} resource
 * @param {object} user
 * @param {string} [ownerField='organizer']
 * @param {string} [action='access'] - for logging
 * @throws {Error} with status 403
 */
const enforceOwnership = (resource, user, ownerField = 'organizer', action = 'access') => {
  if (!isOwnerOrAdmin(resource, user, ownerField)) {
    logger.warn(
      `Authorization failure: User ${user._id} (${user.role}) attempted to ${action} ` +
      `resource owned by ${resource[ownerField]}`
    );
    const err = new Error(`Not authorized to ${action} this resource`);
    err.status = 403;
    throw err;
  }
};

/**
 * Enforce that a user has one of the specified roles.
 * @param {object} user
 * @param {string[]} allowedRoles
 * @param {string} [action='perform this action']
 * @throws {Error} with status 403
 */
const enforceRole = (user, allowedRoles, action = 'perform this action') => {
  if (!allowedRoles.includes(user.role)) {
    logger.warn(
      `Role authorization failure: User ${user._id} (${user.role}) attempted to ${action}. ` +
      `Required roles: ${allowedRoles.join(', ')}`
    );
    const err = new Error(`Not authorized to ${action}`);
    err.status = 403;
    throw err;
  }
};

module.exports = {
  isOwnerOrAdmin,
  enforceOwnership,
  enforceRole,
};
