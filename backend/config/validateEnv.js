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
  
  if (missing.length > 0) {
    if (process.env.NODE_ENV !== 'test') { // Tests often mock these or use dotenvx inject
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
  }
};

module.exports = validateEnv;
