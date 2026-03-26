# Backend Audit

## Scope

This audit covers the application backend under `backend/` with emphasis on:

- security vulnerabilities
- authorization mistakes
- payment and booking integrity
- session and authentication logic
- data consistency and business-logic defects

This is a source-code audit, not a penetration test. Findings below are based on code inspection.

## Findings

### Critical

#### 1. Paid bookings can be confirmed without verified payment

Files:

- `backend/controllers/bookingController.js`
- `backend/controllers/paymentsController.js`

Evidence:

- `confirmBooking` accepts `paymentId` and immediately calls `bookingService.bookSeat(...)` without verifying a payment token or validating the paid amount.
- `processPayment` signs a token using client-supplied `amount`, but `confirmBooking` never checks that token.

Impact:

- A client can confirm a paid booking without proving payment.
- The booking flow trusts a user-controlled payment identifier instead of server-verified payment state.

Recommended fix:

- Require a signed payment token in `confirmBooking`.
- Verify token signature, user, event, amount, and expiry before booking.
- Bind payment proof to the exact event price and booking quantity.

#### 2. Ticket booking reserves seats before payment-token validation

File:

- `backend/controllers/ticketsController.js`

Evidence:

- `bookTicket` atomically books the seat at lines 107-126.
- Payment-token verification happens later at lines 135-150.

Impact:

- An invalid or expired payment token can still reserve a seat and update event analytics before the request is rejected.
- The system can end up with booked seats and no valid ticket/payment record.

Recommended fix:

- Move payment-token verification ahead of any seat mutation.
- Wrap booking and ticket creation in a transaction or add explicit rollback on failure.

#### 3. Payment amount is client-controlled and not bound to event pricing

Files:

- `backend/controllers/paymentsController.js`
- `backend/controllers/ticketsController.js`

Evidence:

- `processPayment` signs a payment token from `req.body.amount`.
- Booking code later trusts `transactionId` existence rather than validating the paid amount against the event price.

Impact:

- A malicious client can simulate a lower payment amount and still complete a full-price booking.
- This breaks payment integrity for paid events.

Recommended fix:

- Derive payable amount from the event record on the server.
- Include server-computed amount, currency, quantity, and coupon outcome in the signed payment payload.
- Reject booking if token payload does not match the current booking request exactly.

### High

#### 4. Booking analytics are double-counted for seat-mapped events

File:

- `backend/services/bookingService.js`

Evidence:

- `event.bookSeat(...)` already updates `availableSeats`, `analytics.bookings`, and `analytics.revenue`.
- The service increments `event.analytics.bookings` and `event.analytics.revenue` again at lines 81-85.
- Cancellation similarly decrements bookings again at lines 155-158 after `event.cancelSeat(...)` already changed analytics.

Impact:

- Analytics become inflated on booking and deflated twice on cancellation.
- Revenue and booking counts become unreliable.

Recommended fix:

- Make seat and analytics updates live in one place only.
- Prefer a single service path with no duplicated model-side mutation.

#### 5. Password-reset rate limiter is mounted too late to protect the reset routes

File:

- `backend/server.js`

Evidence:

- `app.use('/api/auth', authLimiter, authRoutes);` mounts the auth router first.
- Password reset limiters are mounted afterward on lines 200-202.

Impact:

- Requests to `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` are handled by the auth router before the dedicated limiter is reached.
- The intended stricter protection is effectively bypassed.

Recommended fix:

- Apply reset-specific limiters directly on the router endpoints or mount them before the route handlers.

#### 6. Upload validation is weak because byte-level MIME verification is effectively disabled

Files:

- `backend/controllers/uploadController.js`
- `backend/routes/upload.js`
- `backend/package.json`

Evidence:

- Route-level filtering trusts `file.mimetype`.
- Controller attempts to import `file-type`, but the package is not present in `package.json`.
- When import fails, the code logs a warning and skips byte-level validation.

Impact:

- Attackers can spoof MIME types and upload non-image content.
- Uploaded files are later served publicly from `/uploads`, increasing stored-content risk.

Recommended fix:

- Add `file-type` as a real dependency.
- Reject files when byte-level type cannot be verified.
- Enforce extension allowlist and safer serving headers.
- Add upload-specific rate limiting.

#### 7. Support ticket status can be changed by end users despite being documented as a staff action

Files:

- `backend/controllers/supportController.js`
- `backend/routes/support.js`

Evidence:

- `updateTicketStatus` allows the ticket owner or admin to update status.
- Route only requires `authenticate`.

Impact:

- End users can mark their tickets as resolved, closed, or in-progress.
- Workflow integrity is lost for support operations.

Recommended fix:

- Restrict status updates to admin/support roles only.
- Add explicit status validation and transition rules.

#### 8. Self-registration can assign organizer role, bypassing the manual role-upgrade workflow

Files:

- `backend/services/authService.js`
- `backend/middleware/validators.js`
- `backend/controllers/authController.js`

Evidence:

- Registration validator allows `role` values `user` and `organizer`.
- Auth service accepts self-registration into `organizer`.
- Separate role-upgrade endpoints exist, which implies organizer elevation is supposed to be controlled.

Impact:

- Any user can become an organizer at sign-up without approval.
- This weakens role separation and expands access to organizer-only features.

Recommended fix:

- Restrict self-registration to `user` only.
- Keep organizer access behind the role-upgrade approval flow.

### Medium

#### 9. Review soft-delete logic does not work as intended

Files:

- `backend/controllers/reviewsController.js`
- `backend/models/Review.js`

Evidence:

- Deleting a review only sets `deletedAt`.
- Listing reviews does not exclude `deletedAt != null`.
- The unique index is still `{ event, user }` with no soft-delete condition.

Impact:

- “Deleted” reviews still remain visible unless filtered elsewhere.
- Users cannot create a replacement review after deletion, despite the cooldown comment.

Recommended fix:

- Exclude soft-deleted reviews from read queries.
- Replace the unique index with a partial index on active reviews only.
- Implement actual cooldown logic if required.

#### 10. Notification feed leaks global event activity to ordinary authenticated users

File:

- `backend/controllers/notificationsController.js`

Evidence:

- For non-admin users, `eventFilter` is still `{}`.
- The endpoint returns recent events for all users, not only relevant user-scoped notifications.

Impact:

- Users can see system-wide event activity unrelated to them.
- This is an information-disclosure and data-scoping defect.

Recommended fix:

- Scope non-admin notifications to the current user or their own bookings.
- Separate real notification records from synthetic dashboard activity.

#### 11. Analytics export is incorrectly filtered for admin-only routes

File:

- `backend/controllers/analyticsController.js`

Evidence:

- `exportAnalytics` is an admin route, but event export filters on `organizer: req.user._id`.
- Ticket export also matches populated event organizers to `req.user._id`.

Impact:

- Admin exports can return incomplete or empty data.
- The route behavior does not match its authorization model.

Recommended fix:

- If admin-only, export the requested dataset without organizer scoping.
- If organizer-scoped export is desired, change route authorization accordingly.

#### 12. Attendance-rate calculation is broken

File:

- `backend/controllers/analyticsController.js`

Evidence:

- `attendanceRate` filters `attendees` by `a.status === 'attended'`.
- The attendee objects built by the analytics service do not include a `status` field.

Impact:

- Attendance rate will always be `0`.

Recommended fix:

- Include ticket/check-in status in the attendee dataset or compute attendance directly from tickets.

#### 13. User status management writes a field that does not exist in the schema

Files:

- `backend/controllers/usersController.js`
- `backend/models/User.js`

Evidence:

- `updateUserStatus` writes `user.status`.
- The `User` schema uses `isActive`, not `status`.

Impact:

- The endpoint does not control account activation as intended.
- Admins may believe a user is suspended while authentication still relies on `isActive`.

Recommended fix:

- Replace `status` handling with explicit account-state fields that exist in the schema.
- Keep admin user-management endpoints aligned with auth middleware checks.

#### 14. Account deletion does not clear active sessions correctly

Files:

- `backend/controllers/authController.js`
- `backend/models/User.js`

Evidence:

- Deletion writes `user.sessions = []`, but the schema stores `activeSessions`.

Impact:

- Existing session records may survive account deletion/anonymization logic.

Recommended fix:

- Clear `activeSessions` explicitly.
- Add tests verifying that deleted accounts cannot keep active sessions.

### Low

#### 15. Coupon audit logging uses values that do not match the audit schema enums

Files:

- `backend/controllers/couponController.js`
- `backend/models/AuditLog.js`

Evidence:

- Coupon creation writes `action: 'create'` and `resource: 'coupon'`.
- The audit schema enumerates values like `event.create`, `user.update`, and resource names such as `User`, `Event`, `Auth`.

Impact:

- Audit log writes can fail validation.
- Coupon creation can return a server error after the coupon was already created.

Recommended fix:

- Align audit action/resource values with the schema.
- Consider moving all audit writes to the centralized audit service.

## Summary

The most important backend risks are concentrated in:

1. payment and booking integrity
2. authorization boundaries
3. upload safety
4. inconsistent account/session state
5. analytics and workflow correctness

The first implementation phase should prioritize critical booking/payment fixes and high-risk authorization hardening before broader refactors.
