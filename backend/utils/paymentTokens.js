/**
 * Payment Token Utilities
 *
 * Provides HMAC-signed tokens for payment flow integrity.
 * Tokens bind (txId, userId, eventId, amount, currency, quantity)
 * together with a timestamp and are verified before any booking mutation.
 *
 * SECURITY (Phase 1.2):
 *  - HMAC-SHA256 signature prevents client-side tampering
 *  - Timestamp prevents replay after TOKEN_MAX_AGE_MS
 *  - Amount verified against DB, not client
 */

const crypto = require('crypto');
const logger = require('./logger');

const TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Get the HMAC secret. Falls back to JWT_SECRET if dedicated env var is missing.
 * @returns {string}
 */
const getSecret = () => {
  return process.env.PAYMENT_HMAC_SECRET;
};

/**
 * Create an HMAC-signed payment token.
 * @param {object} payload - { txId, userId, eventId, amount, quantity, currency }
 * @returns {string} Base64-encoded token (payload.signature)
 */
const signPaymentToken = (payload) => {
  const { txId, userId, eventId, amount, quantity = 1, currency = 'USD' } = payload;

  const data = {
    txId,
    userId: String(userId),
    eventId: eventId || null,
    amount,
    quantity,
    currency,
    iat: Date.now(),
  };

  const message = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(message)
    .digest('hex');

  // Encode as base64 for transport
  const token = Buffer.from(JSON.stringify({ data, sig: signature })).toString('base64');
  return token;
};

/**
 * Verify and decode an HMAC-signed payment token.
 * @param {string} token - Base64-encoded token
 * @returns {object} Decoded payload
 * @throws {Error} If token is invalid, tampered, or expired
 */
const verifyPaymentToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Payment token is required');
  }

  let parsed;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('Malformed payment token');
  }

  const { data, sig } = parsed;
  if (!data || !sig) {
    throw new Error('Invalid payment token structure');
  }

  // Recompute HMAC and compare
  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(JSON.stringify(data))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
    logger.warn('Payment token HMAC mismatch — possible tampering');
    throw new Error('Invalid payment token signature');
  }

  // Check token age
  const tokenAge = Date.now() - data.iat;
  if (tokenAge > TOKEN_MAX_AGE_MS) {
    throw new Error('Payment token has expired');
  }
  if (tokenAge < 0) {
    throw new Error('Payment token timestamp is in the future');
  }

  return data;
};

module.exports = {
  signPaymentToken,
  verifyPaymentToken,
  TOKEN_MAX_AGE_MS,
};
