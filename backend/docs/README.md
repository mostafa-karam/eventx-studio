# EventX Studio Backend documentation

Welcome to the official, in-depth backend documentation for **EventX Studio**. This documentation is designed to serve as a comprehensive guide for developers, system administrators, and security auditors.

## 🏗️ Project Overview

**EventX Studio** is a professional venue management system designed for high-concurrency event hosting. The core value proposition is the seamless management of a large physical venue containing multiple halls (varying in capacity and equipment).

### 🔑 Core Features

- **Hall Management**: Complete CRUD for venue halls, including capacity tracking and feature lists (AV equipment, accessibility, etc.).
- **Organization Support**: Allows companies and event organizers to rent specific halls for conferences, workshops, or private events.
- **Dynamic Event Lifecycle**: Support for draft events, scheduling, and live publishing.
- **Atomic Booking Engine**: A high-performance seat-booking system that prevents double-bookings through database-level locks.
- **Advanced Analytics**: Real-time tracking of revenue, attendance, and hall occupancy rates.
- **Security-First Auth**: JWT-based session management with Refresh Token rotation and 2FA support.
- **Communication Layer**: Automated email notifications for registrations, bookings, and waitlist availability.

## 📁 Detailed Project Structure

```text
backend/
├── controllers/          # Business Logic
│   ├── authController.js     # User registration, login, 2FA, session tracking
│   ├── eventsController.js   # Event CRUD, lifecycle, and waitlists
│   ├── ticketsController.js  # Atomic booking, check-ins, and user tickets
│   ├── analyticsController.js# Complex MongoDB aggregations for reports
│   └── ... (see docs/api-reference.md)
├── docs/                 # Documentation (Line-by-line detailed guides)
├── middleware/           # Pipeline Processing
│   ├── auth.js               # Multi-layer role-based authorization (RBAC)
│   ├── errorMiddleware.js     # Centralized error mapping and sanitization
│   └── ... (CORS, Rate Limiting, CSRF are in server.js)
├── models/               # Data Layer & Schemas
│   ├── User.js               # Profiles, security state, and sessions
│   ├── Event.js              # Event details and atomic seat map logic
│   ├── Ticket.js             # Booking records and QR code generation
│   └── ... (Halls, Audits, Notifications)
├── routes/               # lean entry points (mapping URLs to Controllers)
├── utils/                # Utility Services
│   ├── logger.js             # Winston-based Winston logger
│   └── emailService.js       # Nodemailer wrapper with template support
├── uploads/              # Storage for event images and user avatars
└── server.js             # Entry Point & Global Security configuration
```

## 📚 Detailed Documentation Index

1. [**Architecture Deep Dive**](architecture.md) - Understanding the technical patterns and middleware pipelines.
2. [**API Reference (Full Specs)**](api-reference.md) - Request bodies, response schemas, and error codes.
3. [**Database & Schemas**](models.md) - Detailed field-level definitions and indexing strategy.
4. [**Security Implementation**](security.md) - How we protect tokens, mitigate XSS/CSRF, and handle sessions.
5. [**Setup, Dev & Deployment**](setup.md) - Step-by-step configuration for local and production environments.
