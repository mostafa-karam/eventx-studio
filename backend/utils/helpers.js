/**
 * Shared utility helpers
 */

/**
 * Escape special regex characters to prevent ReDoS attacks.
 * Use this before creating RegExp from user input.
 * @param {string} str - The raw user input string
 * @returns {string} Escaped string safe to use in RegExp
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
