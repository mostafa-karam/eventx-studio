const logger = require('../utils/logger');

const validateEnv = () => {
  const requiredVars = [
    'NODE_ENV',
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CSRF_SECRET',
    'COOKIE_SIGNING_SECRET',
    'PAYMENT_HMAC_SECRET',
    'QR_HMAC_SECRET',
    'SESSION_ENCRYPTION_KEY',
    'FRONTEND_URL'
  ];

  const missing = requiredVars.filter(envVar => !process.env[envVar]);
  const isTest = process.env.NODE_ENV === 'test';
  const weakSecretPatterns = /(change_me|changeme|example|test|default|replace|sample|dummy|placeholder)/i;
  const secretVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CSRF_SECRET',
    'COOKIE_SIGNING_SECRET',
    'PAYMENT_HMAC_SECRET',
    'QR_HMAC_SECRET',
    'SESSION_ENCRYPTION_KEY'
  ];
  
  if (missing.length > 0) {
    if (!isTest) { // Tests often mock these or use dotenvx inject
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
  }

  if (!isTest) {
    const weakSecrets = secretVars.filter((key) => {
      const value = process.env[key];
      if (!value) return false;
      if (value.length < 32) return true;
      return weakSecretPatterns.test(value);
    });

    if (weakSecrets.length > 0) {
      logger.error(`Weak or placeholder secret values detected: ${weakSecrets.join(', ')}`);
      process.exit(1);
    }
  }
};

module.exports = validateEnv;
