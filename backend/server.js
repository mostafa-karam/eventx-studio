const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const crypto = require('crypto');
const path = require('path');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');

dotenv.config();

// ─── Startup Environment Validation ────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('[FATAL] Server will not start. Please check your .env file.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies only when explicitly configured
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || 1);
}

// ─── Security Middleware ────────────────────────────────────────────
// CSP nonce generation — attach a unique nonce per request
app.use((_req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet());

// Content Security Policy — strict, nonce-based
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
    styleSrc: ["'self'", 'https://fonts.googleapis.com', (req, res) => `'nonce-${res.locals.cspNonce}'`],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:', 'ws:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  }
}));

// Parse cookies for httpOnly token support
app.use(cookieParser(process.env.CSRF_SECRET || process.env.JWT_SECRET));

// Global rate limiter — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Stricter rate limiter for auth routes — 15 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for password reset — 5 requests per 15 minutes
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`), false);
    }
  },
  credentials: true,
}));

// ─── Body Parsing & Sanitization ────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS (Cross-Site Scripting)
app.use(xss());
app.use(compression());

// ─── CSRF Protection (csrf-csrf double-submit cookie) ───────────────
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => {
    // Use the access_token cookie as session identifier, or fallback for pre-auth requests
    return req.cookies?.access_token || req.ip || 'anonymous';
  },
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Apply CSRF protection to all /api routes (except in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', doubleCsrfProtection);
}

// CSRF Token Provider Endpoint
app.get('/api/auth/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ success: true, csrfToken: token });
});

// ─── Serve Uploaded Files ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=86400');
  },
}));

// ─── Request Logging ─────────────────────────────────────────────────
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

// ─── Swagger API Documentation ───────────────────────────────────────
const setupSwagger = require('./swagger');
setupSwagger(app);

// ─── DB ──────────────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx-studio';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error: ' + error.message);
    process.exit(1);
  }
};

// ─── Routes ──────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');
const analyticsRoutes = require('./routes/analytics');
const paymentRoutes = require('./routes/payments');
const bookingRoutes = require('./routes/booking');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const marketingRoutes = require('./routes/marketing');
const categoriesRoutes = require('./routes/categories');
const hallRoutes = require('./routes/halls');
const hallBookingRoutes = require('./routes/hallBookings');
const publicRoutes = require('./routes/public');
const auditLogRoutes = require('./routes/auditLog');
const searchRoutes = require('./routes/search');
const uploadRoutes = require('./routes/upload');
const couponRoutes = require('./routes/coupons');
const reviewsRoutes = require('./routes/reviews');

app.use('/api/auth', authLimiter, authRoutes);
// Apply password-reset limiter specifically
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/hall-bookings', hallBookingRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events/:eventId/reviews', reviewsRoutes);
app.use('/api/coupons', couponRoutes);

app.get('/', (_req, res) => res.json({ message: 'EventX Studio API is running!', version: '2.0.0' }));

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Error Handling ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // CSRF token errors from csrf-csrf
  if (err.message === 'invalid csrf token' || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  logger.error(`${err.statusCode || err.status || 500} — ${err.message} — ${req.originalUrl}`);

  const statusCode = err.statusCode || err.status || 500;

  // Only send detailed error messages for operational errors in non-production
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

app.use('*', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

const startServer = async () => {
  await connectDB();

  if (process.env.NODE_ENV !== 'production') {
    try {
      const seedUsers = require('./utils/seed');
      await seedUsers();
      logger.info('Demo users seeded automatically for development');
    } catch (err) {
      logger.error('Failed to seed demo users:', err);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));
  server.timeout = 30000; // 30 second request timeout

  // ─── Graceful Shutdown ──────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
      }
      process.exit(0);
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = app;

if (require.main === module) {
  startServer();
}
