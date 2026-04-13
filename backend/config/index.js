require('dotenv').config({ quiet: true });

const security = require('./security');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  secrets: {
    jwt: process.env.JWT_SECRET,
    jwtRefresh: process.env.JWT_REFRESH_SECRET,
  },
  jwt: {
    accessExpire: security.jwt.accessExpiresIn,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.FROM_EMAIL || 'noreply@eventx.studio'
  },
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  security,
};
