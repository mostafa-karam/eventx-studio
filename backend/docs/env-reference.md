# Environment Reference

This document is the source of truth for backend environment variables.

## Required Variables

- `NODE_ENV` - `development`, `test`, or `production`
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - access token signing key
- `JWT_REFRESH_SECRET` - refresh token signing key
- `CSRF_SECRET` - CSRF token secret seed (fail-closed at startup)
- `COOKIE_SIGNING_SECRET` - dedicated cookie signing key
- `PAYMENT_HMAC_SECRET` - payment token HMAC key
- `QR_HMAC_SECRET` - QR payload signature key
- `SESSION_ENCRYPTION_KEY` - app encryption key
- `FRONTEND_URL` - primary frontend origin

## Strongly Recommended

- `FRONTEND_ORIGIN` - CORS allowlist (comma-separated)
- `BACKEND_URL` - absolute backend URL for links
- `TRUST_PROXY` - set to `1` when behind a trusted proxy
- `ENABLE_TRANSACTIONS` - enforce transactional booking flows where supported
- `REDIS_URL` - enable distributed/shared rate limiting across backend instances
- `REDIS_RATE_LIMIT_PREFIX` - key prefix namespace for Redis rate-limit counters

## Optional Mail Configuration

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

If `EMAIL_HOST` is missing in development, the app may write email output to a local temp sink for debugging.

## Runtime and Utility

- `PORT` - server port (default `5000`)
- `JWT_EXPIRE` - access token expiration string (if supported by security config)
- `JWT_REFRESH_EXPIRE` - refresh token expiration string
- `JWT_ISSUER` / `JWT_AUDIENCE` - optional JWT claim hardening
- `API_URL` - Swagger/OpenAPI server URL
- `REQUEST_BODY_LIMIT` - max incoming payload size
- rate-limit tuning vars (`RATE_LIMIT_*`, `AUTH_*`, `PAYMENT_RATE_LIMIT_MAX`)
- `REDIS_URL` / `REDIS_RATE_LIMIT_PREFIX` for distributed rate limiting with graceful fallback
- `DEMO_SEED_PASSWORD` - required for `seed` and `seed:all`

## Example (Development)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/eventx-studio
JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
CSRF_SECRET=replace_me
COOKIE_SIGNING_SECRET=replace_me
PAYMENT_HMAC_SECRET=replace_me
QR_HMAC_SECRET=replace_me
SESSION_ENCRYPTION_KEY=replace_me
FRONTEND_URL=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:5000
ENABLE_TRANSACTIONS=false
REDIS_URL=redis://localhost:6379
REDIS_RATE_LIMIT_PREFIX=eventx:ratelimit:
DEMO_SEED_PASSWORD=replace_with_strong_password
```

## Security Guidance

- Generate random secrets with high entropy.
- Do not commit `.env` files.
- Rotate secrets after exposure or suspected leak.
