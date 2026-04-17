# Middleware Reference

The `middleware/` directory contains custom Express interceptors that execute **before** any Controller logic runs. These form the security perimeter and validation layer of the entire application.

---

## File: `auth.js` — Authentication & Authorization

This is the backbone middleware file, exporting 7 distinct functions. Every protected route in the system chains at least one of these.

### `authenticate(req, res, next)`
The primary JWT gatekeeper. Called on every route that requires a logged-in user.

**Execution Flow:**
1. **Token Extraction**: Checks `Authorization: Bearer <token>` header first, then falls back to `req.cookies.accessToken` or `req.cookies.token` (HttpOnly cookie).
2. **Sanitization**: Filters out literal strings `"undefined"` and `"null"` that can arrive from broken frontend states.
3. **JWT Verification**: Calls `jwt.verify(token, JWT_SECRET)`. If the token is expired (`TokenExpiredError`), returns `401`. If malformed (`JsonWebTokenError`), logs the first 10 chars of the bad token for diagnostics and returns `401`.
4. **User Lookup**: Fetches the user from the database via `User.findById(decoded.id).select('-password')`.
5. **Account Status Checks**:
   - `isActive === false` → `401 Account is deactivated`
   - `isLocked === true` → `423 Account is temporarily locked`
6. **Session Revocation**: If the JWT includes a `sessionId`, verifies it still exists in `user.activeSessions[]`. If the session was revoked (e.g., admin force-logout), returns `401 Session has been revoked`.
7. **Debounced Activity Tracking**: Updates `lastActivity` on the session record, but only if 60+ seconds have elapsed since the last update—preventing excessive writes on rapid consecutive requests.
8. **Attachment**: Sets `req.user` and `req.sessionId` for downstream consumers.

### `requireAdmin(req, res, next)`
Hard role gate. Only `role === 'admin'` passes. Returns `403 Admin privileges required` otherwise.

### `requireAdminOrOwner(req, res, next)`
Hybrid gate. Passes if the user is an admin **or** if `req.user._id` matches `req.params.userId` / `req.params.id`. Used on user profile endpoints where a user can view/edit their own data but admins can access anyone's.

### `requireOrganizer(req, res, next)`
Passes for `role === 'organizer'` or `role === 'admin'`. Used on event creation, ticket check-in, and hall booking request routes.

### `requireVenueAdmin(req, res, next)`
Passes for `role === 'venue_admin'` or `role === 'admin'`. Used for hall CRUD operations and booking approval routes.

### `requireRole(roles: string[])`
A factory function that returns a middleware accepting an array of allowed roles. This is the most flexible gate:
```javascript
// Usage in a route file:
router.put('/:id/status', authenticate, requireRole(['organizer', 'admin']), controller.updateStatus);
```
Returns `403 Access denied. Requires one of: organizer, admin` if the user's role is not in the list.

### `optionalAuth(req, res, next)`
A soft version of `authenticate`. If a valid token exists, `req.user` is populated. If not, the request continues without error. Used on public endpoints that optionally personalize responses for logged-in users (e.g., public event listing that shows "bookmarked" status).

---

## File: `validators.js` — Input Validation

Uses `express-validator` to define reusable validation chains. Each exported array is a middleware chain that validates `req.body` fields before the controller runs.

### Core Pattern
Every validator chain ends with the `validate` function, which checks `validationResult(req)`. If errors exist, it short-circuits with a `400` response:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Name is required", "Email must be valid"]
}
```

### Exported Validators

| Validator | Used On | Key Rules |
| :--- | :--- | :--- |
| `registerValidator` | `POST /auth/register` | `name` required (max 50), `email` required + valid + normalized, `password` strong policy enforced, `role` must be `user` or `organizer`, `age` 13-120 |
| `loginValidator` | `POST /auth/login` | `email` required + valid, `password` required |
| `updateProfileValidator` | `PUT /auth/profile` and `PUT /users/profile/me` | All optional. `name` max 50, `age` 13-120, `gender` must be enum |
| `changePasswordValidator` | `PUT /auth/change-password` | `currentPassword` required, `newPassword` required with stronger minimum length/policy |
| `createEventValidator` | `POST /events` | `title` required max 100, `description` required max 2000, `category` must be valid enum, `date` ISO 8601, `endDate` must be after `date`, venue fields required, `totalSeats` min 1, pricing validated |
| `updateEventValidator` | `PUT /events/:id` | Same as create but all fields optional |
| `createHallValidator` | `POST /halls` | `name` required max 100, `capacity` min 1, `hourlyRate` min 0 |
| `updateHallValidator` | `PUT /halls/:id` | Same as create hall but all fields optional |
| `createBookingValidator` | `POST /halls/request` | `hall` ID required, `startDate` and `endDate` ISO 8601, `endDate` must be after `startDate` |

Additional hardening validators now enforced in routes:
- coupon validate requires `eventId` + `amount` shape checks.
- booking initiate requires valid `eventId`.
- booking confirm supports optional `idempotencyKey` validation for safe retries.
- account delete requires `password` type/constraints.

### Security Note on `normalizeEmail`
The `gmail_remove_dots: false` option is explicitly set. Gmail treats `john.doe@gmail.com` and `johndoe@gmail.com` as the same inbox, but our system preserves dots to avoid confusing users who registered with a specific format.

---

## File: `rateLimiter.js` — Abuse Protection

- Uses `express-rate-limit` for global and auth-specific limiter policies.
- Supports Redis store via `REDIS_URL` and `REDIS_RATE_LIMIT_PREFIX` for multi-instance deployments.
- Automatically falls back to in-memory limiter if Redis is unavailable.
- Returns structured `429` responses with retry metadata.

---

## File: `methodNotAllowed.js` — HTTP Method Enforcement

- App-level middleware that resolves allowed methods for matched routes.
- Returns `405 Method Not Allowed` instead of false `404` for unsupported methods.
- Sets proper `Allow` header per RFC semantics.
