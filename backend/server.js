const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');
const hpp = require('hpp');
const responseTime = require('response-time');
const crypto = require('crypto');
const logger = require('./utils/logger');
const Idempotency = require('./models/Idempotency');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const methodNotAllowed = require('./middleware/methodNotAllowed');
const sanitizeRequest = require('./middleware/requestSanitizer');
const {
  csrfProtection,
  issueCsrfToken,
} = require('./middleware/csrfProtection');

dotenv.config();

const validateEnv = require('./config/validateEnv');
validateEnv();

const config = require('./config');
const paymentsService = require('./services/paymentsService');
const { probeTransactionCapability, getTransactionHealthState } = require('./utils/transactionHealth');

const app = express();
const PORT = config.port;

app.disable('x-powered-by');

// Trust reverse proxies only when explicitly configured
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || 1);
}

// ─── Security Middleware ────────────────────────────────────────────
const requestId = require('./middleware/requestId');

app.use(requestId);

// Generate nonce for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      ...(config.env === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: { policy: 'credentialless' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  xFrameOptions: { action: 'deny' },
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      fullscreen: ['self'],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: config.env === 'production'
    ? { maxAge: 15552000, includeSubDomains: true, preload: true }
    : false,
}));

// Parse cookies for httpOnly token support
const cookieSigningSecret = process.env.COOKIE_SIGNING_SECRET;
if (!cookieSigningSecret) {
  throw new Error('COOKIE_SIGNING_SECRET is required');
}
app.use(cookieParser(cookieSigningSecret));

// Global rate limiter
app.use(globalLimiter);
// ─── CORS ────────────────────────────────────────────────────────────
// In production, strictly use the configured origins. In dev, allow localhost fallback.
const validateOriginUrl = (origin) => {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Origin must use http or https');
    }
    if (parsed.host.includes('*') || origin.includes('*')) {
      throw new Error('Origin must not contain wildcard characters');
    }
    return parsed.origin;
  } catch (err) {
    throw new Error(`Invalid FRONTEND origin: ${origin} (${err.message})`);
  }
};

const getAllowedOrigins = () => {
  const envOrigins = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
  if (envOrigins) {
    const origins = envOrigins.split(',').map(o => o.trim()).filter(Boolean);
    return origins.map(validateOriginUrl);
  }
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:5173', 'http://localhost:3000'];
  }
  return [];
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Rejected request without Origin header in production');
        return callback(new Error('Origin header is required'), false);
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`Rejected CORS origin: ${origin}`);
    return callback(new Error(`CORS policy: Origin ${origin} is not allowed`), false);
  },
  credentials: true,
}));

// ─── Body Parsing & Sanitization ────────────────────────────────────
app.use(express.json({ limit: config.security.request.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: config.security.request.jsonLimit }));
app.use(sanitizeRequest);
app.use(mongoSanitize());
app.use(compression());
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(responseTime()); // Add X-Response-Time header

// ─── CSRF Protection (csrf-csrf double-submit cookie) ───────────────
app.use('/api', csrfProtection);

// CSRF Token Provider Endpoint
app.get('/api/auth/csrf-token', (req, res) => {
  const token = issueCsrfToken(req, res);
  res.json({ success: true, data: { csrfToken: token }, csrfToken: token });
});

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
    const mongoURI = config.mongoUri || 'mongodb://localhost:27017/eventx-studio';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error: ' + error.message);
    process.exit(1);
  }
};

const verifyDbTransactions = async () => {
  // Fail closed on misconfigured Mongo topology.
  if (!config.security.db?.requireTransactions) return;

  const healthy = await probeTransactionCapability();
  if (!healthy) {
    logger.error('MongoDB transactions are required but unavailable');
    process.exit(1);
  }
};

const verifyPaymentWebhookSecurity = () => {
  try {
    paymentsService.validatePaymentWebhookSecurityConfig();
  } catch (err) {
    logger.error(`Payment webhook security config invalid: ${err.message}`);
    process.exit(1);
  }
};

const startIdempotencyReconciler = () => {
  const intervalMs = Number.parseInt(process.env.IDEMPOTENCY_RECONCILE_INTERVAL_MS, 10) || 60 * 1000;
  const staleThresholdMs = Number.parseInt(process.env.IDEMPOTENCY_PROCESSING_TIMEOUT_MS, 10) || 2 * 60 * 1000;
  return setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - staleThresholdMs);
      const result = await Idempotency.updateMany(
        { status: 'processing', createdAt: { $lte: cutoff } },
        {
          $set: {
            status: 'failed',
            statusCode: 409,
            response: { success: false, message: 'Request processing timed out; safe retry allowed.' },
          },
        },
      );
      if (result.modifiedCount > 0) {
        logger.warn(`Idempotency reconciler marked ${result.modifiedCount} stale records as failed`);
      }
    } catch (err) {
      logger.error(`Idempotency reconciler failed: ${err.message}`);
    }
  }, intervalMs);
};

const startTransactionCapabilityMonitor = () => {
  const intervalMs = Number.parseInt(process.env.TRANSACTION_HEALTH_CHECK_INTERVAL_MS, 10) || 60 * 1000;
  return setInterval(async () => {
    const healthy = await probeTransactionCapability();
    const state = getTransactionHealthState();
    if (!healthy) {
      logger.error('security_event', {
        event: 'db.transaction_capability_lost',
        timestamp: new Date().toISOString(),
        lastProbeAt: state.lastProbeAt,
      });
    }
  }, intervalMs);
};

const verifyRateLimitRedisConfigured = () => {
  if (config.env !== 'production') return;
  if (!config.security.rateLimit.redisUrl) {
    logger.error('REDIS_URL is required for production rate limiting');
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
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dbStatus,
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// ─── Global 405 Handler ───────────────────────────────────────────────
app.use(methodNotAllowed(app));

// ─── 404 Catch-All ───────────────────────────────────────────────────
app.use('*', (_req, res) =>
  res.status(404).json({
    success: false,
    data: null,
    error: 'Route not found',
    message: 'Route not found',
  }));

// ─── Error Handling (must be LAST — 4-arg signature) ─────────────────
app.use(errorHandler);
const startServer = async () => {
  await connectDB();
  verifyRateLimitRedisConfigured();
  verifyPaymentWebhookSecurity();
  await verifyDbTransactions();
  const idempotencyReconciler = startIdempotencyReconciler();
  const transactionMonitor = startTransactionCapabilityMonitor();

  const server = app.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));
  server.timeout = 30000; // 30 second request timeout

  // ─── Graceful Shutdown ──────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try {
        clearInterval(idempotencyReconciler);
        clearInterval(transactionMonitor);
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
