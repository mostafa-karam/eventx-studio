# Backend Implementation Plan

## Goal

This plan turns the backend audit into a practical remediation roadmap with priority, implementation steps, and acceptance criteria.

## Phase 1: Stop Critical Revenue and Booking Integrity Failures

Timeline: 3 to 5 days

### Objectives

- Prevent unpaid or underpaid bookings.
- Prevent seat mutation before payment proof is verified.
- Eliminate booking analytics corruption.

### Tasks

1. Redesign the payment proof contract.
   - Compute booking amount on the server from event price, quantity, and coupon state.
   - Sign server-side payment payloads with event ID, user ID, amount, quantity, and expiry.
2. Fix `bookingController.confirmBooking`.
   - Require verified payment token.
   - Reject confirmation when token, amount, event, or user mismatch.
3. Fix `ticketsController.bookTicket`.
   - Verify payment token before reserving a seat.
   - Add rollback or transactional protection if ticket creation fails after seat mutation.
4. Fix `bookingService`.
   - Remove duplicate analytics updates.
   - Keep booking and cancellation counters consistent.
5. Add tests for:
   - paid booking without token
   - paid booking with tampered amount
   - failed token verification does not reserve seat
   - successful booking updates seats and analytics exactly once

### Acceptance Criteria

- A paid event cannot be booked without valid payment proof.
- Seat counts do not change when payment validation fails.
- Revenue and booking counters remain correct after book/cancel cycles.

## Phase 2: Harden Auth, Session, and Role Controls

Timeline: 4 to 6 days

### Objectives

- Close role escalation paths.
- align account-state behavior
- make session invalidation reliable

### Tasks

1. Restrict self-registration to `user` role only.
2. Keep organizer access behind the role-upgrade approval flow.
3. Fix account deletion to clear `activeSessions`.
4. Review logout and session removal behavior for cookie clearing and refresh-token invalidation.
5. Add tests for:
   - user cannot self-register as organizer
   - deleted account invalidates all active sessions
   - removed sessions cannot continue using old tokens

### Acceptance Criteria

- Role escalation requires explicit approval.
- Deleted accounts do not retain usable sessions.
- Session-management flows behave consistently under test.

## Phase 3: Fix Authorization and Workflow Leaks

Timeline: 3 to 5 days

### Objectives

- Ensure only authorized actors can mutate sensitive data.
- Prevent ordinary users from using staff-only or admin-only flows.

### Tasks

1. Restrict support ticket status changes to support/admin roles.
2. Review categories and marketing routes and apply explicit role guards.
   - Categories should likely be admin-managed.
   - Marketing should likely be organizer/admin only.
3. Scope notification feeds to the requesting user unless the user is admin.
4. Review any remaining authenticated-only mutation routes for missing role checks.
5. Add RBAC tests for:
   - support status updates
   - category management
   - campaign management
   - notification visibility

### Acceptance Criteria

- User-facing accounts cannot access staff workflows.
- Sensitive management endpoints are protected by explicit role checks.
- Non-admin users do not receive global operational data.

## Phase 4: Secure File Uploads

Timeline: 2 to 4 days

### Objectives

- Prevent spoofed content uploads.
- reduce stored-file abuse risk

### Tasks

1. Add `file-type` to backend dependencies.
2. Make byte-level MIME verification mandatory.
3. Reject uploads when MIME sniffing fails.
4. Add upload-specific rate limiting.
5. Review file-serving behavior:
   - safer content disposition
   - cache policy
   - extension handling
6. Add tests for:
   - spoofed MIME uploads
   - oversized files
   - unsupported file extensions

### Acceptance Criteria

- Only validated image formats can be uploaded.
- Upload abuse is rate-limited.
- Invalid files are rejected before they become public assets.

## Phase 5: Repair Broken Business Logic

Timeline: 4 to 6 days

### Objectives

- Fix endpoints whose behavior does not match their intended design.

### Tasks

1. Fix review soft-delete behavior.
   - exclude soft-deleted reviews from reads
   - replace unique index with a partial active-review index
   - implement real cooldown logic if still required
2. Fix user status management to use actual schema fields.
3. Fix analytics export scoping for admin-only endpoints.
4. Fix attendance-rate calculation to use real status/check-in data.
5. Fix organizer QR lookup so organizers can scan tickets for their own events.
6. Fix refund flow so general-admission or missing seat-map cases do not break event state.
7. Add tests for each repaired workflow.

### Acceptance Criteria

- Review lifecycle behaves as described.
- Admin exports return expected data.
- User-management state affects auth as intended.
- Organizer ticket scanning works for organizer-owned events.

## Phase 6: Validation and Defensive Consistency

Timeline: 1 week

### Objectives

- Reduce unsafe input handling and controller drift.

### Tasks

1. Expand validators across all write endpoints.
2. Add consistent page-size caps for list endpoints.
3. Normalize error handling around shared helpers.
4. Move audit writes to the audit service and align enum usage.
5. Add regression tests for:
   - invalid IDs
   - malformed payloads
   - forbidden role access
   - invalid status transitions

### Acceptance Criteria

- All write endpoints validate input explicitly.
- Pagination and filtering are bounded.
- Audit writes do not fail because of inconsistent action/resource names.

## Recommended Order

Implement in this order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## Test Plan

Minimum backend test expansion should include:

- auth registration, login, logout, refresh, lockout, 2FA setup/enable/disable
- role-upgrade workflow
- payment token verification
- paid and free booking flows
- ticket cancellation and refund consistency
- RBAC on admin, organizer, venue-admin, and support-sensitive routes
- upload rejection cases
- review lifecycle and soft-delete behavior

## Definition of Done

The backend plan is considered complete when:

- paid bookings cannot be forged or underpaid
- seat and analytics state remain consistent through booking lifecycle operations
- role escalation and staff-only actions are properly protected
- upload validation is enforced at byte level
- broken workflow endpoints behave according to their documented intent
- automated tests cover critical security and business logic paths
