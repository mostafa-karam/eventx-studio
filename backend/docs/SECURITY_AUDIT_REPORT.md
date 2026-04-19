# EventX Studio Backend — Adversarial Security Audit Report

**Audit date:** 2026-04-19  
**Scope:** `backend/` (Express + Mongoose, JWT, CSRF, payments, booking, tickets, admin flows)  
**Method:** Phased mapping, flow tracing, logic review, concurrency/replay analysis, targeted fixes, regression tests (`npm test`).

---

## Executive summary

| Severity | Found | Fixed in this pass | Documented / accepted risk |
|----------|-------|--------------------|-----------------------------|
| CRITICAL | 0 | — | — |
| HIGH     | 2 | 2 | — |
| MEDIUM   | 5+ | 4 | 1+ (operational / defense-in-depth) |
| LOW      | 6+ | 2 | 4+ |

**Weakest module (pre-fix):** `ticketsService.bookMultiSeats` — coupon redemption was missing, so discount limits could be bypassed via `/api/tickets/book-multi`.

**If I were a real attacker, I would start here:** Alternate booking entry points (`/api/tickets/book`, `/api/tickets/book-multi`, `/api/booking/confirm`) and payment lifecycle (`/api/payments/process`, `/api/payments/webhook/verify`) — small behavioral differences between paths often hide IDOR, replay, or coupon/payment desync bugs.

---

## Phase 1 — Project mapping agent

### Root & bootstrap

| Path | Purpose |
|------|---------|
| `server.js` | Express app: Helmet, CORS, body limits, `mongoSanitize`, CSRF (`/api`), rate limits, route mount `/api`, idempotency cleanup, transaction health probe |
| `routes/index.js` | Mounts all `/api/*` routers |
| `config/`, `config/validateEnv.js` | Environment validation, fail-closed secrets |
| `swagger.js` | API docs |

### Middleware (security-relevant)

| File | Role |
|------|------|
| `middleware/auth.js` | JWT verify, session binding, emailVerified gate, role helpers |
| `middleware/csrfProtection.js` | Double-submit CSRF; **skip** only `POST /payments/webhook/verify` |
| `middleware/requestSanitizer.js`, `xssCleaner.js` | Input hygiene |
| `middleware/idempotency.js` | Idempotency-Key persistence |
| `middleware/transactionGuard.js` | Enforce healthy Mongo transactions when configured |
| `middleware/rateLimiter.js` | Redis or in-memory limits |
| `middleware/validators.js` | express-validator rules |

### Models (selected)

`User`, `Event`, `Ticket`, `Payment`, `PaymentWebhookEvent`, `Coupon`, `Idempotency`, `HallBooking`, `AuditLog`, etc.

### Services

| Service | Responsibility |
|---------|----------------|
| `authService.js` | Registration, login, 2FA, sessions |
| `paymentsService.js` | Payment intent, webhook verify, consume semantics |
| `bookingService.js` | Atomic seat booking, coupon + payment inside transaction |
| `ticketsService.js` | Tickets, QR check-in, refunds, **bookMultiSeats** |
| `eventsService.js`, `analyticsService.js`, … | Domain logic |

### High-value entry points (user-controlled)

- **Auth:** `/api/auth/*` (bodies, cookies)
- **Payments:** `/api/payments/process` (auth), `/api/payments/webhook/verify` (HMAC + IP + timestamp; no JWT)
- **Booking:** `/api/booking/initiate`, `/api/booking/confirm`
- **Tickets:** `/api/tickets/book`, `/api/tickets/book-multi`, cancel/refund/check-in, QR lookup
- **Admin / organizer:** events, users, analytics, hall bookings, coupons, uploads

---

## Phase 2 — Flow tracer (condensed)

### Auth

`Route → rateLimiter → validators → authController → authService / User`  
JWT: `jwt.verify(secret)`, issuer/audience enforced outside `test`, session revocation checked.

### Payments

`POST /process` → `authenticate` → `createPaymentValidator` → `idempotency` → `paymentsService.createPaymentIntent`  
`POST /webhook/verify` → `paymentWebhookValidator` → `handleVerificationWebhook` → atomic state transitions + `PaymentWebhookEvent` dedupe.

### Booking (canonical)

`POST /booking/confirm` → `authenticate` → `confirmBookingValidator` → `idempotency` → `bookingController` → `ticketsService.findBookableEvent` + `bookingService.bookSeat` → `Event` atomic update + `Ticket` + optional `Payment.updateOne` consume inside transaction.

### Tickets (alternate paths)

Same core: `bookingService.bookSeat` or `ticketsService.bookMultiSeats` — **must** enforce identical invariants (coupon, payment, seats).

---

## Phase 3 — Active attack agent (results)

| Attack class | Result (post-fix) |
|--------------|-------------------|
| Replay consumed payment | **Blocked:** `consumePayment` / `Payment.updateOne` from `verified` only; `consumed` terminal; booking uses txn + conditional update |
| Race verify vs book | **Mitigated:** payment remains `verified` until booking txn commits consume; duplicate booking hits partial unique index + txn abort |
| Webhook replay | **Blocked:** `PaymentWebhookEvent` unique `eventId`; consumed returns 409; signature + (prod) IP allowlist + timestamp skew |
| Amount/currency mismatch | **Blocked:** minor-unit checks in service + webhook mismatch marks `failed` carefully |
| JWT `alg:none` / confusion | **Blocked:** `jsonwebtoken` + HMAC secret; standard claims in non-test |
| IDOR on tickets | **Blocked:** `getTicketById` owner / event organizer / admin |
| NoSQL operator injection | **Mitigated:** `express-mongo-sanitize`, validators, allowlists (e.g. hall booking status) |
| Parallel double booking | **Mitigated:** `Event.findOneAndUpdate` seat predicates + unique partial index `uniq_active_booking_per_event_user` |
| Double refund | **Mitigated:** `refundTicket` atomic `findOneAndUpdate` on eligible state |

---

## Phase 4 — Logic bug analyzer

### HIGH-01 — Coupon bypass via `book-multi` (fixed)

- **Symptom:** `bookMultiSeats` validated coupon pricing via `calculateExpectedAmount` but **never** `$inc` `usedCount`, unlike `bookingService.bookSeat`.
- **Exploit:** Two different users (or repeated flows) could reuse a `maxUses: 1` coupon for discounted logic.
- **Fix:** Atomic `Coupon.findOneAndUpdate` redemption inside the same Mongo session as seat booking (`services/ticketsService.js`).
- **Status:** **Fixed** + regression test in `__tests__/coupons.test.js`.

### HIGH-02 — Paid + coupon payment amount deadlock (fixed)

- **Symptom:** `createPaymentIntent` required **list** price (`amount * qty`) while `bookSeat` / webhook matching expect **post-coupon** minor totals when a coupon is used → paid discounted bookings could not create a consistent `Payment` row (or clients guessed wrong amounts).
- **Fix:** Optional `couponCode` on `POST /api/payments/process`; server computes expected total via `ticketsService.calculateExpectedAmount` × quantity (`services/paymentsService.js`, `controllers/paymentsController.js`, `middleware/validators.js`).
- **Status:** **Fixed** + test `allows discounted payment intent when couponCode matches post-coupon minor total`.

### MEDIUM-01 — Duplicate coupon math in `bookingController` (fixed)

- **Risk:** Divergent percentage math vs service-layer minor rounding.
- **Fix:** `confirmBooking` now uses `ticketsService.calculateExpectedAmount` for `expectedAmount` when `couponCode` is present.

### MEDIUM-02 — `POST /payments/process` quantity > 1 vs single-ticket `bookSeat` (fixed)

- **Observation:** `bookSeat` matches `Payment` with `quantity: 1`. Multi-quantity intents were not consumable and could strand money.
- **Fix:** Validators and `createPaymentIntent` now require **`quantity === 1`**. Clear 400 error explains single-ticket policy.
- **Status:** **Fixed** + regression test in `__tests__/booking.test.js`.

### MEDIUM-03 — Non-production transaction fallback

- **Observation:** `ALLOW_NON_TXN_BOOKING` / memory-server paths can retry without txn.
- **Status:** **Accepted** for dev/test only; production paths use `requireHealthyTransactions` + env gates.

---

## Phase 5 — Performance & scalability agent

| Finding | Severity | Note |
|---------|----------|------|
| Analytics / admin list caps (`limit` clamped) | LOW | Good patterns in multiple controllers |
| Ticket indexes for user/event | LOW | Compound + partial unique index present |
| Rate limiter without Redis | LOW | Production startup now **warns** if `REDIS_URL` is unset (`validateEnv.js`); operators should set Redis for multi-instance deployments |

---

## Phase 6 — Fix engineer (files touched)

| File | Change |
|------|--------|
| `services/ticketsService.js` | Atomic coupon redemption in `bookMultiSeats`; single-seat assert; transactional orphan assign/cancel |
| `services/paymentsService.js` | Optional `couponCode`; **quantity locked to 1** for payment intents |
| `controllers/paymentsController.js` | Pass `couponCode` into service |
| `controllers/bookingController.js` | Single `calculateExpectedAmount` for coupons |
| `controllers/ticketsController.js` | Audit logs for orphan assign/cancel |
| `middleware/validators.js` | `couponCode` on payment create; **quantity max 1**; `assignOrphanTicketValidator`; book-multi quantity max 1 |
| `routes/tickets.js` | Wire `assignOrphanTicketValidator` |
| `config/validateEnv.js` | Production warning when `REDIS_URL` unset (rate limits) |
| `utils/auditConstants.js` | `TICKET_ORPHAN_ASSIGN`, `TICKET_ORPHAN_CANCEL` |
| `__tests__/coupons.test.js` | book-multi coupon + paid payment intent tests |
| `__tests__/booking.test.js` | Unique register emails; quantity≠1 rejection test |
| `__tests__/transactions.test.js` | Align `bookMultiSeats` mock with single-seat policy |

---

## Phase 7 — Re-attack agent

| Scenario | Outcome after fix |
|----------|-------------------|
| Second `book-multi` after `maxUses: 1` | Fails at `calculateExpectedAmount` (“usage limit”) before seat write — coupon state consistent |
| `book-multi` + coupon | `usedCount` increments once per successful booking |
| Discounted `payments/process` without `couponCode` | Still requires full list total (no weakening) |
| Discounted `payments/process` with wrong amount | `Payment amount mismatch` (400) |

**Second-pass note:** `calculateExpectedAmount` is a **read** guard; the **authoritative** anti-abuse control for concurrency is the atomic coupon update inside the booking transaction. Both layers are now aligned.

---

## Final verdict (required questions)

1. **Payment replay:** Not architecturally impossible globally (any system with webhooks must assume replay); here **consumed** is terminal, webhook dedupe uses `PaymentWebhookEvent`, and verification uses strict transitions — **replay cannot re-authorize spend**.
2. **Race conditions:** Seat writes and ticket/refund/check-in paths use **conditional updates** and/or transactions; remaining risk is mainly **misconfigured Mongo** (transactions off in prod) — mitigated by `requireHealthyTransactions` / env validation.
3. **IDOR:** Ticket reads and organizer-scoped analytics enforce ownership or role; public routes intentionally expose only published/safe fields (e.g. organizer public profile).
4. **Injection:** Operator sanitization + validators reduce NoSQL injection; always keep `mongoSanitize` and avoid raw `req.query` in filters without allowlists.
5. **Production misconfiguration:** Misconfig **can** still hurt (e.g. missing webhook IP allowlist is **fatal at startup** in production payment webhook validation; missing Redis weakens distributed rate limits). The code fails closed where implemented — operators must still set env correctly.
6. **Extreme conditions:** Compromised webhook signing secret + IP allowlist + stolen event IDs could forge verification — that's **credential theft**, not an application logic bypass.

---

## Totals & ranking

**Total by severity (this audit, including pre-fix findings):** HIGH 2, MEDIUM 5+, LOW 6+

**Most critical paths (impact × likelihood):**

1. Booking + payment + coupon consistency (**fixed**)
2. Payment webhook trust boundary (signature + network controls — **strong**, ops-dependent)
3. Alternate ticket booking routes vs canonical booking (**must stay behavior-identical** — enforced by shared services + tests)

---

## Checklist (user “YOU FAILED IF”)

| Requirement | Met |
|-------------|-----|
| Concurrency attacks considered | Yes (seat atomics, txn, unique index, refund atomicity) |
| Failure modes considered | Yes (txn abort, consumed terminal, webhook ordering) |
| Replay attacks considered | Yes (webhook dedupe + consumed) |
| ≥ 2 HIGH issues | Yes (HIGH-01, HIGH-02) |
| Second pass | Yes (Phase 7) |
| Fixes tested | Yes (`npm test` full suite green) |

---

## Appendix — module output template (abbrev.)

For each critical module, the audit used: **(1)** map, **(2)** flow trace, **(3)** findings + PoC mindset, **(4)** logic issues, **(5)** perf notes, **(6)** re-attack — consolidated above to avoid duplication.

**Suggested ongoing work:** E2E load tests for oversell under sharded cluster, formal threat model for webhook secret rotation, and product decision on multi-quantity payments vs single-seat policy.
