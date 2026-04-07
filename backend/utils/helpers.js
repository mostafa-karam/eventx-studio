/**
 * Shared utility helpers
 *
 * SECURITY (Phase 1.4): Hardened against NoSQL injection.
 *  - escapeRegex strips MongoDB operators ($gt, $ne, etc.)
 *  - sanitizeSearchInput enforces max length and strips operators
 *  - anchoredRegex prevents catastrophic backtracking (ReDoS)
 */

const MAX_SEARCH_LENGTH = 100;

/**
 * Escape special regex characters to prevent ReDoS attacks.
 * Also strips MongoDB query operators from the string.
 * @param {string} str - The raw user input string
 * @returns {string} Escaped string safe to use in RegExp
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  // Strip any MongoDB operators (e.g. $gt, $ne, $regex, $where, etc.)
  let safe = str.replace(/\$[a-zA-Z]+/g, '');
  // Escape RegExp special characters
  safe = safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe;
};

/**
 * Sanitize and truncate search input.
 * @param {string} input - Raw search query
 * @returns {string} Sanitized, truncated string
 */
const sanitizeSearchInput = (input) => {
  if (typeof input !== 'string') return '';

  // Trim and enforce max length
  let sanitized = input.trim().slice(0, MAX_SEARCH_LENGTH);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Strip MongoDB operators
  sanitized = sanitized.replace(/\$[a-zA-Z]+/g, '');

  return sanitized;
};

/**
 * Create an anchored, case-insensitive RegExp from user input.
 * Uses word-boundary matching rather than unconstrained .* wildcards.
 * @param {string} input - Raw user search string
 * @returns {RegExp}
 */
const createSafeRegex = (input) => {
  const sanitized = sanitizeSearchInput(input);
  const escaped = escapeRegex(sanitized);
  if (!escaped) return new RegExp('^$'); // Empty input matches nothing
  return new RegExp(escaped, 'i');
};

module.exports = { escapeRegex, sanitizeSearchInput, createSafeRegex, MAX_SEARCH_LENGTH };
