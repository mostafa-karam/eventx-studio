# Data Processing & Scripts Guide

The `/scripts` directory houses independent, executable Node files. These scripts are run via the command line and interact directly with the MongoDB layer bypass the Express server completely.

## The Global Seeder (`seed.js`)

The `seed.js` script is the primary utility for populating a local or staging database with a massive, hyper-realistic dataset.

### Execution
Run via NPM from the backend root:
```bash
npm run seed
```

### Script Behaviors
1. **Destructive Prep**: The script executes an unconditional `deleteMany({})` across **all 13 models**. Running `seed.js` completely destroys the existing database state to ensure idempotency.
2. **Predictable Logins**: While the script uses `@faker-js/faker` for the bulk of data generation, the administrative accounts remain statically defined:
   - **Admin**: `admin@eventx.com` / `password123`
   - **Organizer**: `organizer@techx.com` / `password123`
   - **Venue Admin**: `venue@eventx.com` / `password123`
3. **Relational Depth**: The script doesn't just create standalone documents. It specifically hooks models together:
   - **Events** are mapped explicitly to **Halls**.
   - **Tickets** are booked by generating atomic actions via `event.bookSeat()`.
   - **Reviews** assert attendance via checking ticket states.
   - **Notifications** and **Waitlists** are spawned to simulate a heavily-trafficked, active platform.

---

## Utility Scripts

*Note: Over time, debugging scripts (e.g., `check-revenue.js`, `diag-tickets.js`) have been consolidated or removed to keep the directory clean. If you need singular diagnostic runs, you can create isolated files here and execute them via `node scripts/your-file.js`.*

### `sync-event-stats.js`
A self-healing script to resolve desyncs between actual ticket documents and the aggregated `seating` counts locked on the Event models.
- **Execution**: `node scripts/sync-event-stats.js`
- **Logic**: Aggregates all valid active tickets and sets the Event's `analytics.bookings` exactly to that count, preventing mathematical drift.

### `verify-countries.js`
A location taxonomy corrector.
- **Execution**: `node scripts/verify-countries.js`
- **Logic**: Scans older User models that might contain free-text "Dubai" in the country field, migrating them to standard "UAE" maps for proper frontend demographic charts.
