# EventX Studio API Documentation

## Authentication & Authorization
The API use JWT for authentication. Include the token in the `Authorization` header:
`Authorization: Bearer <token>`

### Roles
The system supports the following roles:
- `user`: Standard customer
- `organizer`: Can create and manage their own events
- `venue_admin`: Can manage halls and approve/reject bookings
- `admin`: Super admin with full system access

## Auth Routes

- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Authenticate and get token
- `GET /api/auth/me` - Get current user profile (Private)
- `POST /api/auth/change-password` - Change password (Private)

## Event Routes (`/api/events`)

- `GET /api/events` - Get all published events (Public)
- `GET /api/events/:id` - Get single event details (Public)
- `GET /api/events/admin/my-events` - Get events by current organizer/admin (Private, Organizer/Admin)
- `POST /api/events` - Create a new event (Private, Organizer/Admin)
- `PUT /api/events/:id` - Update an event (Private, Organizer/Admin)
- `DELETE /api/events/:id` - Delete an event (Private, Organizer/Admin)
- `POST /api/events/:id/clone` - Clone an existing event (Private, Organizer/Admin)
- `GET /api/events/:id/seats` - Get seat availability for an event (Public)
- `POST /api/events/:id/waitlist` - Join waitlist for a sold-out event (Private)
- `GET /api/events/:id/waitlist` - Get waitlist entries for an event (Private, Organizer/Admin)
- `POST /api/events/:id/waitlist/:waitlistId/approve` - Approve a waitlist entry (Private, Organizer/Admin)

## Hall Routes (`/api/halls`)

- `GET /api/halls` - Get all active halls (Private, Organizer/Venue Admin/Admin)
- `GET /api/halls/:id` - Get specific hall details (Private, Organizer/Venue Admin/Admin)
- `POST /api/halls` - Create a new hall (Private, Venue Admin/Admin)
- `PUT /api/halls/:id` - Update a hall (Private, Venue Admin/Admin)
- `DELETE /api/halls/:id` - Delete a hall (Private, Venue Admin/Admin)

## Hall Booking Routes (`/api/hall-bookings`)

- `GET /api/hall-bookings/my-bookings` - Get bookings made by the current user (Private, Organizer)
- `GET /api/hall-bookings/pending` - Get pending booking requests (Private, Venue Admin/Admin)
- `POST /api/hall-bookings` - Request to book a hall (Private, Organizer)
- `PUT /api/hall-bookings/:id/approve` - Approve a booking request (Private, Venue Admin/Admin)
- `PUT /api/hall-bookings/:id/reject` - Reject a booking request (Private, Venue Admin/Admin)

## Ticket Routes (`/api/tickets`)

- `GET /api/tickets/my-tickets` - Get tickets for current user (Private)
- `POST /api/tickets/book` - Book a single ticket (Private)
- `POST /api/tickets/book-multi` - Book multiple tickets (Private)
- `PUT /api/tickets/:id/cancel` - Cancel a booked ticket (Private)

## User Management Routes (`/api/users`)

- `GET /api/users` - List all users (Private, Admin)
- `PUT /api/users/:id/role` - Update user role (Private, Admin)

## Analytics Routes (`/api/dashboard`)

- `GET /api/dashboard/stats` - Get admin/organizer dashboard statistics (Private, Organizer/Admin)
