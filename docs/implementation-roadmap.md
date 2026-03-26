# EventX Studio Implementation Roadmap

## Objective

This roadmap turns the codebase assessment into an execution plan that the team can implement incrementally. It is designed to reduce risk, improve maintainability, and strengthen security without a disruptive rewrite.

## Guiding Principles

- Prefer incremental hardening over large rewrites.
- Improve high-risk areas first: auth, uploads, session handling, authorization, and quality gates.
- Make documentation match behavior before adding more complexity.
- Add tests before or alongside refactors in sensitive areas.
- Keep frontend and backend improvements coordinated where auth, CSRF, and session behavior overlap.

## Delivery Strategy

The work should be executed in three tracks running in parallel where possible:

- Foundation track: docs, package management, repo hygiene, CI setup.
- Product engineering track: backend validation, frontend architecture, route cleanup, test coverage.
- Security track: auth assurance, upload hardening, dependency scanning, RBAC verification.

This allows the team to make progress without blocking all work on a single refactor.

## Phase 1: Stabilize the Baseline

Timeline: 1 week

Goal:

Create a trustworthy baseline so engineers are working from accurate documentation, consistent tooling, and clean repo expectations.

### Deliverables

- Updated documentation that reflects real package versions, scripts, and security behavior.
- A single frontend package manager with one lockfile.
- A root developer guide covering setup, run, test, lint, and build.
- Repo hygiene rules for generated artifacts and local-only folders.

### Implementation Tasks

1. Audit `README.md` against:
   - `backend/package.json`
   - `frontend/eventx-frontend/package.json`
   - current folder structure
2. Audit backend security docs against:
   - `backend/server.js`
   - `backend/utils/authUtils.js`
   - `backend/controllers/authController.js`
   - `backend/middleware/auth.js`
3. Standardize the frontend package manager and remove the conflicting lockfile.
4. Verify `.gitignore` covers generated artifacts such as `dist`, test output, and installed dependencies.
5. Add a root `CONTRIBUTING.md` or equivalent developer workflow guide if one does not exist.

### Acceptance Criteria

- No major version, script, or testing claims in docs are inaccurate.
- The frontend has exactly one supported install path.
- A new developer can follow one documented local setup flow successfully.

### Dependencies

- None. This phase should happen first.

## Phase 2: Secure the Critical Paths

Timeline: 1 to 2 weeks

Goal:

Reduce the highest operational and security risk by verifying and hardening authentication, authorization, session, CSRF, and upload behavior.

### Deliverables

- Auth and session integration tests.
- Explicit RBAC coverage for protected endpoints.
- Upload-specific hardening controls.
- Documented and verified security behavior for the most sensitive flows.

### Implementation Tasks

1. Add integration tests for:
   - registration
   - login success and failure
   - email verification enforcement
   - refresh-token rotation
   - refresh-token reuse detection
   - logout behavior
   - session invalidation
   - account lockout
2. Add RBAC tests for admin, organizer, venue-admin, and user-only endpoints.
3. Add CSRF tests for:
   - missing token
   - invalid token
   - valid state-changing request
4. Harden uploads by adding:
   - upload-specific rate limiting
   - file size limits
   - MIME type allowlists
   - filename/path safety checks
5. Review 2FA secret handling and strengthen storage if secrets are persisted in plain form.

### Acceptance Criteria

- High-risk auth and authorization flows are covered by automated tests.
- Upload endpoints reject unsupported or abusive requests reliably.
- Session and token behavior are verified, not only documented.

### Dependencies

- Phase 1 documentation cleanup is helpful but not strictly blocking.

### Risks

- Backend auth refactors can accidentally break frontend session bootstrapping.
- CSRF behavior changes must be coordinated with the frontend request layer.

## Phase 3: Backend Reliability and API Discipline

Timeline: 2 to 3 weeks

Goal:

Make backend behavior more predictable by expanding validation, reducing controller duplication, and improving test coverage across business logic.

### Deliverables

- Consistent validation on write endpoints.
- Shared operational error handling patterns.
- Better API guardrails for list and search endpoints.
- Expanded service and integration tests beyond auth.

### Implementation Tasks

1. Review every file under `backend/routes`.
2. Add or improve validators for:
   - payments
   - notifications
   - reviews
   - support
   - coupons
   - marketing
   - upload
   - user profile mutations
3. Refactor repetitive controller error handling into reusable helpers where practical.
4. Expand automated tests around:
   - events
   - tickets
   - bookings
   - halls
   - analytics permission boundaries
5. Add safe defaults for:
   - pagination
   - max page size
   - sorting rules
   - query validation

### Acceptance Criteria

- All state-mutating routes have explicit validation.
- Large list endpoints cannot accidentally return unbounded data.
- Controller behavior becomes more uniform across the codebase.

### Dependencies

- Security-critical tests from Phase 2 should land before major auth-area refactors.

### Risks

- Validation tightening may break permissive frontend forms that currently send inconsistent payloads.

## Phase 4: Frontend Maintainability and Testability

Timeline: 2 to 4 weeks

Goal:

Reduce frontend complexity by centralizing networking behavior, splitting routing by domain, and introducing real automated tests.

### Deliverables

- One canonical API/request layer.
- Route organization split by feature or role.
- Frontend unit/component test setup.
- Shared patterns for loading, empty, and error states.

### Implementation Tasks

1. Consolidate overlapping behavior in:
   - `src/utils/apiClient.js`
   - `src/utils/csrf.js`
2. Define a route-module structure such as:
   - `src/routes/public`
   - `src/routes/admin`
   - `src/routes/organizer`
   - `src/routes/venue`
   - `src/routes/user`
3. Move large role-based areas toward feature folders instead of keeping routing concerns centralized in `src/App.jsx`.
4. Add Vitest and React Testing Library.
5. Create initial tests for:
   - auth bootstrap on app load
   - protected route redirects
   - role-based dashboard redirects
   - key auth forms
   - session-expired handling
6. Add a small Playwright smoke suite for:
   - login
   - public event browsing
   - booking flow
   - protected admin access

### Acceptance Criteria

- Frontend networking and CSRF behavior are handled in one place.
- Route definitions are easier to navigate than the current single-shell approach.
- The frontend has a working `test` command and at least a minimal smoke suite.

### Dependencies

- This phase should be coordinated with Phase 2 if auth or CSRF mechanics change.

### Risks

- Refactoring route structure too early can create merge friction; prefer incremental extraction.

## Phase 5: CI, Quality Gates, and Operational Maturity

Timeline: 1 to 2 weeks

Goal:

Create enforcement so the improvements remain durable and regressions are caught automatically.

### Deliverables

- CI pipelines for backend and frontend.
- Dependency audit and secret scanning in automation.
- Clear PR quality gates.
- Improved traceability for sensitive actions and failures.

### Implementation Tasks

1. Add CI jobs for:
   - backend tests
   - frontend lint
   - frontend build
   - frontend tests
   - dependency audits
2. Add secret scanning and fail the pipeline on verified exposures.
3. Improve structured logging where useful for request tracing and operational debugging.
4. Review audit-log coverage for:
   - role changes
   - account deletion
   - login/security actions
   - admin-controlled mutations
5. Define merge requirements for high-risk areas such as auth, uploads, payments, and admin features.

### Acceptance Criteria

- Pull requests are blocked when critical checks fail.
- Security and quality checks run automatically.
- Sensitive code paths have stronger review and observability.

### Dependencies

- This phase can begin early, but is most useful once backend and frontend tests exist.

## Recommended Execution Order

Recommended order of implementation:

1. Phase 1 baseline stabilization
2. Phase 2 critical-path security hardening
3. Frontend test setup from Phase 4
4. Backend validation expansion from Phase 3
5. Frontend API-layer consolidation and route extraction
6. Phase 5 CI and quality gates
7. Larger structural cleanup and consistency refactors

## 30-Day Target Plan

### Week 1

- Clean docs
- Choose frontend package manager
- Verify repo hygiene
- Define first milestone backlog

### Week 2

- Add auth, CSRF, session, and RBAC backend tests
- Add upload-specific hardening
- Review 2FA secret handling

### Week 3

- Add frontend test tooling
- Add protected-route and auth bootstrap tests
- Start unifying API and CSRF handling

### Week 4

- Expand backend validators
- Add CI jobs for lint, build, tests, and audits
- Extract initial route modules from `src/App.jsx`

## Suggested Ownership Model

### Backend owner

Responsible for:

- validators
- auth/session tests
- service/controller cleanup
- pagination/query guardrails
- upload hardening

### Frontend owner

Responsible for:

- API-layer consolidation
- route-module extraction
- frontend test setup
- session and auth UX behavior
- loading/error-state consistency

### Security owner

Responsible for:

- security documentation accuracy
- auth/RBAC/CSRF verification
- dependency and secret scanning
- 2FA and sensitive data handling review

## Starter Backlog

Use the first milestone to create these tickets:

1. Update `README.md` and backend security docs to match implementation.
2. Standardize the frontend package manager and remove the extra lockfile.
3. Add Vitest and a frontend `test` script.
4. Add backend integration tests for CSRF, login, refresh, lockout, and role enforcement.
5. Replace split fetch/CSRF behavior with one API client strategy.
6. Add upload validation and upload-specific rate limiting.
7. Add CI jobs for lint, build, tests, audits, and secret scanning.
8. Review and strengthen storage of 2FA secrets.

## Definition of Done

This roadmap is considered successfully implemented when:

- Documentation matches actual system behavior.
- The frontend has automated tests and a stable request layer.
- The backend has validation and test coverage for critical flows.
- Security-sensitive paths are both hardened and verified.
- CI enforces lint, build, test, and security checks.
- The team can add features with less risk than the current baseline.

## Final Note

This plan is intentionally practical. The fastest wins will come from improving correctness, consistency, and verification around the current architecture before attempting broader redesigns.
