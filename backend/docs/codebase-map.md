# Complete Codebase Map (File-by-File)

This document provides a highly detailed, 100% comprehensive overview of every single file and folder in the EventX Studio backend. This serves as the ultimate map for any developer navigating the codebase.

---

## 📂 Root Directory (`/`)

The root directory contains the configuration, dependencies, and the main entry point for the backend.

- **`server.js`**: The main entry point. Bootstraps the Express application, configures all global middleware (Helmet, CORS, Rate Limiting, Body Parsers), binds the routes, handles global errors, and connects to MongoDB.
- **`swagger.js`**: Configuration file for API documentation. Sets up `swagger-jsdoc` and `swagger-ui-express` to serve the interactive `/api-docs` portal.
- **`package.json`**: Defines all project dependencies, scripts (e.g., `npm run dev`, `npm test`), engine requirements, and project metadata.
- **`package-lock.json`**: Lockfile ensuring reproducible dependency resolution.
- **`.env`** & **`.env.example`**: Environment variables (secrets, DB URIs, ports). The example file acts as a template for new developers.

---

## 📂 `routes/` (URL Entry Points)

Routes map incoming HTTP endpoints to their corresponding Controller functions. They apply initial middleware like authentication, RBAC (Role-Based Access Control), and payload validation schemas.

- **`analytics.js`**: Endpoints for gathering revenue, attendance insights, and dashboard statistics (`/api/analytics`).
- **`auditLog.js`**: Endpoints for administrators to view system security logs and actions (`/api/audit-log`).
- **`auth.js`**: Authentication endpoints (register, login, refresh token, password change, profile updates) (`/api/auth`).
- **`booking.js`**: Legacy or generalized booking management endpoints (`/api/booking`).
- **`categories.js`**: Endpoints for managing overarching event categories (`/api/categories`).
- **`events.js`**: Detailed event creation, cloning, publishing, and listing endpoints (`/api/events`).
- **`hallBookings.js`**: Endpoints specifically for booking physical venue halls (used by organizers) (`/api/hall-bookings`).
- **`halls.js`**: CRUD operations to manage the physical characteristics of venue halls (`/api/halls`).
- **`marketing.js`**: Endpoints for promotional campaigns, discounts, and marketing blast emails (`/api/marketing`).
- **`notifications.js`**: Endpoints to manage and mark-as-read user notifications (`/api/notifications`).
- **`payments.js`**: Payment gateway integrations and webhook handlers (`/api/payments`).
- **`public.js`**: Fully open endpoints (like public event catalogs) that do not require CSRF or Authentication (`/api/public`).
- **`reviews.js`**: Endpoints for users to leave and read ratings/reviews for past events (`/api/reviews`).
- **`search.js`**: Highly optimized global search endpoints for finding events and organizers (`/api/search`).
- **`support.js`**: Endpoints for users submitting support tickets and admins resolving them (`/api/support`).
- **`tickets.js`**: Endpoints for purchasing event tickets, generating QR codes, and scanning Check-Ins (`/api/tickets`).
- **`upload.js`**: Endpoints handling multipart/form-data for image and avatar uploads (`/api/upload`).
- **`users.js`**: Endpoints for administrative CRUD over user accounts (`/api/users`).

---

## 📂 `controllers/` (Request Orchestrators)

Controllers receive the HTTP request from the route, extract the parameters, invoke databases or services, and send the standard JSON HTTP response.

- **`analyticsController.js`**: Executes massive MongoDB aggregation pipelines to format data for admin and organizer dashboards.
- **`auditLogController.js`**: Fetches and paginates system audit trail data.
- **`authController.js`**: Handles HTTP interactions for Login, Register, Token Refresh, and Profile Editing. Defers business logic to `authService.js`.
- **`bookingController.js`**: Manages basic ticket bookings.
- **`categoriesController.js`**: Handles creating/updating event categories.
- **`eventsController.js`**: Manages standard Event HTTP requests. Defers complex logic (like cloning) to `eventsService.js`.
- **`hallBookingsController.js`**: Validates availability and orchestrates the booking of physical halls.
- **`hallsController.js`**: Creates or edits physical hall details (capacity, hourly rates).
- **`marketingController.js`**: Calculates discount codes and applies them to ticket checkout flows.
- **`notificationsController.js`**: Streams or returns notifications for users.
- **`paymentsController.js`**: Processes simulated or Stripe/PayPal checkout sessions.
- **`publicController.js`**: Serves SEO-friendly or unauthenticated public event data.
- **`reviewsController.js`**: Handles creation, moderation, and aggregation of user reviews.
- **`searchController.js`**: Parses search queries and executes text-index lookups on the database.
- **`supportController.js`**: Manages customer service ticket states (Open, In Progress, Closed).
- **`ticketsController.js`**: Handles atomic locking for seat selection, ticket record generation, and offline check-in validation.
- **`uploadController.js`**: Manages the saving of uploaded files to disk or S3 and returns public URLs.
- **`usersController.js`**: Allows super-admins to ban, promote, or delete users.

---

## 📂 `services/` (Business Logic Extractors)

Services encapsulate heavy logical workflows entirely separate from HTTP `req` and `res` objects.

- **`authService.js`**: Handles precise password validation, reusable token generation logic, security threat detection (refresh token replay attacks), and DB user writes.
- **`eventsService.js`**: Builds complex dynamic MongoDB queries for the event catalog, handles robust object duplication (event cloning), and executes localized business validation.

---

## 📂 `models/` (Database Blueprints)

These Mongoose schemas define exactly what data looks like, what fields are required, and attach database-level integrity rules.

- **`AuditLog.js`**: Immutable record schema tracking "Who did What and When".
- **`Campaign.js`**: Schema for marketing campaigns and discount codes.
- **`Event.js`**: Massive schema cataloging Event details, venues, and the recursive `seatMap` array responsible for tracking physical seats.
- **`EventCategory.js`**: Schema defining overarching classification categories.
- **`Hall.js`**: Schema defining the venue's physical spaces (Meeting Room A, Grand Auditorium).
- **`HallBooking.js`**: Schema determining when a Hall is rented out, blocking overlapping time slots.
- **`Notification.js`**: Schema for in-app messaging alerts.
- **`Review.js`**: Schema mapping 1-5 star ratings paired with user text to specific Events.
- **`SupportTicket.js`**: Schema for Customer Service requests.
- **`Ticket.js`**: Schema representing a purchased admission, linking a User to an Event and a specific Seat.
- **`User.js`**: Core schema storing hashed passwords, sessions (for device invalidation), roles, and lockout timestamps.
- **`Waitlist.js`**: Schema capturing users who want to be notified if a sold-out Event adds more capacity or handles cancellations.

---

## 📂 `middleware/` (Interceptors)

Middleware functions run _between_ the Request and the Controller execution to format data or abort malicious requests early.

- **`auth.js`**: Contains multiple middleware like `authenticate` (JWT extraction) and RBAC wrappers (`requireAdmin`, `requireOrganizer`, `requireVenueAdmin`).
- **`validators.js`**: Uses `express-validator` to define rigid validation rules (e.g. `createBookingValidator`). It includes the generic wrapper to automatically reject requests failing validation before they even hit the Controller.

---

## 📂 `utils/` (Shared Helpers)

Small, generic modules used extensively throughout the codebase.

- **`logger.js`**: Implements `Winston` to create beautiful, leveled server logs (Info, Error, Warn) which can stream to the console or flat files simultaneously.
- **`emailService.js`**: Implements `Nodemailer` to shoot out SMTP emails (e.g., password resets, welcome emails, tickets).

---

## 📂 `docs/` (System Documentation)

The folder you are currently looking at.

- **`api-reference.md`**: Guide for reading the JSON responses, and pointer to Swagger UI.
- **`architecture.md`**: Overview of the layered MVC-Service design pattern and data pipelines.
- **`codebase-map.md`**: This file.
- **`models.md`**: Deep dive into the structure of database schemas and data tables.
- **`README.md`**: Main repository onboarding guide.
- **`security.md`**: Deep dive into CSRF, XSS, Rate Limits, and Cookie Management.
- **`setup.md`**: Instructions for installing dependencies, testing, and Docker/Production deployments.

---

## 📂 `__tests__/` (Quality Assurance)

Where all automated verification occurs.

- **`auth.test.js`**: Contains automated integration tests written using Jest and Supertest. It spins up a temporary in-memory MongoDB via `mongodb-memory-server` to simulate registering and logging in without destroying production data.
