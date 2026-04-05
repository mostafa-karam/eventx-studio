const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const crypto = require('crypto');
const path = require('path');
const morgan = require('morgan');
const hpp = require('hpp');
const responseTime = require('response-time');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const xssCleaner = require('./middleware/xssCleaner');

dotenv.config();

// ─── Startup Environment Validation ────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI', 'CSRF_SECRET'];
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

// Global rate limiter
app.use(globalLimiter);
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
// Data sanitization against XSS
app.use(xssCleaner());
app.use(compression());
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(responseTime()); // Add X-Response-Time header

// ─── CSRF Protection (csrf-csrf double-submit cookie) ───────────────
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => {
    // Use the accessToken cookie as session identifier, or fallback for pre-auth requests
    return req.cookies?.accessToken || req.ip || 'anonymous';
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
} else {
  logger.warn('⚠️  CSRF protection is DISABLED (test mode)');
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
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Standard production logging format
  app.use(morgan('[:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'));
}

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
const apiRoutes = require('./routes');

// Mount all API routes under /api
app.use('/api', apiRoutes);

app.get('/', (_req, res) => res.json({ message: 'EventX Studio API is running!', version: '2.0.0' }));

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbStatus,
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── 404 Catch-All ───────────────────────────────────────────────────
app.use('*', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handling (must be LAST — 4-arg signature) ─────────────────
app.use(errorHandler);
const startServer = async () => {
  await connectDB();



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
