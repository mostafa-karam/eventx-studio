/**
 * Jest Global Setup
 * 
 * Suppresses noisy console output during test runs:
 * - dotenv injection logs
 * - Expected application warnings (CSRF disabled, no EMAIL_HOST)
 */

// Silence dotenv's chatty console.log messages
process.env.DOTENV_CONFIG_QUIET = 'true';

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
  if (typeof msg === 'string' && (
    msg.includes('CSRF protection is DISABLED') ||
    msg.includes('No EMAIL_HOST configured')
  )) return;
  originalConsoleWarn.apply(console, args);
};
