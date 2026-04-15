# EventX Studio Backend Docs

This folder contains the backend technical references for the Node.js + Express + MongoDB API.

## Start Here

- [Setup Guide](./setup.md) - local setup, environment, run scripts
- [API Reference](./api-reference.md) - current route map under `/api`
- [Security Guide](./security.md) - active security controls and hardening notes
- [Security Audit 2026-04](./security-audit-2026-04.md) - latest code audit findings and priorities
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
