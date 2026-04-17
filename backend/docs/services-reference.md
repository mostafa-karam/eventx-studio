# Services Reference (Business Logic)

The `/services` directory is the most critical infrastructure layer in the backend. Controllers should be "thin"—only parsing requests and formatting responses. If a process requires modifying multiple models simultaneously, it must be contained in a Service object to prevent concurrency bugs and race conditions.

## 1. `bookingService.js` (Atomicity Central)

The core transaction engine for the platform. Booking a ticket cannot simply be a `Ticket.create` operation.

### `bookSeat({ eventId, userId, seatNumber, payment, couponCode, metadata, idempotencyKey })`
- **Verification Hook**: Resolves a bookable event through `ticketsService.findBookableEvent()` (published + not past date).
- **Atomic Seat Mutation**: Uses DB-level atomic updates (`findOneAndUpdate`) to mark seat state and adjust capacity/analytics safely.
- **Coupon Enforcement**: Validates coupon applicability and expected payment amount server-side before ticket issue.
- **Transaction Handling**:
  - Uses MongoDB transactions when `ENABLE_TRANSACTIONS=true`.
  - In production, if transactions are explicitly required but unavailable, fails closed with operational error.
  - In non-transactional dev/test fallback, applies compensating rollback logic.
- **Notification**: Sends confirmation through `notificationService.notify(...)` after persistence.
- **Idempotency**: Supports replay-safe booking confirm calls using idempotency keys.
- **Data Integrity Indexing**: Enforced unique active booking constraint at the ticket model layer.

### `cancelBooking(ticketId, userId)`
- Reverses booking inside a transaction (with retry helper) and unlocks capacity/seat state.
- Checks the `Waitlist` queue; if a pending user matches, re-sends availability `Notification`.

## 1.1 `eventLifecycleService.js` (Critical multi-collection orchestration)

### `cancelEvent(eventId, organizer, reason)`
- Performs event cancellation + ticket cancellation + attendee notifications as one atomic operation when transactions are available.
- Includes retry logic for transient transaction failures and safe fallback for unsupported local topologies.

## 1.2 `eventsService.js` (Event CRUD + deletion safety)

### `deleteEvent(eventId, user)`
- Cascades deletion across `Event`, `Ticket`, `Waitlist`, `HallBooking`, and related notifications.
- Uses shared transaction retry utility to keep multi-collection state consistent.

## 2. `ticketsService.js` (Ticket lifecycle + QR integrity)

### `checkinByQR(qrCode, eventId, user)`
- Requires JSON QR payload with `ticketId` + `sig`.
- Rejects non-JSON/raw ticket IDs (fail-closed).
- Verifies HMAC signature using `QR_HMAC_SECRET`.
- Enforces organizer/admin authorization for check-in.

### `bookMultiSeats(...)`
- Updates seat-map state and inserts tickets as a single unit when transactions are enabled.
- Executes the post-insert population query while session is active (avoids closed-session query errors).

## 3. `analyticsService.js` (Aggregation Logic)

Pulls heavy calculation loads away from standard controllers. Leverages Node optimizations for grouping big datasets.

### Key analytics methods
- `getDashboardOverview()` for global KPI metrics.
- `getAttendeeDemographics(user, eventId?)` with organizer/event scoping.
- `getAttendeeGrowth(user, eventId?)` now supports per-event growth scoping.
- Aggregations use MongoDB pipelines for performance and consistency.

## 4. `notificationService.js` (Broadcast Signals)

A unified sender. Instead of controllers making messy `Notification.create` queries, this provides clean wrappers:
### `notify(userId, payload)`
Creates the `Notification` record safely checking inputs for `priority` and `actionUrl`.
```javascript
// Usage anywhere in the system:
notificationService.notify(user._id, {
    title: 'Event Published',
    message: 'Your event is live!',
    priority: 'high'
});
```
