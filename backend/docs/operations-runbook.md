# Operations Runbook

Last updated: 2026-04-17

## Startup

1. Ensure required env vars are set (`env-reference.md`).
2. Start backend:

```bash
npm start
```

3. Confirm service health:

```bash
GET /api/health
```

Expected response includes `success: true` and `data.status`, `data.timestamp`, and `data.dbStatus`.

## Runtime Endpoints

- Root: `GET /`
- Health: `GET /api/health`
- Swagger UI: `/api-docs` (non-production only)

## Logging

- Development: morgan `dev` format
- Non-development: structured request format
- App logs use backend logger utility
- Security-related logs include failed login attempts and suspicious auth activity

## Graceful Shutdown

- Handles `SIGTERM` and `SIGINT`.
- Stops accepting new requests, then closes MongoDB connection.
- Forces process exit after timeout if shutdown hangs.

## Common Incident Checks

1. `dbStatus` from health endpoint is `connected`.
2. CORS origin matches `FRONTEND_ORIGIN`/`FRONTEND_URL`.
3. CSRF token retrieval works from `GET /api/auth/csrf-token`.
4. Rate limits are not over-triggering due to proxy misconfiguration.
5. Required secrets are present and non-empty.
6. If running multiple instances, confirm Redis connectivity (`REDIS_URL`) for shared limits.
7. Confirm `Allow` header behavior on unsupported methods (`405` checks).

## Upload and Mail Operational Notes

- Upload retrieval is authenticated (`/api/upload/files/:filename`).
- In dev without SMTP host, email may be written to a local temp sink.
- Ensure dev sinks are not used in production workflows.

## Transaction and Data Consistency Notes

- Multi-collection critical operations use transaction retry helpers.
- In non-replica local environments, transaction-required flows can use safe fallback behavior.
- For production consistency, run MongoDB as replica set and keep transaction support enabled.
