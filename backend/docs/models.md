# Database Models Reference

Last updated: 2026-04-17

## Core Principles

- Models are Mongoose-based with timestamps and indexes for high-traffic lookups.
- Authorization and business invariants are enforced in services, with schema-level constraints as safety net.
- High-risk invariants (like active booking uniqueness) are enforced at DB index level.

## Key Models

### `User`
- Identity, auth state, role, and session tracking.
- Supports active session lists and refresh-token/session revocation workflows.
- Used by auth hardening (account lock/deactivation/verification checks).

### `Event`
- Event metadata, venue, pricing, seating/capacity, analytics counters, status.
- Event status drives visibility and booking eligibility (`draft`, `published`, `cancelled`, `completed`).

### `Ticket`
- Represents user booking/check-in state for an event.
- Includes signed QR payload, payment metadata, and check-in details.
- Includes partial unique index preventing duplicate active bookings for single-booking flow:
  - Unique `(event, user)` when status is active and not bulk-booking metadata.
- Stores optional idempotency key for retry-safe booking confirmation.

### `Waitlist`
- Pending/notified queue for sold-out events.
- Used by booking cancellation and event lifecycle flows.

### `Notification`
- Persisted user notifications with type/priority/action URL and metadata.

### `Coupon`
- Discount rules (fixed/percentage), usage caps, validity windows, and event scope.

### `Hall` and `HallBooking`
- Venue inventory and hall rental workflow separate from attendee ticketing.

### `Review`
- Event review/rating domain.

### `AuditLog`
- Security and compliance activity trail for critical actions.

### Supporting Models

- `EventCategory`
- `Campaign`
- `Report`
- `Upload`

## Indexing Notes

- Ticket model includes indexes for:
  - status
  - booking date
  - user/status query patterns
  - payment status
  - unique active booking constraint
- Event and notification models include indexes to support listing/filtering paths.
