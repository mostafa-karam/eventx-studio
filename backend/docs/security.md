# Security Posture & Configurations

The EventX Studio backend employs a zero-trust, defense-in-depth model to protect Organizer and Attendee data. All traffic routing through Express interacts with a dense ring of security middlewares.

## Authentication (JWT & HttpOnly Cookies)

We do not transmit authorization tokens via JSON bodies or LocalStorage, defeating standard XSS (Cross-Site Scripting) token exfiltration.
- **Login Flow**: Upon successful authentication, the server generates a JSON Web Token (JWT) signed with `JWT_SECRET`. 
- **Storage**: The token is set natively as an `HttpOnly`, `Secure` cookie named `token`. The browser handles token attachment automatically.
- **Refresh Flow**: A parallel `refreshToken` cookie allows users to generate new ephemeral access tokens without continuously requesting credentials.

## Cross-Site Request Forgery (CSRF)

Because tokens are stored in Cookies automatically sent by browsers, the application uses **Double Submit Cookie** + **Token Hash** mitigation via `csrf-csrf`.
- **Read Operations (`GET`, `HEAD`, `OPTIONS`)**: Allowed through freely.
- **Mutating Operations (`POST`, `PUT`, `DELETE`)**: The frontend must fetch `/api/v1/auth/csrf-token` to retrieve a cryptographically signed CSRF seed. This seed must be attached to the mutating request under the `X-CSRF-Token` HTTP Header. If the hash derived from the header does not cryptographically match the session context, the server immediately drops the connection (`403 Forbidden`).

## Rate Limiting (Brute Force Protection)

`express-rate-limit` governs traffic globally across the entire API space to prevent Denial of Service (DoS) and credential stuffing.
- **Global API Limit**: 100 requests per 10 minutes per IP.
- **Authentication Route Limit** (`authLimiter`): 10 requests per 10 minutes per IP to defeat dictionary attacks against schemas like `/login` or `/tfa/verify`.

## Payload Sanitization (NoSQL Injection & XSS)

Before body payloads strike the Models, they are sanitized recursively:
1. **`express-mongo-sanitize`**: Scans the `req.body`, `req.query`, and `req.params`. Any keys beginning with `$` or containing `.` (MongoDB operators) are aggressively stripped. This defeats queries like `{ email: { $gt: "" } }`.
2. **Data Structure Validation**: Heavily relies on Mongoose schemas forcing `Number` casting or `enum` evaluation, preventing unexpected object properties from sliding into DB mutations.

## HTTP Headers (Helmet)

Helmet sets 11 protective HTTP headers securely defining browser behavioral limits:
- **`Content-Security-Policy`**: Governs authorized resource origins.
- **`Strict-Transport-Security`**: Enforces strict HTTPS binding (HSTS) for 1 year.
- **`X-Frame-Options`**: `DENY`. Stops UI redressing/Clickjacking techniques.
- **`X-Download-Options`**: `noopen`. Mitigates IE8 execution risks.
- **`X-Content-Type-Options`**: `nosniff`. Blocks MIME-type sniffing.

## Session Revocation

When a user logs out (`/api/v1/auth/logout`), the server responds by overwriting the `token` and `refreshToken` cookies with explicit `expires: new Date(Date.now() - 1)` parameters, causing immediate local annihilation of auth states on the client.

## Multi-Factor Authentication (MFA/2FA)

Administrators and Organizers can opt into Time-Based One-Time Password (TOTP) constraints leveraging `otplib`. Upon enabling, login validation routes enforce a secondary intercept requiring users to supply temporary codes verified against the hashed Base32 `twoFactorSecret` locked to their schema.
