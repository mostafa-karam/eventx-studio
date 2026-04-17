# EventX Studio Backend Docs

This folder contains the backend technical references for the Node.js + Express + MongoDB API.
Last updated: 2026-04-17

Last updated: 2026-04-17

## Start Here

- [Setup Guide](./setup.md) - local setup, environment, run scripts
- [API Reference](./api-reference.md) - current route map under `/api`
- [Security Guide](./security.md) - active security controls and hardening notes
- [Environment Reference](./env-reference.md) - required/optional variables and examples
- [Testing Guide](./testing-guide.md) - test architecture and suite behavior
- [Scripts Guide](./scripts-guide.md) - seeding and utility scripts
- [Operations Runbook](./operations-runbook.md) - startup, health checks, shutdown, incident basics

## Supporting References

- [Architecture](./architecture.md)
- [Codebase Map](./codebase-map.md)
- [Models](./models.md)
- [Services Reference](./services-reference.md)
- [Middleware Reference](./middleware-reference.md)

## Runtime Basics

- API base path: `http://localhost:5000/api`
- Health endpoint: `GET /api/health`
- Swagger UI: `/api-docs` (available only outside production)

## Latest Backend Notes

- Booking confirmation is idempotent when `Idempotency-Key` is provided.
- Unsupported methods now return `405` with an `Allow` header.
- Rate limiting supports Redis-backed distributed counters (`REDIS_URL`) with graceful memory fallback.
- Critical multi-collection event operations use transaction retry helpers for stronger consistency.
- Docs in this folder are synchronized with current backend behavior and env requirements.

## Standard Local Commands

```bash
npm install
npm run dev
```

Optional seeding:

```bash
npm run seed      # lightweight dev users
npm run seed:all  # full dataset seed
```
