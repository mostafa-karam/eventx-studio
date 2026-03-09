# Database Models

EventX Studio uses Mongoose for document modeling in MongoDB.

## User

Stores all application users (Administrators, Venue Admins, Organizers, and Attendees).

- **Core Fields**: `name`, `email`, `password` (hashed), `role`.
- **RBAC Roles**: `user`, `organizer`, `venue_admin`, `admin`.
- **Methods**: `matchPassword` for login verification.

## Event

Represents a scheduled gathering or show.

- **Key Fields**: `title`, `description`, `date`, `time`, `category`, `venue` (Hall ID).
- **Relationships**: Linked to `User` (as organizer) and `Hall`.
- **Virtuals**: `eventStatus`, `availableSeats` (calculated from capacity vs. ticket count).

## Ticket

Proof of purchase/entry for an event.

- **Fields**: `user`, `event`, `qrCode`, `seatNumber`, `status` (`booked`, `cancelled`, `used`).
- **Logic**: QR code is regenerated only if authenticated.

## Hall

Structural venue components available for booking.

- **Fields**: `name`, `capacity`, `hourlyRate`, `equipment` (array), `setupOptions` (array).
- **Comparison**: Supports comma-separated ID filtering for side-by-side matrices.

## HallBooking

The reservation contract between an Organizer and a Venue.

- **Fields**: `hall`, `organizer`, `date`, `startTime`, `endTime`, `status` (`pending`, `approved`, `rejected`).
- **Constraint**: Events can only be created once the status is `approved`.

## Coupon [NEW]

Proprietary discount code system.

- **Fields**: `code` (unique, indexed), `discountType` (`percentage`|`fixed`), `discountValue`, `maxUses`, `usedCount`, `expiresAt`, `isActive`.
- **Virtual**: `isValid` (checks expiry and usage limits).

## Review

Attendee feedback for events.

- **Fields**: `user`, `event`, `rating` (1-5), `comment`.
- **Reply**: Organizers can patch a `reply` to any review.

## AuditLog

Immutable record of critical oversight actions.

- **Fields**: `action`, `performedBy` (Admin), `targetId`, `changes` (before/after snapshot), `timestamp`.

## Waitlist [NEW]

Queue management for sold-out events.

- **Fields**: `user`, `event`, `joinedAt`.
- **Status**: Users receive a badge and "My Waitlist" tracking in their portal.
