# EventX Studio Improvement Plan

## Purpose

This document summarizes the highest-value improvements for the EventX Studio codebase across backend, frontend, and security. It is based on a repository scan and is intended to guide the next engineering iterations.

## Current State Summary

The codebase already has a good starting structure:

- Backend is organized into routes, controllers, services, models, middleware, utils, and tests.
- Frontend is a Vite + React SPA with route-based lazy loading and role-specific sections.
- Security fundamentals already exist: JWT auth, httpOnly cookies, CSRF protection, rate limiting, Helmet, Mongo sanitization, XSS cleaning, and audit logging.

The main weaknesses are not lack of features, but inconsistency, missing quality gates, documentation drift, and uneven implementation depth.

## Main Findings

### 1. Documentation and implementation are out of sync

- Root documentation says the frontend uses React 19, but the actual frontend package uses React 18.
- Root documentation claims frontend testing coverage, but no frontend test script is currently defined.
- Backend security docs mention implementation details that do not fully match the running code.

### 2. Frontend API and auth flow are harder to maintain than necessary

- CSRF and request behavior are split between a fetch monkey-patch and a separate API client.
- Route definitions are centralized in one large app shell, which makes future changes harder and increases coupling.
- The app has grown into several role-based domains, but the frontend structure has not fully caught up with that complexity.

### 3. Backend quality controls are uneven

- Validation middleware exists, but it is not consistently applied across all domains.
- Error handling patterns are repetitive and controller-heavy.
- Test coverage appears limited, especially outside authentication.

### 4. Security posture is promising but needs deeper hardening

- Security middleware is in place, but some high-risk areas need stronger enforcement and testing.
- Upload handling deserves tighter limits and validation.
- Sensitive account and session flows need more automated verification.
- 2FA secret storage should be reviewed and strengthened.

### 5. Delivery discipline is not yet strong enough

- There is no visible end-to-end CI quality gate for frontend lint/build, backend tests, and dependency/security checks.
- Multiple lockfiles in the frontend suggest package-manager inconsistency.
- Committed generated artifacts can create noise and maintenance friction.

## Improvement Goals

### Backend goals

- Make validation, authorization, and error handling consistent.
- Expand test coverage around business-critical flows.
- Improve maintainability of service and controller layers.
- Reduce hidden coupling between routes, controllers, and models.

### Frontend goals

- Consolidate networking and session behavior into a single data-access layer.
- Split route definitions and feature modules by domain.
- Add automated frontend testing.
- Improve consistency of state, loading, and error handling.

### Security goals

- Verify all auth, session, CSRF, and RBAC paths with automated tests.
- Harden uploads and sensitive secret handling.
- Align production security behavior with documented intent.
- Add repeatable dependency and security scanning.

## Recommended Workstreams

## Workstream 1: Foundation Cleanup

Focus:

- Align docs with code.
- Choose one frontend package manager.
- Remove or ignore generated artifacts.
- Add a root developer workflow document.

Expected outcome:

- Faster onboarding, fewer false assumptions, cleaner repo hygiene.

## Workstream 2: Backend Hardening

Focus:

- Expand validation coverage for all write endpoints.
- Standardize controller/service responsibilities.
- Improve error handling with shared operational patterns.
- Add more integration and service tests.

Expected outcome:

- More predictable APIs, lower regression risk, easier debugging.

## Workstream 3: Frontend Maintainability

Focus:

- Replace split fetch/CSRF handling with one canonical API layer.
- Break routing into smaller route modules.
- Move large features into domain-based folders.
- Add test tooling and initial coverage.

Expected outcome:

- Easier feature work, safer refactors, less duplicated request logic.

## Workstream 4: Security Assurance

Focus:

- Add automated tests for auth, session rotation, lockout, CSRF, and RBAC.
- Strengthen upload validation and limiting.
- Review storage of 2FA secrets and other sensitive fields.
- Add dependency audit and secret scanning to CI.

Expected outcome:

- Better confidence in the most sensitive parts of the system.

## Priority Levels

### P0: Immediate

- Fix documentation drift.
- Standardize frontend package management.
- Add frontend test harness.
- Add backend security-focused integration tests.
- Harden upload endpoints.

### P1: Next

- Unify frontend API and CSRF handling.
- Expand backend validation coverage.
- Add CI pipelines and quality gates.
- Refactor route organization on the frontend.

### P2: Later

- Broader UI consistency work.
- Performance tuning.
- Deeper observability and reporting.
- Additional refactoring by feature domain.

## Success Metrics

- Frontend has automated tests and a working `test` script.
- Backend has integration coverage for auth, CSRF, RBAC, and session flows.
- One package manager is used consistently in the frontend.
- Security docs accurately describe implemented behavior.
- CI blocks merges when lint, tests, or build fail.
- High-risk routes have explicit validation and authorization coverage.

## Suggested First Sprint

The first sprint should focus on high-leverage improvements that reduce risk without requiring a rewrite:

1. Align README and security documentation with actual behavior.
2. Choose pnpm or npm for the frontend and remove the unused lockfile.
3. Add frontend test tooling with a small smoke suite.
4. Add backend integration tests for auth, CSRF, session, and RBAC.
5. Consolidate frontend request handling into one shared API layer.
6. Harden upload validation and rate limiting.

## Conclusion

The project is in a good position for structured improvement. The strongest path forward is to reinforce quality, consistency, and security around the existing architecture rather than replacing it. That approach should deliver faster wins and lower risk.
