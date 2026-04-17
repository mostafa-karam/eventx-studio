# API Reference

Last updated: 2026-04-17

## Base URL

All backend routes are mounted under:

```text
http://localhost:5000/api
```

## Global API Behavior

- Standard success shape:
  - `{ success: true, data: ... }`
- Standard error shape:
  - `{ success: false, data: null, error: string, message: string }`
- Unsupported method on existing path:
  - `405 Method Not Allowed` with `Allow` header.
- Route missing:
  - `404 Route not found`.
- CSRF:
  - Mutating `/api` routes require `X-CSRF-Token`.
  - Token endpoint: `GET /api/auth/csrf-token`.

## Global Endpoints

- `GET /api/health` - service and DB health
- `GET /api/auth/csrf-token` - CSRF token for mutating requests

## Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /refresh`
- `GET /me`
- `POST /logout`
- `PUT /profile`
- `PUT /change-password`
- `POST /verify-email`
- `POST /resend-verification`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /2fa/setup`
- `POST /2fa/enable`
- `DELETE /2fa`
- `GET /sessions`
- `DELETE /sessions/:sessionId`
- `DELETE /sessions`
- `GET /users` (admin)
- `POST /role-upgrade`
- `GET /role-upgrade-requests` (admin)
- `PUT /role-upgrade-requests/:userId` (admin)
- `DELETE /account`

## Events (`/api/events`)

- `GET /`
- `GET /admin/my-events`
- `GET /:id`
- `POST /`
- `POST /:id/clone`
- `PUT /:id`
- `DELETE /:id`
- `GET /:id/seats`
- `GET /waitlists/my`
- `POST /:id/waitlist`
- `GET /:id/waitlist`
- `POST /:id/waitlist/:waitlistId/approve`
- `GET /:id/attendees/export`
- `POST /:id/publish`
- `POST /:id/cancel`
- Nested reviews router mounted at `/api/events/:eventId/reviews`

## Tickets (`/api/tickets`)

- `POST /book`
- `POST /book-multi`
- `GET /my-tickets`
- `GET /organizer`
- `GET /admin`
- `GET /admin/orphans`
- `POST /admin/orphans/:id/assign`
- `POST /admin/orphans/:id/cancel`
- `GET /:id`
- `PUT /:id/cancel`
- `POST /:id/checkin`
- `GET /event/:eventId`
- `POST /lookup-qr`
- `PUT /:id/refund`

## Booking (`/api/booking`)

- `POST /initiate`
- `POST /confirm`

Notes:
- `POST /confirm` supports idempotent retries through `Idempotency-Key` / `X-Idempotency-Key`.

## Payments (`/api/payments`)

- `POST /process`
- `POST /test-token`

## Users (`/api/users`)

- `GET /profile/me`
- `PUT /profile/me`
- `GET /organizer/:id`
- `GET /` (admin)
- `GET /:id` (admin)
- `PUT /:id` (admin)
- `PUT /:id/status` (admin)
- `DELETE /:id` (admin)

## Analytics (`/api/analytics`)

- `GET /dashboard`
- `GET /attendees`
- `GET /events/:eventId`
- `GET /export`
- `GET /attendee-insights`
- `GET /all-attendee-insights`
- `GET /reports`
- `POST /reports/generate`
- `GET /reports/:id/download`

## Halls and Hall Bookings

`/api/halls`:

- `GET /`
- `GET /:id`
- `GET /:id/availability`
- `POST /`
- `PUT /:id`
- `DELETE /:id` (admin)

`/api/hall-bookings`:

- `GET /`
- `GET /my`
- `POST /`
- `POST /maintenance`
- `PUT /:id/approve`
- `PUT /:id/reject`
- `DELETE /:id`

## Other Routers

- `/api/categories`: CRUD + stats (admin for writes)
- `/api/coupons`: validate + admin CRUD
- `/api/notifications`: list/read/read-all/delete/create/send-booking-confirmation
- `/api/support`: support ticket lifecycle
- `/api/marketing`: campaign CRUD + launch
- `/api/public`: public events and halls
- `/api/search`: global search
- `/api/upload`: image upload and authenticated file retrieval
- `/api/audit-log`: admin audit log listing

## Access Control Summary

- Public routes are mainly under `/api/public` and selected event read endpoints.
- Most business routes require `authenticate`.
- Elevated role checks use middleware (`requireAdmin`, `requireOrganizer`, `requireVenueAdmin`, or `requireRole`).
