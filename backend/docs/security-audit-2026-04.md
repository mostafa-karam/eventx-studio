# Security Audit - 2026-04-15

Scope: backend Node.js + Express + MongoDB codebase.

## Findings by Severity

### High

1. Hall booking overexposure for `venue_admin`
   - Area: `controllers/hallBookingsController.js` (`getPlatformBookings`)
   - Risk: `venue_admin` can enumerate bookings beyond owned halls.
   - Action: filter bookings to halls owned by authenticated venue admin.

### Medium

1. Event create/update path uses raw `req.body`
   - Area: `controllers/eventsController.js`
   - Risk: unvalidated fields may flow into service/model updates.
   - Action: use `req.validatedBody` consistently and reject unknown fields.

2. Missing abuse limiter for email verification routes
   - Area: `routes/auth.js` (`/verify-email`, `/resend-verification`)
   - Risk: endpoint spam and potential email flooding.
   - Action: add dedicated limiter keyed by IP and normalized account context.

3. Missing request validators for coupon mutations
   - Area: `routes/coupons.js`
   - Risk: weak input validation hardening and noisy failure paths.
   - Action: add `express-validator` chains for create/update/validate payloads.

### Low

1. Synchronous file reads during upload checks
   - Area: `controllers/uploadController.js`
   - Risk: event loop blocking under concurrent uploads.
   - Action: move MIME signature checks to async/stream path.

2. Development email sink may persist sensitive links
   - Area: `utils/emailService.js`
   - Risk: verification/reset links in plain temp storage.
   - Action: explicit opt-in, sanitize payload, and rotate/delete sink output.

3. Seed script output mismatch
   - Area: `scripts/seed.js`
   - Risk: logs suggest static passwords while runtime uses `DEMO_SEED_PASSWORD`.
   - Action: align log text with actual secret source.

## Documentation Gaps Closed in This Update

- Replaced stale `/api/v1` references with `/api`.
- Updated auth endpoints and methods (including 2FA/session routes).
- Added standalone env reference and operations runbook.
- Updated testing and scripts documentation to current scripts and suites.

## Recommended Next Fix Order

1. Hall booking data scoping (high)
2. Event payload strict validation
3. Verification endpoint abuse limiter
4. Coupon validators
5. Upload async signature checks
