# Comprehensive API Reference

This document extensively maps all available REST endpoints accessible via the EventX Backend. 

## Global Prefix
All backend routes adhere to the global prefix:
```text
http://localhost:5000/api/v1
```

## Standardized Responses
Every endpoint returns a normalized JSON envelope:
**Success:**
```json
{
  "success": true,
  "data": { ... } // or "message"
}
```
**Error:**
```json
{
  "success": false,
  "message": "Descriptive reason for failure"
}
```

---

## 1. Authentication (`/auth`)

| Method | Endpoint | Access | Description | Parameters (Body) |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | Public | Register a new user | `{ name, email, password, role }` |
| `POST` | `/login` | Public | Login via credentials | `{ email, password }` |
| `GET` | `/logout` | Private | Destroy HttpOnly auth cookies | None |
| `GET` | `/me` | Private | Retrieve active JWT user profile | None |
| `POST` | `/updatepassword` | Private | Change active password | `{ currentPassword, newPassword }` |
| `POST` | `/refresh` | Public | Rotates Refresh Token | Requires `refreshToken` cookie |
| `GET` | `/csrf-token` | Public | Fetch CSRF required for forms | None |
| `POST` | `/tfa/setup` | Private | Generates 2FA QR Code | None |
| `POST` | `/tfa/verify` | Private | Enables 2FA via code | `{ code: "123456" }` |
| `POST` | `/tfa/validate`| Public | Finalize login if 2FA active | `{ token (tempAuthToken), code }` |


## 2. Events (`/events`)

| Method | Endpoint | Access | Description | Parameters / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Get all events (paginated) | `?page, ?limit, ?category, ?search` |
| `GET` | `/:id` | Public | Single Event Details | None |
| `POST` | `/` | Organizer | Create an event | `{ title, description, category... }` |
| `PUT` | `/:id` | Organizer | Modify owned event | `{ ...updatedFields }` |
| `DELETE` | `/:id` | Organizer | Cancel owned event | None |
| `PUT` | `/:id/status`| Organizer | Change event visibility | `{ status: "published" }` |
| `GET` | `/organizer/my-events`| Organizer | List internally owned events| None |


## 3. Tickets & Bookings (`/tickets`)

| Method | Endpoint | Access | Description | Parameters (Body) |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/book` | Private | Request a ticket via service | `{ eventId, seatNumber?, payment }` |
| `GET` | `/my-tickets` | Private | View user's tickets | None |
| `GET` | `/:id` | Private | Ticket validation payload | None |
| `POST` | `/:id/cancel` | Private | User relinquishes a ticket | None |
| `POST` | `/:id/checkin`| Organizer | Organizer manually checks user | None |
| `POST` | `/checkin/qr` | Organizer | QR payload validation endpoint | `{ qrData: "uuid-xxxx" }` |


## 4. Users & Attendees (`/users`)

| Method | Endpoint | Access | Description | Form-Data / Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Admin | List all registered users | None |
| `GET` | `/:id` | Admin | Details on singular account | None |
| `PUT` | `/:id/role` | Admin | Elevate/demote roles | `{ role: "venue_admin" }` |
| `PUT` | `/profile` | Private | Standard user update | `{ location, interests }` |
| `PUT` | `/avatar` | Private | Form-Data Avatar Upload | Form-Data: `avatar` field |


## 5. Event Analytics (`/analytics`)

| Method | Endpoint | Access | Description | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Admin | High-level system overview | Total Users, Revenue, System Health |
| `GET` | `/organizer` | Organizer | Metrics scoped to auth user | Revenue sums, active bookings |
| `GET` | `/events/:id` | Organizer | Singular event metrics | Demographics, check-in rates |


## 6. Hall Leasing (`/halls`)

| Method | Endpoint | Access | Description | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | List all physical halls | Query filtering available |
| `POST` | `/` | VenueAdmin| Register a new physical space| Detailed `{ equipment, capacity }` |
| `POST` | `/request` | Organizer | Request to reserve a Hall | `{ hallId, startDate }` |
| `PUT` | `/request/:id` | VenueAdmin| Approve/Reject a request | `{ status: "approved" }` |


## 7. Notifications (`/notifications`)

| Method | Endpoint | Access | Description | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Private | My Notifications | Query Database |
| `PUT` | `/:id/read` | Private | Toggle read status | Mongoose `.findOneAndUpdate` |
| `PUT` | `/read-all` | Private | Mark all clear | None |
| `DELETE` | `/:id` | Private | Trash Notification | None |


## 8. Utilities (`/categories`, `/coupons`, `/reviews`)

1. **`GET /api/categories`**: Public fetch of taxonomies. Additions require Admin access.
2. **`POST /api/coupons/validate`**: Public verification `({ code, eventId })` against expiry.
3. **`POST /api/events/:id/reviews`**: Verified Attendees push ratings up to 5 stars.
4. **`POST /api/support`**: Generates a generic Technical/Billing Support Ticket.
