# Testing Guide

Last updated: 2026-04-17

Backend tests use Jest + Supertest and run under `backend/__tests__`.

## Run Tests

```bash
npm test
```

Single file:

```bash
npx jest __tests__/auth.test.js --detectOpenHandles --forceExit
```

Current script:

```json
"test": "jest --detectOpenHandles --forceExit"
```

## Suite Coverage

Current test files:

- `auth.test.js`
- `analytics.test.js`
- `booking.test.js`
- `coupons.test.js`
- `eventLifecycle.test.js`
- `halls.test.js`
- `notifications.test.js`
- `reviews.test.js`
- `security.test.js`
- `transactions.test.js`
- `users.test.js`
- `waitlist.test.js`

## API Prefix in Tests

Use `/api` routes, not `/api/v1`.

## Recommended Regression Additions

- `hall-bookings` ownership isolation for `venue_admin`.
- Rate-limit behavior tests for `verify-email` and `resend-verification`.
- Event payload hardening tests to ensure unknown fields are rejected.
- Coupon endpoint validator tests for malformed payloads.
- Idempotency retry tests for booking confirm endpoint.
- 405 method enforcement tests with `Allow` header assertions.

## Test Hygiene

- Keep tests independent of seeded data.
- Create required fixtures inside each test or `beforeEach`.
- Validate both success and failure paths (authz, validation, not found, conflict).
