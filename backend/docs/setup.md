# EventX Studio Backend Setup

Last updated: 2026-04-17

## Prerequisites

- Node.js `18+`
- npm `9+`
- MongoDB `6+` (local or Atlas)

## Install

```bash
cd backend
npm install
cp .env.example .env
```

## Configure Environment

Runtime validates required variables at startup. Missing required values cause startup failure outside test mode.

Required (see `env-reference.md` for full details):

- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYMENT_HMAC_SECRET`
- `QR_HMAC_SECRET`
- `SESSION_ENCRYPTION_KEY`
- `FRONTEND_URL`
- `COOKIE_SIGNING_SECRET`
- `CSRF_SECRET`

Recommended for secure local/prod behavior:

- `CSRF_SECRET`
- `FRONTEND_ORIGIN` (supports comma-separated allowlist)
- `BACKEND_URL`
- `TRUST_PROXY` (when behind reverse proxy)
- `REDIS_URL` (distributed rate limiting)
- `REDIS_RATE_LIMIT_PREFIX`

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API Behavior Notes

- Base path is `/api` (not `/api/v1`).
- CSRF token endpoint: `GET /api/auth/csrf-token`
- Health endpoint: `GET /api/health`
- Swagger UI endpoint: `/api-docs` (disabled in production)

## Seeding

Available scripts:

```bash
npm run seed      # lightweight dev users (utils/seed.js)
npm run seed:all  # full dataset seed (scripts/seed.js)
```

Both seed paths require `DEMO_SEED_PASSWORD`. Do not commit real seed passwords or reuse production credentials.
