# Comprehensive Codebase Map

Last updated: 2026-04-17

## Root Layout

```text
backend/
├── __tests__/        # Jest + Supertest test suites
├── config/           # Environment/security configuration
├── controllers/      # HTTP adapters (thin controllers)
├── docs/             # Technical documentation
├── middleware/       # Security, validation, request guards
├── models/           # Mongoose schemas and indexes
├── routes/           # API route declarations
├── scripts/          # Seed and maintenance scripts
├── services/         # Core business logic
├── test-utils/       # Test client/helpers
├── utils/            # Shared helpers (logging, transactions, etc.)
├── package.json
└── server.js         # App bootstrap and middleware wiring
```

## Important Runtime Files

- `server.js`
  - Initializes security middleware stack.
  - Mounts `/api` routers.
  - Adds global `405` and `404` handlers.
  - Wires central error handler.

- `config/security.js`
  - Rate-limit windows/thresholds.
  - JWT hardening defaults.
  - Request/body limits.
  - Redis rate-limit env support.

- `middleware/rateLimiter.js`
  - Global + auth/payment limiter profiles.
  - Redis-backed distributed limiter with fallback.

- `middleware/methodNotAllowed.js`
  - Detects unsupported methods on valid routes and returns `405`.

- `utils/transaction.js`
  - Shared transaction retry wrapper for transient MongoDB transaction failures.

## Domain Structure

- Event and ticketing flows:
  - `controllers/eventsController.js`
  - `controllers/bookingController.js`
  - `services/eventsService.js`
  - `services/eventLifecycleService.js`
  - `services/bookingService.js`
  - `services/ticketsService.js`

- Auth and sessions:
  - `controllers/authController.js`
  - `services/authService.js`
  - `middleware/auth.js`
  - `utils/authUtils.js`

## Test Coverage Entry Points

- `__tests__/security.test.js` - security regression checks
- `__tests__/booking.test.js` - booking and payment pathways
- `__tests__/eventLifecycle.test.js` - event publish/cancel immutability flow
- `__tests__/transactions.test.js` - transaction/fallback safety behavior
