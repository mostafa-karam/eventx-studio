# Repository Audit And Implementation Plan

Generated: 2026-04-04
Workspace: `M:\Privet\Prog lang\MAIM\eventx-studio`

## Scope

This audit reviewed the current repository contents across:

- Frontend app structure
- Backend app structure
- Shared contracts and duplicated models
- Routes, controllers, services, middleware, validation
- Auth, authorization, sessions, CSRF, uploads, notifications
- Models, schemas, seed scripts, env files, package manifests
- Tests, linting, build behavior, docs, CI/CD, Docker, setup assets

This report is based on the files that exist in the repository. Where something is concluded from an absence of files or config, it is explicitly marked as `Inference`.

## Verification Performed

The audit included direct file inspection plus local verification:

- Frontend lint: failed with `130 errors` and `30 warnings`
- Frontend build: passed, but Vite warned about oversized chunks
- Backend Jest: failed before meaningful execution because Jest could not parse the ESM `file-type` dependency required by `backend/controllers/uploadController.js`

Key commands executed:

- `node frontend/eventx-frontend/node_modules/eslint/bin/eslint.js .`
- `node frontend/eventx-frontend/node_modules/vite/bin/vite.js build`
- `node backend/node_modules/jest/bin/jest.js --runInBand --detectOpenHandles --forceExit`

## 1. Executive Summary

Overall repo health is mixed.

The backend has several good security foundations in place:

- `backend/server.js` includes Helmet, CORS allow-listing, rate limiting, mongo sanitization, compression, CSRF middleware, and env validation
- `backend/routes/upload.js` and `backend/controllers/uploadController.js` enforce file size limits, randomized filenames, extension checks, and byte-level MIME validation
- Frontend auth is cookie-based rather than localStorage-token-based

The main problem is not a total absence of safeguards. It is severe contract drift and feature drift between frontend, backend, and documentation. Several core flows are currently broken or misleading:

- Paid booking
- Hall booking and maintenance scheduling
- Organizer ticket management and check-in
- Notification actions
- Session revocation semantics
- Setup/deployment expectations

### Severity Count

- Critical: 3
- High: 4
- Medium: 8
- Low: 3

### Main Risks

1. Session revocation is ineffective, so deleting sessions does not actually revoke access tokens.
2. The app collects raw card details in the frontend and sends them to the backend.
3. Paid booking is broken at runtime and incompatible with backend payment confirmation rules.
4. Hall booking flows are mismatched across routes, validators, controllers, and UI payloads.
5. Ticket management and check-in flows use incompatible endpoints and identifiers.
6. README, setup docs, env examples, and actual repo contents do not match.

## 2. Top Priority Findings

| Severity | Area | File(s) | Problem | Why It Matters | Recommended Fix | Confidence |
|---|---|---|---|---|---|---|
| Critical | Backend / Auth | `backend/middleware/auth.js:50-64`, `backend/controllers/authController.js:368-391`, `frontend/eventx-frontend/src/components/auth/SessionManager.jsx:91-109` | Session deletion only removes metadata. `authenticate` does not reject JWTs whose `sessionId` no longer exists in `activeSessions`. | "Remove session" and "remove all sessions" do not truly sign devices out. Stolen or old tokens remain valid until expiry. | Require the decoded `sessionId` to exist in `user.activeSessions` on every authenticated request. Reject otherwise. Add revocation tests. | High |
| Critical | Backend / Integration | `frontend/eventx-frontend/src/pages/BookingPage.jsx:138-146`, `frontend/eventx-frontend/src/pages/BookingPage.jsx:154-194`, `backend/controllers/bookingController.js:53-70`, `backend/controllers/paymentsController.js:9-23` | `BookingPage` references undefined payment state, sends raw card data to the backend, omits `paymentToken` during booking confirmation, and backend amount checks reject discounted totals. | Paid checkout is unsafe and functionally broken. | Remove raw card handling completely. Use PSP tokenization only. Pass a real payment token or payment intent reference to booking confirmation and validate the discounted final amount. | High |
| High | Integration / Halls | `backend/middleware/validators.js:92-98`, `backend/controllers/hallBookingsController.js:111-167`, `backend/routes/public.js:12-13`, `frontend/eventx-frontend/src/pages/HallRentalPage.jsx:39-94`, `frontend/eventx-frontend/src/components/organizer/HallBookingForm.jsx:62-74`, `frontend/eventx-frontend/src/components/venue/MaintenanceScheduler.jsx:68-72` | Hall booking payloads and routes are inconsistent across backend and frontend. `/api/public/halls/:id` does not exist. | Hall rental, organizer booking, and maintenance scheduling are largely unusable. | Define one booking DTO and one maintenance DTO, expose consistent public/private routes, and update all callers. | High |
| High | Integration / Tickets | `frontend/eventx-frontend/src/components/organizer/OrganizerTickets.jsx:36-79`, `frontend/eventx-frontend/src/components/admin/CheckInDashboard.jsx:42-53`, `backend/routes/tickets.js:16-18`, `backend/controllers/ticketsController.js:626-756` | Organizer/admin ticket UIs call incompatible endpoints. Check-in posts QR or ticket codes to an endpoint that expects a Mongo ticket `_id`. | Ticket operations and QR check-in are broken. | Create a supported code lookup plus check-in flow, or change the frontend to the existing route contract. Ensure organizer authorization works with populated event organizer data. | High |
| High | Backend / Shared | `backend/models/AuditLog.js:11-27`, `backend/controllers/couponController.js:75-88`, `backend/controllers/usersController.js:137-147` | Audit log enums do not include values the code writes. Coupon creation writes `action: 'create', resource: 'coupon'`; user admin update writes `admin.update_user`. | Coupon creation can 500 after creating the coupon, and admin changes silently lose audit history. | Centralize audit constants and make audit calls use valid enums. For coupon creation, do not let audit failure break the main write. | High |
| Medium | Backend / Security | `backend/server.js:115-120`, `backend/controllers/authController.js:28-31` | CSRF session binding reads `req.cookies.access_token`, but auth sets `accessToken`. | Weakens intended per-session CSRF binding. | Use the real auth cookie name consistently. | High |
| Medium | DevOps / Setup | `backend/server.js:19-24`, `backend/.env.example:13-20`, `backend/docs/setup.md:24-35`, `README.md:165-181` | Required env vars are documented as optional/defaulted, auto-seeding is documented but not wired into startup, and README claims Docker/coverage/tooling that are not present. | Setup and deployment expectations are misleading and can fail on first run. | Update docs/examples to match the code, or implement the missing assets and behavior. | High |

## 3. Security Findings

### Critical

#### 3.1 Raw Card Data Is Collected And Sent To The Backend

Files:

- `frontend/eventx-frontend/src/pages/BookingPage.jsx:154-173`
- `backend/controllers/paymentsController.js:9-23`

Problem:

- The frontend collects `cardNumber`, `expiryDate`, `cvv`, and `nameOnCard`.
- The backend receives `paymentDetails.cardNumber` and masks the last four digits.

Why it matters:

- Even if the backend does not persist full PAN/CVV, collecting and transmitting raw card data pushes the application into a much higher risk and compliance scope.
- The current implementation is not a safe substitute for a PSP integration.

Recommended fix:

- Remove raw payment fields from the application.
- Integrate a PCI-compliant payment provider and accept only provider-issued payment tokens or payment intent identifiers.

Confidence: High

#### 3.2 Session Revocation Is Ineffective

Files:

- `backend/middleware/auth.js:50-64`
- `backend/controllers/authController.js:368-391`

Problem:

- `authenticate` attaches `req.sessionId` and updates session activity if a matching session exists.
- It does not fail authentication when the JWT session no longer exists in `user.activeSessions`.

Why it matters:

- Deleting sessions from the UI does not actually revoke existing access tokens.
- This is a broken access-control / session-security guarantee.

Recommended fix:

- On every request with `decoded.sessionId`, require that session to exist in `user.activeSessions`.
- If not found, return `401` and force re-authentication.

Confidence: High

### Medium

#### 3.3 CSRF Session Identifier Uses The Wrong Cookie Name

Files:

- `backend/server.js:117-120`
- `backend/controllers/authController.js:28-31`

Problem:

- CSRF binding uses `req.cookies?.access_token`.
- Auth cookies are stored as `accessToken`.

Why it matters:

- The CSRF library falls back to IP-based identification instead of the actual auth session for logged-in users.

Recommended fix:

- Use `accessToken` consistently.

Confidence: High

### Checked And No Major Concrete Security Issue Found

The following areas were inspected and no major concrete vulnerability was confirmed:

- CORS allow-listing in `backend/server.js:89-103`
- Rate limiting in `backend/server.js:61-87`
- Security headers in `backend/server.js:42-56`
- File upload path handling and MIME validation in `backend/routes/upload.js:26-51` and `backend/controllers/uploadController.js:17-45`
- Token storage in the frontend auth flow. Auth is cookie-based in `frontend/eventx-frontend/src/contexts/AuthContext.jsx:105-110`
- `dangerouslySetInnerHTML` usages reviewed in `frontend/eventx-frontend/src/components/ui/chart.jsx:64-80` and `frontend/eventx-frontend/src/components/user/TicketDetailPage.jsx:223-231`; these are static/internal CSS injection cases, not confirmed user-content XSS

## 4. Functional And Architecture Findings

### 4.1 Frontend Findings

#### 4.1.1 Booking Page Crashes During Paid Checkout

Files:

- `frontend/eventx-frontend/src/pages/BookingPage.jsx:138-146`

Problem:

- `setPaymentDetails` and `paymentDetails` are used without any state declaration.

Impact:

- Paid booking crashes before it can work.

Confidence: High

#### 4.1.2 Booking Page Uses Wrong Event Venue Shape And QR Shape

Files:

- `frontend/eventx-frontend/src/pages/BookingPage.jsx:441`
- `frontend/eventx-frontend/src/pages/BookingPage.jsx:493-500`
- `frontend/eventx-frontend/src/pages/BookingPage.jsx:606`
- `backend/controllers/bookingController.js:84-97`
- `backend/models/Ticket.js:57-59`

Problem:

- The frontend renders `event.venue` as a string.
- Backend events use a venue object.
- The frontend tries to show `booking.ticket.qrCode` as an image, but backend `Ticket.qrCode` is signed JSON content, not a data URL.

Impact:

- Booking confirmation details render incorrectly.

Confidence: High

#### 4.1.3 Direct Ticket Booking Uses Invalid Payment Method

Files:

- `frontend/eventx-frontend/src/components/user/EventDetails.jsx:281-309`
- `backend/models/Ticket.js:49-53`

Problem:

- Frontend sends `paymentMethod: 'card'`.
- Ticket schema only accepts `credit_card`, `debit_card`, `paypal`, `bank_transfer`, `cash`, `free`.

Impact:

- Paid ticket booking through this path will fail validation or downstream logic.

Confidence: High

#### 4.1.4 Ticket UI Assumes Non-Existent Fields

Files:

- `frontend/eventx-frontend/src/components/user/MyTickets.jsx:188`
- `frontend/eventx-frontend/src/components/user/MyTickets.jsx:316-360`
- `frontend/eventx-frontend/src/components/user/MyTickets.jsx:430-438`
- `backend/controllers/ticketsController.js:406-416`
- `backend/controllers/ticketsController.js:585`

Problem:

- The frontend expects `ticket.ticketNumber` and `ticket.qrCodeImage`.
- Backend list endpoints return `ticketId`, not `ticketNumber`.
- Backend detail endpoint returns `qrCodeImage` separately, not nested on the ticket object.

Impact:

- Search, export, PDF, and QR display are inconsistent or broken.

Confidence: High

#### 4.1.5 Payment History Reads The Wrong Field

Files:

- `frontend/eventx-frontend/src/components/user/PaymentHistoryPage.jsx:82-84`
- `backend/models/Ticket.js:49-55`

Problem:

- The page reads `ticket.payment.method`.
- The schema stores `ticket.payment.paymentMethod`.

Impact:

- Payment method labels are wrong or empty.

Confidence: High

#### 4.1.6 Relative `/api` Usage Is Inconsistent With Vite Config

Files:

- `frontend/eventx-frontend/vite.config.js:1-14`
- `frontend/eventx-frontend/src/components/user/PaymentHistoryPage.jsx:18`
- `frontend/eventx-frontend/src/components/organizer/HallBookingForm.jsx:29`
- `frontend/eventx-frontend/src/pages/EventReviewsPage.jsx:33-62`
- `frontend/eventx-frontend/src/components/user/TicketDetailPage.jsx:20-41`

Problem:

- Many components use relative `/api/...`.
- Vite has no dev proxy configured.
- Other components use `VITE_API_BASE_URL`.

Impact:

- API behavior differs by page and by environment.

Recommended fix:

- Standardize on the centralized API client or add a Vite proxy and use it consistently.

Confidence: High

#### 4.1.7 Organizer Profile Uses A Public Filter That The Backend Public Controller Does Not Implement

Files:

- `frontend/eventx-frontend/src/pages/OrganizerProfilePage.jsx:32-36`
- `backend/controllers/publicController.js:13-37`

Problem:

- Frontend requests `/public/events?organizerId=...`.
- Public controller ignores `organizerId`.

Impact:

- Organizer profile event lists can be wrong or overly broad.

Confidence: High

### 4.2 Backend Findings

#### 4.2.1 Coupon-Discounted Booking Amounts Are Not Accepted By Payment Verification

Files:

- `backend/controllers/bookingController.js:61-65`
- `backend/controllers/ticketsController.js:117-126`
- `backend/services/bookingService.js:48-72`

Problem:

- Payment token validation compares token amount to full event price.
- Booking service separately applies coupon discounts.

Impact:

- Coupon-assisted paid bookings fail validation.

Confidence: High

#### 4.2.2 Review Soft Delete Does Not Match Intended Behavior

Files:

- `backend/models/Review.js:39-46`
- `backend/controllers/reviewsController.js:16-23`
- `backend/controllers/reviewsController.js:148-163`

Problem:

- Reviews are soft-deleted by setting `deletedAt`.
- Queries do not exclude deleted reviews.
- Unique index still blocks new reviews forever for the same event/user pair.

Impact:

- "Deleted" reviews continue to appear.
- Re-review cooldown is not actually implemented.

Confidence: High

#### 4.2.3 Admin User Status Endpoint Targets A Non-Existent Model Field

Files:

- `backend/controllers/usersController.js:188-207`
- `backend/models/User.js:62-65`

Problem:

- Controller writes `user.status`.
- User schema has `isActive`, not `status`.

Impact:

- Status changes do not align with the data model.

Confidence: High

#### 4.2.4 Notification Mutation Endpoints Are Stubs

Files:

- `backend/controllers/notificationsController.js:118-158`

Problem:

- Mark-as-read, mark-all-read, and delete all return `501`.

Impact:

- Notification center actions fail despite UI support.

Confidence: High

#### 4.2.5 Jest Test Setup Is Broken By ESM `file-type`

Files:

- `backend/controllers/uploadController.js:4`
- `backend/package.json:8`

Problem:

- Jest currently cannot parse the ESM dependency graph for `file-type`.

Impact:

- Backend tests cannot run reliably in the current setup.

Confidence: High

### 4.3 Cross-System Findings

#### 4.3.1 Hall Booking Routes, Validators, And Frontend Forms Disagree

Files:

- `backend/middleware/validators.js:92-98`
- `backend/routes/hallBookings.js:22-26`
- `backend/controllers/hallBookingsController.js:113-167`
- `frontend/eventx-frontend/src/components/organizer/HallBookingForm.jsx:67-74`
- `frontend/eventx-frontend/src/pages/HallRentalPage.jsx:81-88`
- `frontend/eventx-frontend/src/components/shared/HallDetail.jsx:47-53`
- `frontend/eventx-frontend/src/components/venue/MaintenanceScheduler.jsx:68-72`

Observed mismatches:

- Validator expects `hall`, `date`, `startTime`, `endTime`
- Controller expects `hall`, `startDate`, `endDate`, `notes`, `event`
- Organizer form sends `hallId`, `purpose`, `expectedAttendees`, `specialRequirements`
- Rental page sends `hallId`, `eventType`, `expectedAttendees`, `specialRequirements`
- Hall detail sends `hall`, `startDate`, `endDate`, `notes`
- Maintenance UI sends `hallId` and `reason`, backend expects `hall` and `notes`

Impact:

- The contract is not stable enough for reliable operation.

Confidence: High

#### 4.3.2 Public Hall Detail Route Is Missing

Files:

- `frontend/eventx-frontend/src/pages/HallRentalPage.jsx:39`
- `backend/routes/public.js:12-13`
- `backend/routes/halls.js:18-22`

Problem:

- Frontend requests `GET /api/public/halls/:id`.
- Backend exposes only `GET /api/public/halls` and authenticated `GET /api/halls/:id`.

Impact:

- Hall rental detail fetch breaks for unauthenticated/public access.

Confidence: High

#### 4.3.3 Organizer Ticket Page Uses Unsupported Event Query And Ticket Route

Files:

- `frontend/eventx-frontend/src/components/organizer/OrganizerTickets.jsx:36-79`
- `backend/services/eventsService.js:8-39`
- `backend/routes/tickets.js:9-18`

Problem:

- Frontend requests `/events?organizer=me`.
- Backend event list supports `organizerId`, not `organizer=me`.
- Frontend requests `/tickets?page=...`.
- Backend has no `GET /api/tickets` route.
- Frontend uses `PUT /tickets/:id/check-in`.
- Backend exposes `POST /tickets/:id/checkin`.

Impact:

- Organizer ticket management page is not compatible with the API.

Confidence: High

#### 4.3.4 Check-In Dashboard Uses Ticket Code Against An ID-Based Endpoint

Files:

- `frontend/eventx-frontend/src/components/admin/CheckInDashboard.jsx:42-53`
- `backend/controllers/ticketsController.js:626-656`
- `backend/controllers/ticketsController.js:727-752`

Problem:

- Dashboard posts scanned code to `/tickets/{code}/checkin`.
- Check-in endpoint expects a ticket document `_id`.
- There is a separate QR lookup endpoint, but the dashboard does not use it.
- `lookupByQR` does not populate `event.organizer`, so organizer authorization is also unreliable.

Impact:

- QR/manual check-in is broken.

Confidence: High

#### 4.3.5 Notification APIs And UIs Disagree On Shape And Methods

Files:

- `backend/routes/notifications.js:18-24`
- `backend/controllers/notificationsController.js:103-106`
- `frontend/eventx-frontend/src/components/admin/Notifications.jsx:25-27`
- `frontend/eventx-frontend/src/components/user/UserNotifications.jsx:37-39`
- `frontend/eventx-frontend/src/components/user/UserNotifications.jsx:52-88`

Problem:

- Backend returns `{ success, notifications }`.
- User UI expects `data.notifications`.
- User UI uses `PUT` for read endpoints.
- Backend exposes `PATCH`.
- Admin UI uses the top-level shape correctly, but mutation endpoints are still stubs.

Impact:

- Notifications behave differently or fail depending on the UI.

Confidence: High

## 5. Missing Files And Missing Safeguards

### Confirmed Missing

The following expected assets were not present in the repository scan:

- Frontend `.env.example`
- Dockerfile
- Docker Compose files
- CI workflow files under `.github/workflows`
- Frontend test files
- Frontend test config (`vitest`, `cypress`, `playwright`)
- Backend Jest config file

Evidence:

- File scan matched only:
  - `.gitignore`
  - `backend/.env.example`
  - `backend/__tests__/auth.test.js`

### Confirmed Missing Or Misleading Behavior

#### 5.1 Docs Claim Docker Deployment That Does Not Exist

Files:

- `README.md:177-181`

Problem:

- README references `docker-compose.prod.yml`.
- No Docker compose file exists in the repo.

Impact:

- Deployment documentation is misleading.

#### 5.2 Docs Claim Frontend Testing And High Coverage That Are Not Present

Files:

- `README.md:165-169`
- `frontend/eventx-frontend/package.json:6-10`

Problem:

- README claims React Testing Library, Cypress, axe-core, and high coverage.
- Frontend package scripts contain no test runner.

Impact:

- Repo readiness is overstated.

#### 5.3 `.env.example` Does Not Match Runtime Requirements

Files:

- `backend/server.js:19-24`
- `backend/.env.example:13-20`

Problem:

- Runtime requires `JWT_REFRESH_SECRET` and `CSRF_SECRET`.
- `.env.example` suggests refresh secret can default and leaves CSRF secret commented as optional.

Impact:

- New environments can fail at startup even when following the example.

#### 5.4 Setup Docs Claim Automatic Seeding On Startup

Files:

- `backend/docs/setup.md:24-31`
- `backend/server.js`
- `backend/package.json:5-10`

Problem:

- Seeding scripts exist.
- Startup does not invoke them.
- Docs claim seeding happens automatically in development.

Impact:

- Fresh local setup will not match the documented expectation.

### Inference

#### 5.5 No Migration Framework Or Migration Folder

Status: `Inference`

Reason:

- No migration framework or migration directory was found in the repository scan.
- Because this is a Mongo/Mongoose project, that may be intentional.
- It still means schema evolution appears to rely on manual code changes and seed scripts rather than repeatable migration artifacts.

Impact:

- Data evolution and deployment safety are harder to reason about.

## 6. Clean Code And Maintainability Findings

### 6.1 API Access Is Fragmented

Files:

- `frontend/eventx-frontend/src/utils/apiClient.js`
- `frontend/eventx-frontend/src/utils/csrf.js`
- `frontend/eventx-frontend/src` overall

Problem:

- The repo has a centralized API client and a global CSRF fetch interceptor.
- The app still contains approximately `125` raw `fetch()` call sites.

Impact:

- Request behavior, error handling, credentials, and response parsing are inconsistent.
- Contract drift becomes much easier.

Recommended fix:

- Migrate mutating and authenticated requests to one shared client layer.

### 6.2 Naming Drift Across Layers

Examples:

- `hall` vs `hallId`
- `notes` vs `reason` vs `purpose`
- `ticketId` vs `ticketNumber`
- `paymentMethod` vs `method`
- `checkin` vs `check-in`

Evidence:

- `backend/controllers/hallBookingsController.js:113`
- `frontend/eventx-frontend/src/components/organizer/HallBookingForm.jsx:67`
- `frontend/eventx-frontend/src/components/venue/MaintenanceScheduler.jsx:71`
- `backend/models/Ticket.js:49`
- `frontend/eventx-frontend/src/components/user/PaymentHistoryPage.jsx:82`

Impact:

- This naming inconsistency is directly causing real integration bugs.

### 6.3 Frontend Lint Health Is Poor

Observation:

- ESLint currently reports `130 errors` and `30 warnings`.

Notable concrete issue:

- `frontend/eventx-frontend/src/pages/BookingPage.jsx` references undefined payment state, which matches the runtime defect.

Impact:

- The frontend has a weak guardrail against broken code paths.

### 6.4 Build Output Shows Large Chunks

Observation:

- Frontend build passed but warned about chunk sizes over 500 kB.

Impact:

- Admin-heavy pages are likely affecting initial or route-level performance.

Recommended fix:

- Split the heaviest routes/components, especially event-management flows.

## 7. Test Gaps

### Current State

- Backend tests: only `backend/__tests__/auth.test.js` was found
- Frontend tests: none found
- Backend tests do not currently run cleanly due to the `file-type` ESM issue

### Critical Tests Missing

1. Session revocation after deleting one session and after deleting all other sessions
2. Paid booking happy path with tokenized payment confirmation
3. Paid booking with coupon-discounted totals
4. Hall booking request creation from each UI path
5. Maintenance scheduling payload compatibility
6. Organizer ticket listing and filtering
7. QR lookup plus check-in flow
8. Notification read/delete behavior
9. Review delete and re-review cooldown behavior
10. User admin status update behavior

### Suggested First Test Cases

#### Backend

- Auth middleware should reject a JWT whose `sessionId` no longer exists
- Booking confirmation should require and validate `paymentToken`
- Booking confirmation should accept discounted totals when coupon is valid
- Hall booking controller should accept the canonical DTO and reject drifted DTOs with clear errors
- Check-in flow should support scanning a QR-derived code and enforce organizer/admin permissions correctly

#### Frontend

- Booking page should render payment step without runtime errors
- Booking page should pass the correct confirm payload
- Hall rental page should load hall detail and submit the correct DTO
- My Tickets should render QR and ticket identifiers from actual backend response shape
- Notification pages should read the actual backend response shape and methods

## 8. Final Action Plan

### Best Implementation Order

1. Remove raw card handling and redesign the paid booking flow around PSP tokenization only.
2. Enforce active-session membership in auth middleware so session deletion actually revokes access.
3. Stabilize booking contracts: define one canonical payment confirmation payload and one canonical ticket response shape.
4. Stabilize hall booking contracts: one public hall detail route, one hall booking DTO, one maintenance DTO.
5. Repair ticket management and check-in APIs, including code lookup and organizer-compatible authorization.
6. Fix audit log enums/constants and decouple audit failures from business writes.
7. Repair notifications: real persistence for read/delete state and aligned frontend request/response contracts.
8. Fix review soft-delete behavior and either implement a real cooldown strategy or remove the misleading claim.
9. Fix user status handling to use a real schema-backed field and add tests.
10. Bring repo readiness back in line with docs: env examples, setup docs, tests, CI, and deployment assets.

## 9. Implementation Roadmap

### Phase 0: Restore Safe Delivery Guardrails

Goals:

- Make tests runnable
- Stop shipping broken frontend runtime issues

Tasks:

1. Fix Jest compatibility with `file-type`
2. Fix `BookingPage` undefined state
3. Add a minimal smoke test suite for auth, booking, hall booking, and check-in
4. Reduce lint errors that reflect real defects first

Exit criteria:

- Backend tests run
- Frontend lint no longer reports runtime-critical errors

### Phase 1: Secure Auth And Payments

Goals:

- Fix the two most serious risks first

Tasks:

1. Enforce session revocation in `authenticate`
2. Remove raw card data collection from frontend and backend
3. Introduce provider-token or payment-intent-based booking confirmation
4. Align coupon-adjusted amount verification

Exit criteria:

- Session deletion truly revokes access
- No raw PAN/CVV flows remain in app code
- Paid booking works end-to-end

### Phase 2: Repair Cross-System Contracts

Goals:

- Make hall booking, tickets, and notifications coherent

Tasks:

1. Hall booking route and DTO normalization
2. Public hall detail route addition or frontend change
3. Organizer ticket list route support
4. Check-in route support for scanned codes
5. Notification method/shape alignment

Exit criteria:

- Hall flows work from all supported UIs
- Ticket management and check-in work from real UI flows
- Notifications no longer rely on stubbed behavior

### Phase 3: Correct Data Model Drift

Goals:

- Remove misleading or broken domain behavior

Tasks:

1. Review soft-delete/cooldown fix
2. User status vs `isActive` fix
3. Audit log enum cleanup
4. Ticket response contract cleanup across list/detail endpoints

Exit criteria:

- Domain behavior matches code, UI, and docs

### Phase 4: Operational Hardening

Goals:

- Make the repo easier to run, verify, and deploy

Tasks:

1. Update README and setup docs
2. Add frontend `.env.example`
3. Add CI workflow
4. Add Docker assets only if they are actually supported
5. Continue lint cleanup and route-level code splitting

Exit criteria:

- Fresh setup works from documentation
- CI validates core flows

## 10. Areas Checked With No Major Confirmed Issue

The following areas were reviewed and did not produce a major confirmed defect during this audit:

- Upload path traversal and MIME spoofing protections
- Helmet, compression, rate limiting, and CORS baseline setup
- Cookie-based auth storage instead of localStorage token storage
- Global CSRF fetch patching in `frontend/eventx-frontend/src/utils/csrf.js`
- Static/internal `dangerouslySetInnerHTML` usages that were not tied to user content

These areas are not necessarily perfect, but they were not the highest-risk or most clearly broken parts of the repository compared with the confirmed issues above.

