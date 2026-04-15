# Operations Runbook

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

Expected response includes `status`, `timestamp`, and `dbStatus`.

## Runtime Endpoints

- Root: `GET /`
- Health: `GET /api/health`
- Swagger UI: `/api-docs` (non-production only)

## Logging

- Development: morgan `dev` format
- Non-development: structured request format
- App logs use backend logger utility

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

## Upload and Mail Operational Notes

- Upload retrieval is authenticated (`/api/upload/files/:filename`).
- In dev without SMTP host, email may be written to a local temp sink.
- Ensure dev sinks are not used in production workflows.
