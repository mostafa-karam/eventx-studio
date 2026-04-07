require('dotenv').config({ quiet: true });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  secrets: {
    jwt: process.env.JWT_SECRET,
    jwtRefresh: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
  },
  jwt: {
    accessExpire: process.env.JWT_EXPIRE || '30m'
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
  security: require('./security')
};
