# Backend Security Guide

This backend applies layered controls across transport, auth/session, CSRF, input handling, and abuse prevention.

## Core Controls

- `helmet` with CSP nonces and production HSTS.
- Global rate limiter and route-specific auth limiters.
- Request sanitization middleware plus `express-mongo-sanitize`.
- `hpp` for HTTP parameter pollution defense.
- JWT access and refresh token separation.
- Cookie parsing with dedicated `COOKIE_SIGNING_SECRET`.

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
- Upload metadata is persisted and file reads are access-controlled:
  - owner or admin only
  - cross-user filename guessing does not grant access
- Retrieval endpoint: `GET /api/upload/files/:filename`.
- Response uses `X-Content-Type-Options: nosniff`.

## CORS and Proxy Notes

- Allowed origins come from `FRONTEND_ORIGIN` or `FRONTEND_URL`.
- In production, requests without `Origin` are rejected.
- Set `TRUST_PROXY` only when behind a trusted reverse proxy.

## Security Posture Notes

- QR check-in requires signed JSON payloads; raw/unsigned ticket IDs are rejected.
- Simulated payment token minting endpoints are gated in production.
- Refresh-token flow validates user active/verified state.
- Password reset revokes refresh/session state.
- Hall-booking visibility and counts are scoped to authorization context.

Residual operational risk to track:
- Development email sink writes links/tokens to local temp logs when SMTP is not configured (acceptable for local dev only).
