const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────
// Basic security headers via Helmet
app.use(helmet());

// Content Security Policy - keep relatively strict but permissive for frontend assets
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:', 'ws:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  }
}));

// Parse cookies for httpOnly token support
app.use(cookieParser());

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

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// ─── Body Parsing & Sanitization ────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// ─── Request Logging ─────────────────────────────────────────────────
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

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

app.use('/api/auth', authLimiter, authRoutes);
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

app.get('/', (_req, res) => res.json({ message: 'EventX Studio API is running!', version: '2.0.0' }));

// ─── Error Handling ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

app.use('*', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));
};

startServer();
