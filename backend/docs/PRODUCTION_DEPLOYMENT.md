# EventX Studio — Backend Production Deployment Guide

This document is **specific to this repository’s** Express/Mongoose backend (`backend/server.js`, `config/*`, `middleware/*`, `services/*`). It is not a generic Node tutorial.

**Related:** [Environment variable reference](./env-reference.md)

---

## Table of contents

1. [System architecture](#1-system-architecture)
2. [Security requirements](#2-security-requirements)
3. [Infrastructure design](#3-infrastructure-design)
4. [Installation steps](#4-installation-steps)
5. [Server configuration](#5-server-configuration)
6. [Running the application](#6-running-the-application)
7. [Hardening](#7-hardening)
8. [Performance](#8-performance)
9. [Monitoring](#9-monitoring)
10. [Failure modes](#10-failure-modes)
11. [Environment variables (complete)](#11-environment-variables-complete)
12. [Security checklist](#12-security-checklist)
13. [Common mistakes](#13-common-mistakes)
14. [Production readiness checklist](#14-production-readiness-checklist)
15. [Code reference map](#15-code-reference-map)
16. [Production misconfiguration — how deployment fails](#16-production-misconfiguration--how-deployment-fails)

---

## 1. System architecture

### 1.1 Stack (from `package.json` and code)

| Component     | Technology                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime       | Node.js (CI uses 20.x; align production with LTS policy)                                                                                  |
| HTTP          | Express 4.x — entry `server.js` (`npm start` → `node server.js`)                                                                          |
| Database      | MongoDB via Mongoose 8.x                                                                                                                  |
| Transactions  | Multi-document transactions on critical paths (`utils/transaction.js`, booking, payments guard, events lifecycle, tickets, hall bookings) |
| Rate limiting | `express-rate-limit` + **Redis** (`ioredis`, `rate-limit-redis`)                                                                          |
| Auth          | JWT (`Authorization: Bearer` or `accessToken` cookie), optional 2FA, email verification for protected routes                              |
| CSRF          | `csrf-csrf` double-submit on `/api/*` except payment webhook path                                                                         |
| Payments      | Mock PSP–style: `POST /api/payments/process` + `POST /api/payments/webhook/verify` (HMAC, IP allowlist, replay protection)                |
| Uploads       | Local disk `backend/uploads` + `file-type` validation (`routes/upload.js`)                                                                |
| Logging       | Winston → console + `logs/*.log` in production (`utils/logger.js`)                                                                        |
| API docs      | Swagger at `/api-docs` **only when** `NODE_ENV !== 'production'` (`swagger.js`)                                                           |

### 1.2 In-process timers (not a separate worker service)

- **Idempotency reconciler:** marks stale `processing` idempotency records as failed (`server.js`).
- **Transaction capability monitor:** periodic probe; logs if Mongo transactions become unavailable (`server.js`, `utils/transactionHealth.js`).

### 1.3 Architecture diagram (text)

```text
                         [ Internet / CDN ]
                                   |
                          [ TLS termination ]
                     (Nginx / LB / Cloud provider)
                                   |
              +--------------------+--------------------+
              |  X-Forwarded-For / X-Forwarded-Proto     |
              +--------------------+--------------------+
                                   |
                      [ Node.js — PORT / PM2 cluster ]
                         EventX Studio Express API
        +------------+------------+------------+------------+
        |            |            |            |            |
   [ MongoDB     [ Redis ]    [ Winston      [ Local FS:   ]
     replica       rate         logs/         uploads/
     set ]          limits       combined      (see scaling)
```

### 1.4 Booking and payment flow (conceptual)

```text
Client (JWT + CSRF) --> POST /api/payments/process --> Payment document (processing)
                               |
PSP (allowlisted IP) --> POST /api/payments/webhook/verify --> verified / failed
                               |
Client --> POST /api/booking/initiate --> booking session
       --> POST /api/booking/confirm --> ticket + consume payment (paid flows)
```

---

## 2. Security requirements

### 2.1 Startup validation (`config/validateEnv.js`)

**Required (non-test):**

- `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`, `COOKIE_SIGNING_SECRET`, `PAYMENT_HMAC_SECRET`, `QR_HMAC_SECRET`, `SESSION_ENCRYPTION_KEY`, `FRONTEND_URL`

**Additional when `NODE_ENV=production`:**

- `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- `PAYMENT_WEBHOOK_IP_ALLOWLIST`

**Secret strength:** listed secrets must be **≥ 32 characters** and must not match weak patterns (`change_me`, `test`, `example`, etc.). Process **exits** if invalid.

**Forbidden in production:**

- `ALLOW_NON_TXN_BOOKING=true` → process **exits**.

### 2.2 Additional production gates (`server.js`)

| Check                                   | Behavior if failed                                                 |
| --------------------------------------- | ------------------------------------------------------------------ |
| `REDIS_URL` empty in production         | Process **exits** (`verifyRateLimitRedisConfigured`)               |
| Payment webhook security                | **Exits** (`paymentsService.validatePaymentWebhookSecurityConfig`) |
| Mongo transaction probe (when required) | **Exits** (`verifyDbTransactions`)                                 |

`REQUIRE_DB_TRANSACTIONS` defaults to **on in production** via `config/security.js` (`db.requireTransactions`).

### 2.3 HTTP security (`server.js`)

- **Helmet:** CSP with nonce, HSTS in production, COEP/COOP/CORP, `X-Frame-Options: deny`, referrer policy, permissions policy.
- **CORS:** `FRONTEND_ORIGIN` or `FRONTEND_URL` — comma-separated origins, validated (no `*`). In production, requests **without** `Origin` are rejected for browser CORS flow.
- **Cookies:** `cookie-parser(COOKIE_SIGNING_SECRET)`; CSRF cookies use `__Host-` prefix in production (`config/security.js`).
- **Body size:** `REQUEST_BODY_LIMIT` (default `10kb` in `config/security.js`).
- **Other:** `mongoSanitize`, `hpp`, `compression`, `response-time`, request sanitizer.

### 2.4 Rate limiting (`middleware/rateLimiter.js`)

- Uses **Redis** when `REDIS_URL` is set.
- **Strict Redis** limiters (auth login/register/reset/refresh, payment, booking, QR lookup): in production, if Redis is down:
  - Default `RATE_LIMIT_EMERGENCY_MODE=true`: per-key **emergency** bucket (**10 requests / 60s**).
  - If `RATE_LIMIT_EMERGENCY_MODE=false`: **503** for those routes.

### 2.5 Payment webhooks (`services/paymentsService.js`)

- **HMAC-SHA256** on canonical payload; header `x-payment-signature` (64 hex).
- **IP allowlist:** `PAYMENT_WEBHOOK_IP_ALLOWLIST` (IPs or CIDR).
- **Replay:** `PaymentWebhookEvent` unique index + TTL.
- **Skew:** `PAYMENT_WEBHOOK_MAX_AGE_MS` vs `x-payment-timestamp` or body `timestamp`.
- **CSRF:** `POST /api/payments/webhook/verify` is **excluded** from CSRF (`middleware/csrfProtection.js`).

### 2.6 Reverse proxy

- Set **`TRUST_PROXY`** when behind Nginx/LB so `req.ip` and webhook IP checks match the client/provider (`server.js`).
- Configure **`X-Forwarded-For`** / **`X-Forwarded-Proto`** correctly.

### 2.7 HTTPS

Production uses **secure cookies** and **HSTS**. Terminate TLS at the edge; the app expects HTTPS for real users.

---

## 3. Infrastructure design

| Layer   | Recommendation                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------ |
| Edge    | TLS 1.2+, optional WAF; body limits consistent with `REQUEST_BODY_LIMIT`                               |
| App     | PM2 cluster or multiple containers/instances behind a load balancer                                    |
| MongoDB | **Replica set** (required for transactions in production configuration)                                |
| Redis   | Private network, AUTH/TLS (`rediss://`); shared by all app instances                                   |
| Uploads | Single-node: local `uploads/` OK; **multi-node:** use shared object storage (code today is local-disk) |
| Secrets | Inject via vault / platform secrets — never commit `.env`                                              |

---

## 4. Installation steps

Example: **Ubuntu 22.04 LTS**. Adjust for your OS/cloud.

### 4.1 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v && npm -v
```

### 4.2 MongoDB

Use **MongoDB Atlas** or self-managed **replica set** (minimum three data-bearing members for production best practice). Connection string must support **transactions** (replica set or sharded cluster).

### 4.3 Redis 7+

```bash
sudo apt-get install -y redis-server
# Production: set requirepass, bind to private IP, enable TLS if exposed across networks
sudo systemctl enable --now redis-server
```

### 4.4 Application

```bash
sudo mkdir -p /opt/eventx-studio && sudo chown "$USER":"$USER" /opt/eventx-studio
cd /opt/eventx-studio
git clone <YOUR_REPO_URL> .
cd backend
npm ci --omit=dev
```

---

## 5. Server configuration

### 5.1 Production `.env` (example)

Path: `backend/.env` — file mode **`chmod 600`**.

```env
NODE_ENV=production
PORT=5000

# MongoDB — replica set / Atlas URI
MONGO_URI=mongodb+srv://user:pass@cluster.example.mongodb.net/eventx-studio?retryWrites=true&w=majority

# Redis — REQUIRED in production (non-empty REDIS_URL)
REDIS_URL=rediss://:PASSWORD@redis.internal:6389/0
REDIS_RATE_LIMIT_PREFIX=eventx:ratelimit:

FRONTEND_URL=https://app.example.com
FRONTEND_ORIGIN=https://app.example.com
BACKEND_URL=https://api.example.com

TRUST_PROXY=1

JWT_SECRET=<32+ random chars, unique>
JWT_REFRESH_SECRET=<32+ random chars, unique>
CSRF_SECRET=<32+ random chars, unique>
COOKIE_SIGNING_SECRET=<32+ random chars, unique>
PAYMENT_HMAC_SECRET=<32+ random chars, unique>
QR_HMAC_SECRET=<32+ random chars, unique>
SESSION_ENCRYPTION_KEY=<32+ random chars, unique>

JWT_ISSUER=eventx-studio-api
JWT_AUDIENCE=eventx-studio-client
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d

PAYMENT_PROVIDER_WEBHOOK_SECRET=<dedicated webhook signing secret>
PAYMENT_WEBHOOK_IP_ALLOWLIST=203.0.113.10,198.51.100.0/24
PAYMENT_WEBHOOK_MAX_AGE_MS=300000
PAYMENT_WEBHOOK_EVENT_TTL_MS=604800000

# Email — use EMAIL_FROM for sending identity (see emailService.js)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM="EventX Studio" <no-reply@example.com>

REQUEST_BODY_LIMIT=10kb
```

**Do not set in production:** `ALLOW_NON_TXN_BOOKING=true`.

**Optional tuning:** see [env-reference.md](./env-reference.md) (`RATE_LIMIT_*`, `IDEMPOTENCY_*`, `TRANSACTION_HEALTH_CHECK_INTERVAL_MS`, export caps, etc.).

### 5.2 Nginx reverse proxy (example)

`/etc/nginx/sites-available/eventx-api.conf`:

```nginx
upstream eventx_backend {
    least_conn;
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 12m;

    location /api/payments/webhook/verify {
        proxy_pass http://eventx_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://eventx_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/eventx-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.3 TLS (Let’s Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

---

## 6. Running the application

### 6.1 PM2 (cluster mode example)

`ecosystem.config.cjs` in `backend/`:

```javascript
module.exports = {
  apps: [
    {
      name: "eventx-backend",
      cwd: "/opt/eventx-studio/backend",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: { NODE_ENV: "production" },
    },
  ],
};
```

```bash
sudo npm i -g pm2
cd /opt/eventx-studio/backend
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd
```

### 6.2 Graceful shutdown

`server.js` handles `SIGTERM` / `SIGINT`: closes HTTP server and MongoDB. Align orchestrator kill timeout with the internal **10s** force shutdown if you customize.

### 6.3 Logs

- **Winston:** `backend/logs/error.log`, `backend/logs/combined.log` in production.
- **PM2:** `pm2 logs eventx-backend`.

---

## 7. Hardening

| Area     | Action                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Firewall | Public: **443** (and **80** for ACME only). MongoDB and Redis **not** on the public internet.                              |
| MongoDB  | Auth, TLS, least-privilege DB user, backups.                                                                               |
| Redis    | Password, TLS, private VPC; restrict commands if needed.                                                                   |
| `.env`   | `chmod 600`; inject from secret manager in CI/CD.                                                                          |
| Seeding  | `scripts/seed.js` blocks destructive operations in production unless `ALLOW_DESTRUCTIVE_SEED=true` — never enable in prod. |
| Uploads  | Do not expose `uploads/` as static Nginx without auth; app uses authenticated `GET /api/upload/files/:filename`.           |

---

## 8. Performance

- **Compression:** enabled in `server.js` (`compression()`).
- **Indexes:** review `models/*.js` for hot query paths (e.g. `Ticket` by event/user, `Payment` by `paymentId`).
- **Horizontal scaling:** requires shared **Redis** for rate limits. **Local uploads** do not scale across nodes without shared storage or sticky sessions.
- **Nginx:** enable `gzip` for JSON; tune workers and keepalives.

---

## 9. Monitoring

| Signal       | Where                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Process      | PM2 / container restarts, CPU, memory                                                |
| HTTP         | Nginx access/error logs                                                              |
| App          | Winston files; grep `security_event`                                                 |
| Liveness     | `GET /api/health` — returns `dbStatus`, uptime, memory (extend for Redis if desired) |
| Transactions | Logs for `db.transaction_capability_lost` from periodic monitor                      |

---

## 10. Failure modes

### 10.1 MongoDB transactions unavailable

- **Startup:** if transactions are required, failed probe → process **exits**.
- **Runtime:** `requireHealthyTransactions` returns **503** on payment create and booking initiate/confirm while unhealthy.
- **Booking:** paid/coupon paths refuse non-transactional execution in production.

**Action:** replica set health, elections, driver reconnect; runbook for brief 503 during failover.

### 10.2 Redis down

- Empty `REDIS_URL` in production → **exit** at startup.
- Runtime: strict limiters use emergency mode or **503** (see §2.4). **Booking/payment correctness** depends on MongoDB, not Redis.

### 10.3 Webhook delayed or retried

- Outside timestamp window → **401**; PSP should retry with fresh timestamp.
- Duplicate event id + signature digest → **409**.
- State transitions are strict; terminal **`consumed`** payments reject unsafe replays.

**Action:** NTP on app nodes; document PSP headers: `x-payment-signature`, `x-payment-timestamp`, `x-payment-event-id`.

---

## 11. Environment variables (complete)

### Required (validateEnv + runtime)

| Variable                            | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`                          | `production` for production                              |
| `MONGO_URI`                         | MongoDB connection string (replica set for transactions) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT signing                                              |
| `CSRF_SECRET`                       | CSRF token generation                                    |
| `COOKIE_SIGNING_SECRET`             | Signed cookies (e.g. CSRF session id)                    |
| `PAYMENT_HMAC_SECRET`               | Payment token HMAC (non-webhook paths)                   |
| `QR_HMAC_SECRET`                    | QR payload signing                                       |
| `SESSION_ENCRYPTION_KEY`            | App encryption material                                  |
| `FRONTEND_URL`                      | Primary frontend URL (also CORS fallback)                |
| `REDIS_URL`                         | **Required non-empty in production** (rate limiting)     |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET`   | **Production:** webhook HMAC secret                      |
| `PAYMENT_WEBHOOK_IP_ALLOWLIST`      | **Production:** comma-separated IP/CIDR allowlist        |

### Strongly recommended

| Variable                            | Purpose                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `FRONTEND_ORIGIN`                   | CORS allowlist (comma-separated); overrides single-origin ambiguity |
| `BACKEND_URL`                       | Absolute URLs in upload responses (`uploadController.js`)           |
| `TRUST_PROXY`                       | `1` (or hop count) behind reverse proxy                             |
| `JWT_ISSUER` / `JWT_AUDIENCE`       | Must match tokens (`config/security.js`, `middleware/auth.js`)      |
| `JWT_EXPIRE` / `JWT_REFRESH_EXPIRE` | Token lifetimes                                                     |
| `REDIS_RATE_LIMIT_PREFIX`           | Redis key namespace (default `eventx:ratelimit:`)                   |

### Email (`utils/emailService.js`, `config/index.js`)

| Variable                                                               | Notes                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` | SMTP                                               |
| `EMAIL_FROM`                                                           | From header (preferred)                            |
| `FROM_EMAIL`                                                           | Alternate used in `config/index.js` for some paths |

### Rate limits & security tuning (`config/security.js`)

Includes: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_REGISTER_RATE_LIMIT_MAX`, `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`, `AUTH_REFRESH_RATE_LIMIT_MAX`, `PAYMENT_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_WINDOW_MS`, `BOOKING_RATE_LIMIT_MAX`, `QR_LOOKUP_RATE_LIMIT_*`, `RATE_LIMIT_REQUIRE_REDIS`, `RATE_LIMIT_EMERGENCY_MODE`.

### Payments / webhooks

| Variable                       | Default / notes |
| ------------------------------ | --------------- |
| `PAYMENT_WEBHOOK_MAX_AGE_MS`   | 5 minutes       |
| `PAYMENT_WEBHOOK_EVENT_TTL_MS` | 7 days          |

### Idempotency & DB health (`server.js`)

| Variable                               | Default |
| -------------------------------------- | ------- |
| `IDEMPOTENCY_RECONCILE_INTERVAL_MS`    | 60s     |
| `IDEMPOTENCY_PROCESSING_TIMEOUT_MS`    | 2m      |
| `TRANSACTION_HEALTH_CHECK_INTERVAL_MS` | 60s     |

### Optional caps

`MAX_CSV_EXPORT_ROWS`, `CSV_EXPORT_BATCH_SIZE`, `MAX_ATTENDEE_INSIGHTS_ROWS`, `ANALYTICS_CSV_BATCH_SIZE` (see `env-reference.md`).

### Development-only (never production)

- `ALLOW_NON_TXN_BOOKING=true`
- `ALLOW_DESTRUCTIVE_SEED=true` on production hosts

---

## 12. Security checklist

- [ ] `NODE_ENV=production` on the running process
- [ ] All required secrets set, **≥ 32 characters**, not placeholder strings
- [ ] `REDIS_URL` set; Redis reachable only from app tier
- [ ] MongoDB **replica set**; transaction startup probe succeeds
- [ ] `PAYMENT_PROVIDER_WEBHOOK_SECRET` + `PAYMENT_WEBHOOK_IP_ALLOWLIST` set; network ACL on webhook path where possible
- [ ] `TRUST_PROXY` matches trusted proxy hops
- [ ] `FRONTEND_ORIGIN` / `FRONTEND_URL` match real HTTPS SPA origins
- [ ] TLS certificates valid; HTTPS end-to-end for users
- [ ] `COOKIE_SIGNING_SECRET` distinct from JWT secrets
- [ ] Log rotation for `logs/*.log` and PM2 logs
- [ ] Clients send **`Idempotency-Key`** on routes that use idempotency middleware (`POST /api/payments/process`, `POST /api/booking/initiate`, `POST /api/booking/confirm`)
- [ ] SPA obtains CSRF via `GET /api/auth/csrf-token` and sends **`X-CSRF-Token`** on mutating requests (webhook excluded)

---

## 13. Common mistakes

1. **Standalone MongoDB** without replica set → transaction probe **fails** → app **won’t start** with default production config.
2. **Missing `REDIS_URL`** in production → **immediate exit**.
3. **`TRUST_PROXY` unset** behind Nginx → wrong `req.ip` → webhook IP allowlist and rate limits incorrect.
4. **Missing `Origin`** on browser API calls in production → CORS rejection (by design).
5. **Multiple app instances** + **local `uploads/`** without shared storage → inconsistent file access.
6. **Raising `REQUEST_BODY_LIMIT`** without WAF/body limits → easier DoS surface.
7. **Relying on `FROM_EMAIL` only** — also set **`EMAIL_FROM`** for consistent mail behavior.

---

## 14. Production readiness checklist

- [ ] Load balancer health check → `GET /api/health`
- [ ] Rolling deploys with shared Redis and Mongo cluster
- [ ] Backup/restore tested for Mongo (payments + tickets)
- [ ] PSP integration documented (headers, payload shape, retries, clock skew)
- [ ] Email deliverability for verification flows
- [ ] Alerts: 5xx rate, restarts, `security_event` spikes, transaction capability errors, Redis errors

---

## 15. Code reference map

| Topic                                                          | File(s)                          |
| -------------------------------------------------------------- | -------------------------------- |
| Startup, trust proxy, security stack, health, timers           | `server.js`                      |
| Env validation                                                 | `config/validateEnv.js`          |
| Port, secrets struct, URLs                                     | `config/index.js`                |
| Rate limits, JWT times, CSRF cookie names, DB transaction flag | `config/security.js`             |
| Redis rate limiter, emergency mode                             | `middleware/rateLimiter.js`      |
| CSRF + webhook skip                                            | `middleware/csrfProtection.js`   |
| JWT + session enforcement                                      | `middleware/auth.js`             |
| Transaction gate (503)                                         | `middleware/transactionGuard.js` |
| Idempotency                                                    | `middleware/idempotency.js`      |
| Webhook verification                                           | `services/paymentsService.js`    |
| Payment routes                                                 | `routes/payments.js`             |
| Booking routes                                                 | `routes/booking.js`              |
| Transaction retry helper                                       | `utils/transaction.js`           |
| Transaction probe                                              | `utils/transactionHealth.js`     |
| Swagger disabled in prod                                       | `swagger.js`                     |

---

## 16. Production misconfiguration — how deployment fails

This section simulates **wrong production configuration** and maps each case to **observable behavior** in this codebase (exit codes, HTTP status, logs). Use it for deploy checklists and incident runbooks.

### 16.1 Process never listens (startup hard-fail)

These typically produce **restart loops** in Kubernetes/Docker or PM2, or a **single crash** before `Server running on port`.

| Misconfiguration | Mechanism | What you see |
| ---------------- | --------- | -------------- |
| Missing any required env (`NODE_ENV`, `MONGO_URI`, `JWT_*`, `CSRF_SECRET`, `COOKIE_SIGNING_SECRET`, `PAYMENT_HMAC_SECRET`, `QR_HMAC_SECRET`, `SESSION_ENCRYPTION_KEY`, `FRONTEND_URL`) | `config/validateEnv.js` → `process.exit(1)` | Log: `Missing required environment variables: ...` |
| In **production**, missing `PAYMENT_PROVIDER_WEBHOOK_SECRET` or `PAYMENT_WEBHOOK_IP_ALLOWLIST` | Same | Same |
| Secret present but **fewer than 32 characters** or matches weak pattern (`test`, `change_me`, `example`, …) | `validateEnv` → `exit(1)` | `Weak or placeholder secret values detected: ...` |
| `ALLOW_NON_TXN_BOOKING=true` with `NODE_ENV=production` | `validateEnv` → `exit(1)` | Error about non-transactional booking in production |
| Missing `CSRF_SECRET` | `middleware/csrfProtection.js` throws on `require` | `CSRF_SECRET is required` (after `validateEnv` if that passed) |
| Missing `COOKIE_SIGNING_SECRET` | `server.js` throws before `cookieParser` | `COOKIE_SIGNING_SECRET is required` |
| `REDIS_URL` empty / unset in production | `server.js` → `verifyRateLimitRedisConfigured` after Mongo connect | `REDIS_URL is required for production rate limiting` then `exit(1)` |
| Payment webhook config invalid (empty secret or empty allowlist in prod) | `verifyPaymentWebhookSecurity` | `Payment webhook security config invalid: ...` then `exit(1)` |
| Mongo **transactions** required but `probeTransactionCapability()` fails | `verifyDbTransactions` | `MongoDB transactions are required but unavailable` then `exit(1)` |
| `MONGO_URI` unreachable or auth failure | `connectDB` | `MongoDB connection error: ...` then `exit(1)` |
| **`PAYMENT_WEBHOOK_IP_ALLOWLIST` syntactically invalid** (e.g. `not_an_ip`, bad CIDR) | `services/paymentsService.js` builds `WEBHOOK_IP_BLOCKLIST` **at module load** | Uncaught throw: `Invalid webhook allowlist IP/CIDR entry` — can crash during `require('./services/paymentsService')` **after** `validateEnv` accepted a non-empty garbage string |

**Note:** `REDIS_URL` is only checked for **non-empty** string at startup. A **wrong** URL may still allow the process to start; Redis errors appear at runtime (see §16.2).

### 16.2 Starts but critical paths break (HTTP errors or degraded behavior)

| Misconfiguration | Effect |
| ---------------- | ------ |
| **`TRUST_PROXY` unset** (or wrong hop count) behind Nginx/LB | `req.ip` wrong → **`PAYMENT_WEBHOOK_IP_ALLOWLIST`** may reject real PSP traffic (**403** `Webhook source IP not allowed`); rate limits and `security_event` logs use wrong identity |
| **CORS** origins not listed in `FRONTEND_ORIGIN` / `FRONTEND_URL` | Browser **CORS errors**; production rejects requests **without** `Origin` header |
| **JWT issuer/audience** mismatch between token issuer and `JWT_ISSUER` / `JWT_AUDIENCE` | **401** `Invalid token` / issuer / audience messages (`middleware/auth.js`) |
| **Redis down** or unreachable after start | Strict limiters: **429** (emergency cap) or **503** if `RATE_LIMIT_EMERGENCY_MODE=false` (`middleware/rateLimiter.js`) |
| **Mongo transactions** lost after start (election, misconfig) | `requireHealthyTransactions` → **503** on `POST /api/payments/process`, `POST /api/booking/initiate`, `POST /api/booking/confirm` |
| **Missing `Idempotency-Key`** on idempotent routes (non-test) | **400** `Idempotency-Key header is required` (`middleware/idempotency.js`) |
| Webhook **clock skew** beyond `PAYMENT_WEBHOOK_MAX_AGE_MS` | **401** timestamp out of range |
| Webhook **bad HMAC** | **401** invalid signature |
| Webhook **replay** (duplicate `eventId` + signature digest) | **409** duplicate webhook |
| Payment body **amount/currency** mismatch vs stored intent | Verification failure / **400** / failed payment state (`paymentsService`) |

### 16.3 “Healthy” but wrong operationally (no immediate crash)

| Misconfiguration | Effect |
| ---------------- | ------ |
| **`BACKEND_URL` unset** behind TLS terminator | Upload URLs may use **http** or wrong host in JSON (`uploadController.js`) — mixed content or broken image links |
| **PM2 cluster** + **local `uploads/`** only | Files written on instance A; next request on instance B → **missing file** / intermittent 404 for `GET /api/upload/files/:filename` |
| **`REDIS_URL` shared** between staging and prod with same **`REDIS_RATE_LIMIT_PREFIX`** | Cross-environment rate limit leakage |
| **`TRUST_PROXY` too high** (trusts too many hops) | Spoofed `X-Forwarded-For` could distort client IP (operational security risk depending on edge config) |

### 16.4 Quick matrix (if this → then that)

| If … | Then … |
| ---- | ------ |
| Standalone Mongo, no replica set / no transactions | **Startup exit** (default prod `requireTransactions`) |
| `REDIS_URL` empty in production | **Exit** after DB connect |
| Weak / short secrets | **Exit** in `validateEnv` |
| `ALLOW_NON_TXN_BOOKING=true` in prod | **Exit** |
| Invalid webhook allowlist **syntax** | **Crash on module load** of `paymentsService` |
| Wrong Mongo URI / DB down | **Exit** in `connectDB` |
| No `TRUST_PROXY` behind LB | Webhooks **403**; odd rate-limit behavior |
| Wrong CORS origins | SPA **cannot** call API from browser |
| Wrong JWT iss/aud | **401** on protected APIs |
| Redis down at runtime | **429** / **503** on strict-limited routes |
| Tx capability lost at runtime | **503** on payment + booking |
| No `Idempotency-Key` | **400** on payment/booking |
| Cluster + local uploads only | **Intermittent** missing uploads |

### 16.5 How this relates to §10 (failure modes)

- **§10** describes **expected** runtime degradation (Mongo, Redis, webhooks) under partial outages.
- **§16** describes **misconfiguration** and wrong deploy assumptions (same symptoms, different root cause: fix config, not scale).

---

_Last aligned with backend layout and env validation as of repository state; re-verify after major refactors._
