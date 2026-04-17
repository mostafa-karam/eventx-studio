# Scripts Guide

Last updated: 2026-04-17

## NPM Script Map

- `npm run seed` -> `node utils/seed.js`
- `npm run seed:all` -> `node scripts/seed.js`
- `npm test` -> `jest --detectOpenHandles --forceExit`

## `utils/seed.js` (Lightweight Dev Seed)

Purpose:

- Seeds or updates core development users only.
- Skips execution when `NODE_ENV=production`.
- Requires `DEMO_SEED_PASSWORD`.

Behavior:

- Creates/updates fixed dev identities (`admin`, `venue_admin`, `organizer`, `user`).
- Preserves non-seed users.

## `scripts/seed.js` (Full Dataset Seed)

Purpose:

- Creates a full realistic dataset (users, halls, events, tickets, coupons, reviews, notifications, campaigns, audit logs).
- Requires `DEMO_SEED_PASSWORD`.

Important:

- Destructive reset across many collections before re-seeding.
- Intended for local/staging only.
- Current console output still mentions static `password123` even though password comes from `DEMO_SEED_PASSWORD`; treat the env value as source of truth.

## Other Script

- `scripts/checkUsers.js` - utility script for user checks/inspection.

## Safety Notes

- Never run destructive seed scripts against production data.
- Never commit `.env` with real secrets or seed passwords.
- Keep seeding and script execution in isolated non-production databases.
