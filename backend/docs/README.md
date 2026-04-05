# EventX Studio Backend

Welcome to the backend core of EventX Studio—a scalable, secure API managing advanced ticketing, hall subleasing, multi-role user authentication, and atomic event analytics.

Built primarily on **Express.js**, **Mongoose (MongoDB)**, and **JWT Auth**, the app enforces a zero-trust model utilizing multi-ring security mitigations (`helmet`, `csrf-csrf`, rate limiting) and highly optimized architecture (MVC + Services).

## Table of Contents

The complete developer knowledge base has been drastically expanded. Dive into the detailed documentation specific to the layer you are working on:

### 1. Operations & Onboarding
- 🚀 **[Setup & Deployment Guide](./setup.md)**: Environment variable references (`.env`), dev-ops run scripts.
- 🏗 **[System Architecture Map](./architecture.md)**: The lifecycle ring map—how requests flow from clients through the controller matrices.
- 🗺 **[Codebase Explorer](./codebase-map.md)**: Details the exact responsibility of every folder (utilities, configs, uploads).

### 2. Implementation Maps
- 💾 **[Database Models](./models.md)**: Exhaustive taxonomy of all 13 schemas, pre-save hooks, and virtualized derivations.
- 📡 **[API Reference](./api-reference.md)**: Exhaustive mapping of all HTTP boundaries, required params, and RBAC authentication strata for categories like Bookings, Halls, and Notifications.

### 3. Core Logic & Security
- 🛡️ **[Security Posture](./security.md)**: Explains the active Zero-Trust defense models (anti XSS, CSRF tracking, JWT validation, SQL Injection sanitization).
- 🧩 **[Services Layer](./services-reference.md)**: Documentation on atomic calculation engines (`bookingService`) ensuring mathematical transaction integrity.
- 🚧 **[Middleware Interceptors](./middleware-reference.md)**: Details the role-based gating system and universal `express-validator` schema catchers.

### 4. Diagnostics & Testing
- 🧪 **[Testing Framework Guide](./testing-guide.md)**: How to leverage our `mongodb-memory-server` setups and `supertest` CI injections.
- ⚙️ **[Scripts & DB Management](./scripts-guide.md)**: Documentation covering the massive `@faker-js` database `seed.js` script and self-healing cron logic.

---

## Technical Stack Overview

| Category | Technology |
| :--- | :--- |
| **Framework** | Node.js v18+, Express v4.21+ |
| **Database** | MongoDB v6+ (Mongoose v8+) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), bcryptjs, otplib (2FA) |
| **Application Security**| Helmet, csrf-csrf, express-rate-limit, mongo-sanitize |
| **Testing** | Jest, Supertest, MongoDB-Memory-Server |
| **Storage & Mail** | Multer, Nodemailer |
| **Linting** | ESLint |

## Standard Dev Run

*(Refer to `setup.md` for full environment mapping and Mongo configuration first.)*

```bash
# Install dependencies
npm install

# Wipe and populate mock deterministic data (Organizers, Users, Events, Bookings)
npm run seed

# Boot the API proxy watcher
npm run dev
```

> Application boots natively to http://localhost:5000/api/v1
