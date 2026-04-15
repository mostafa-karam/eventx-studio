# Environment Reference

This document is the source of truth for backend environment variables.

## Required Variables

- `NODE_ENV` - `development`, `test`, or `production`
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - access token signing key
- `JWT_REFRESH_SECRET` - refresh token signing key
- `PAYMENT_HMAC_SECRET` - payment token HMAC key
- `QR_HMAC_SECRET` - QR payload signature key
- `SESSION_ENCRYPTION_KEY` - app encryption key
- `FRONTEND_URL` - primary frontend origin

## Strongly Recommended

- `CSRF_SECRET` - CSRF token secret seed
- `FRONTEND_ORIGIN` - CORS allowlist (comma-separated)
- `BACKEND_URL` - absolute backend URL for links
- `TRUST_PROXY` - set to `1` when behind a trusted proxy

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
- `DEMO_SEED_PASSWORD` - required for `seed` and `seed:all`

## Example (Development)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/eventx-studio
JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
PAYMENT_HMAC_SECRET=replace_me
QR_HMAC_SECRET=replace_me
SESSION_ENCRYPTION_KEY=replace_me
CSRF_SECRET=replace_me
FRONTEND_URL=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:5000
DEMO_SEED_PASSWORD=replace_with_strong_password
```

## Security Guidance

- Generate random secrets with high entropy.
- Do not commit `.env` files.
- Rotate secrets after exposure or suspected leak.
