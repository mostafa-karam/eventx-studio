# Backend Security Guide

This backend applies layered controls across transport, auth/session, CSRF, input handling, and abuse prevention.

## Core Controls

- `helmet` with CSP nonces and production HSTS.
- Global rate limiter and route-specific auth limiters.
- Request sanitization middleware plus `express-mongo-sanitize`.
- `hpp` for HTTP parameter pollution defense.
- JWT access and refresh token separation.
- Cookie parsing with signed/secure handling support.

## Secrets and Sensitive Configuration

Use unique random values for:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYMENT_HMAC_SECRET`
- `QR_HMAC_SECRET`
- `SESSION_ENCRYPTION_KEY`
- `CSRF_SECRET`

Never reuse one secret for multiple domains.

## CSRF Model

- CSRF protection is mounted on `/api`.
- Safe methods (`GET`, `HEAD`, `OPTIONS`) are exempt.
- Mutating requests must include `X-CSRF-Token`.
- Token endpoint: `GET /api/auth/csrf-token`.

## Upload Hardening

- Upload route requires authentication.
- Current implementation validates both extension and file signature before serving.
- Retrieval endpoint: `GET /api/upload/files/:filename`.
- Response uses `X-Content-Type-Options: nosniff`.

## CORS and Proxy Notes

- Allowed origins come from `FRONTEND_ORIGIN` or `FRONTEND_URL`.
- In production, requests without `Origin` are rejected.
- Set `TRUST_PROXY` only when behind a trusted reverse proxy.

## Known Security Gaps (Current Audit)

The following issues were identified and should be remediated:

1. High: `venue_admin` can currently list platform-wide hall bookings instead of own halls only.
2. Medium: event create/update controllers rely on `req.body` instead of strictly using validated payload.
3. Medium: `verify-email` and `resend-verification` do not have dedicated abuse rate limiting.
4. Medium: coupon mutations lack explicit request validators.
5. Low: upload MIME signature check performs synchronous file reads.
6. Low: development email sink can store sensitive links/tokens in plain temp logs.

Track these items in engineering backlog and validate fixes with regression tests.
