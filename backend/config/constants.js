/**
 * Application Constants
 * Extracted magic numbers and reused configurations
 */

module.exports = {
  // Authentication & Security
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_DURATION_MS: 2 * 60 * 60 * 1000, // 2 hours
  MAX_ACTIVE_SESSIONS: 10,
  PASSWORD_HISTORY_SIZE: 5,
  BCRYPT_SALT_ROUNDS: 12,

  // Pagination defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
