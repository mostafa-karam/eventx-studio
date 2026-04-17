/**
 * Jest Global Setup
 * 
 * Test bootstrap:
 * - Suppresses noisy console output during test runs
 * - Provides safe default environment variables for isolated Jest execution
 */

// Silence dotenv's chatty console.log messages
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_ci';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_for_ci';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test_csrf_secret_for_ci';
process.env.COOKIE_SIGNING_SECRET = process.env.COOKIE_SIGNING_SECRET || 'test_cookie_signing_secret_for_ci';
process.env.QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || 'test_qr_hmac_secret_for_ci';
// Required by backend/utils/encryption.js (fail-closed crypto)
process.env.SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 'test_session_encryption_key_for_ci';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Suppress dotenv injection logs
console.log = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('[dotenv@')) return;
  originalConsoleLog.apply(console, args);
};

// Suppress expected application warnings during tests
console.warn = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('No EMAIL_HOST configured')) return;
  originalConsoleWarn.apply(console, args);
};
