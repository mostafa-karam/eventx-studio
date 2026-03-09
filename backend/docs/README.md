# EventX Studio - Backend Documentation

Welcome to the backend documentation for EventX Studio. This application serves as the core API, managing events, users, tickets, halls, coupons, and secure authentication for the platform.

## Table of Contents

1. [Setup and Configuration](setup.md) - How to get the backend running locally and in production.
2. [Security & Authentication](security.md) - Details on our CSRF protection, secure HTTP-only cookies, JWT implementations, MIME type validation, and rate limiting.
3. [Architecture Overview](architecture.md) - Insight into our routing, controllers, logging (Winston), and middleware pipeline.
4. [API Reference](api-reference.md) - Comprehensive guide to all available endpoints, including Events, Waitlists, Coupons, Halls, and Users.
5. [Database Models](models.md) - Deep dive into Mongoose schemas (Users, Events, Bookings, Tickets, Halls, Coupons, Reviews, Audit Logs).

## Core Tech Stack

- **Node.js** & **Express.js**: Fast, scalable web framework.
- **MongoDB** & **Mongoose**: NoSQL database for flexible and rapid schema iteration.
- **JWT & csurf**: Secure, state-of-the-art authentication utilizing HTTP-only cookies and double-submit cookie patterns.
- **Winston**: Advanced, leveled logging for production environments.
- **Multer**: Secure multipart/form-data handler for image uploading with strict MIME type validation.

## Key Built-in Features

- **Role-Based Access Control (RBAC)**: Distinct permissions for `user`, `organizer`, `venue_admin`, and `admin`.
- **Advanced Event & Hall Management**: Conflict-free hall reservation schedules linked directly to public events.
- **Waitlist & Capacity Systems**: Automated sold-out handling with waitlist queues for eager attendees.
- **Coupon & Discount Engine**: Percentage and fixed-rate promo codes securely validated at checkout.
- **Comprehensive Audit Trails**: Immutable logs for critical admin actions (e.g., role changes, user deletions).
- **GDPR Compliant**: Dedicated account deletion endpoints masking/deleting personal data.

Navigate through the links above to explore the specifics.
