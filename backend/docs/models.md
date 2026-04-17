# Database Models Reference

EventX Studio leverages Mongoose (MongoDB) with a highly relational document structure. The system defines 13 base schemas that interlink through standard ObjectIds (`ref`).

## Core Unified Features
- **Timestamps**: Every single model includes `{ timestamps: true }`, automatically generating immutable `createdAt` and `updatedAt` properties.
- **Indexes**: Heavy lookup fields (like `email`, `role`, `status`) have database-layer indexing implemented either structurally or via `.index()` hooks to accelerate `$match` queries.
- **Virtuals Extraction**: JSON transforms are universally applied to strip `__v` arrays and transform native `_id` parameters into `id` for cleaner frontend serialization.

---

## 1. User (`models/User.js`)
The absolute core of authorization and identification.
- **`name` / `email`**: Standard identity constants. Email enforces strict uniqueness.
- **`password`**: Selectively obscured (`select: false`). Secured by a `pre('save')` hook that runs `bcryptjs.hash()` at cost-factor 10.
- **`role`**: Enforces strict RBAC (`user`, `organizer`, `admin`, `venue_admin`).
- **`interests`**: An array of strings heavily queried by machine learning/recommendation systems locally.
- **Methods**: Extensive schema methods including `matchPassword(entered)` and `getSignedJwtToken()` utilizing dynamic signatures.

## 2. Event (`models/Event.js`)
The central entity for the platform linking Organizers to Attendees.
- **`title` / `description` / `category`**: Basic taxonomies.
- **`date` / `endDate`**: Bounds for the event timeframe.
- **`venue`**: Embedded Object holding `{ name, address, city, country, capacity }` for physical rendering without requiring a population lookup.
- **`pricing`**: `{ type: enum['free', 'paid'], amount: Number, currency }` — Dictates transaction handling on ticket bounds.
- **`seating`**: Maintains atomic constants like `totalSeats` and `availableSeats`.
- **`status`**: State machine controlling visibility (`draft`, `published`, `cancelled`, `completed`). Can be mutated actively or by cron workers reviewing dates.

## 3. Ticket (`models/Ticket.js`)
Transitory bridging entity connecting one `User` to one `Event`.
- **`seatNumber`**: String reference to assigned position (e.g., "A-01"), often automatically generated.
- **`status`**: State mapping (`booked`, `used`, `cancelled`, `expired`).
- **`payment`**: Embedded receipt block detailing `status`, `amount`, and `paymentMethod`.
- **`qrCode`**: HMAC-signed JSON payload containing ticket metadata + signature (`sig`) for tamper detection.
- **`checkIn`**: Mutated by `ticketsController.js` to log exact physical arrival times (`isCheckedIn`, `checkInTime`).

## 4. Hall (`models/Hall.js`)
Owned entirely by `venue_admin` entities for B2B sub-leasing functionality.
- **`capacity`**: Maximum allowable load for the physical space.
- **`equipment` / `amenities` / `rules`**: Large array maps of strings detailing offerings (e.g., projector, wifi, no_smoking) which power the filtering UIs.
- **`hourlyRate` / `dailyRate`**: Numerical cost baselines.

## 5. HallBooking (`models/HallBooking.js`)
Connects an `organizer` (User) to a `venue` (Hall). Completely separate from the user ticketing system. Contains administrative `status` enumerators (`pending`, `approved`, `rejected`) and records localized negotiation `notes`.

## 6. EventCategory (`models/EventCategory.js`)
Simple taxonomical categorizations. Uses unique `slug` formats ("music", "technology"). Also stores visual identity helpers like `icon`, `emoji`, and `color` hex codes required by the frontend card rendering.

## 7. Coupon (`models/Coupon.js`)
Checkout reduction codes natively tied to Events.
- **`discountType`**: Identifies whether the discount is proportional (`percentage`) or absolute (`fixed`).
- **`isValid` (Virtual)**: Validates against `expiresAt` automatically without requiring manual toggling.
- Tracks `usedCount` dynamically out of `maxUses`.

## 8. Review (`models/Review.js`)
Submitted heavily by users. 
Enforces `user` and `event` indexing (A user can only review an event once). Contains `rating` (1-5) and checks `attendedVerified` strictly asserting that the tied `Ticket` model had a `used` status.

## 9. Notification (`models/Notification.js`)
A persisted entity capturing atomic state alerts. 
Unlike derived virtuals, Notification exists as real MongoDB ObjectIDs, which guarantees that `read: true` and `.deleteMany` operations permanently succeed locally. Generates URLs referencing direct links (`actionUrl`).

## 10. Waitlist (`models/Waitlist.js`)
Tracks Users queueing for heavily saturated Events. Governed by a FIFO (First-in, First-out) resolution array. Maintains internal `status` fields (`pending`, `notified`, `expired`, `joined`) based directly on seat availability signals broadcast by the `bookingService`.

## 11. SupportTicket (`models/SupportTicket.js`)
An independent ticketing system (CSR bounds) separating operational issues (`category`: technical, billing, general) into priority channels tracked by Admins.

## 12. Campaign (`models/Campaign.js`)
Marketing schema isolating outbound broadcasting strategies. Records targeted metrics (`sent`, `delivered`, `opened`) against respective target groups.

## 13. AuditLog (`models/AuditLog.js`)
Immutably written by middleware systems. Tracks `actorRole`, `action`, `resource`, and the source `ip` for high-end security traceback routines on administrative actions.
Includes `user.delete` action enum for account deletion traceability.
