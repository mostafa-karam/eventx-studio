# Testing Guide

EventX Studio uses **Jest** as the test runner and **Supertest** for HTTP integration testing. All tests live in the `backend/__tests__/` directory and run against an ephemeral **MongoDB Memory Server** — no real database connection is needed.

---

## Quick Start

```bash
# Run all tests
npm test

# Run a specific test file
npx jest __tests__/auth.test.js --detectOpenHandles --forceExit
```

The `package.json` script is:
```json
"test": "jest --detectOpenHandles --forceExit"
```

- `--detectOpenHandles`: Warns about any async operations that prevent Jest from exiting cleanly (e.g., unclosed DB connections).
- `--forceExit`: Forces Jest to exit after tests complete, even if handles remain. Essential because the Express server may keep a listener open.

---

## Test Infrastructure

### MongoDB Memory Server
Instead of hitting your real MongoDB instance, every test suite spins up `mongodb-memory-server`. This creates a temporary, in-memory MongoDB instance that:
- Is completely isolated per test run
- Requires zero configuration or `.env` variables
- Is automatically destroyed after the suite finishes

### Request Simulation
`supertest` wraps the Express `app` object and simulates full HTTP requests (headers, cookies, body parsing) without needing to start the server on a real port.

---

## Test Suites

### 1. `auth.test.js` — Authentication Flow
Tests the registration and login lifecycle:
- **User Registration**: Verifies that `POST /api/v1/auth/register` creates a user and returns a token cookie.
- **Login**: Verifies that `POST /api/v1/auth/login` returns valid JWT credentials.
- **Invalid Credentials**: Ensures incorrect passwords return `401`.
- **Duplicate Email**: Ensures registering with an existing email returns an error.

### 2. `booking.test.js` — Ticket Booking Flow
The most critical integration test. Validates the full booking lifecycle:
- **Successful Booking**: Creates an event, books a ticket, and verifies seat count decrements.
- **Cancellation**: Books then cancels a ticket, verifying the seat is returned to the pool.
- **Sold Out Prevention**: Attempts to book when `availableSeats === 0` and expects a `400` error.
- **Payment Validation**: Verifies that the ticket's payment object is correctly populated.

### 3. `eventLifecycle.test.js` — Event CRUD + Status
Tests the full event management pipeline:
- **Create Event**: Organizer creates a published event with all required fields.
- **Update Event**: Modifies event title and verifies persistence.
- **Status Transitions**: Tests `draft → published → cancelled` state changes.
- **Authorization**: Verifies that a regular `user` role cannot create events (`403`).

### 4. `halls.test.js` — Hall Management
Tests venue administration:
- **Create Hall**: Venue admin creates a hall with equipment and pricing.
- **List Halls**: Public endpoint returns all active halls.
- **Authorization**: Verifies that non-venue-admins cannot create halls.

### 5. `reviews.test.js` — Review Submission
Tests the review system:
- **Submit Review**: Verified attendee submits a rating and review body.
- **Duplicate Prevention**: Second review on the same event by the same user is rejected.
- **Rating Validation**: Ensures ratings must be 1-5.
- **Non-Attendee Rejection**: Users who didn't attend cannot leave reviews.

---

## CI/CD Integration

In GitHub Actions (`.github/workflows/ci.yml`), tests run with injected environment variables:
```yaml
env:
  NODE_ENV: test
  JWT_SECRET: ci-test-jwt-secret
  JWT_REFRESH_SECRET: ci-test-refresh-secret
  MONGODB_URI: mongodb://localhost:27017/eventx-ci
  CSRF_SECRET: ci-test-csrf-secret
```

These dummy values satisfy the `server.js` startup validation without exposing real secrets. The actual database connection is overridden by `mongodb-memory-server` within each test file.

---

## Writing New Tests

When adding a new test file, follow this pattern:

```javascript
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../server'); // Import Express app

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('Feature Name', () => {
    it('should do something expected', async () => {
        const res = await request(app)
            .post('/api/v1/some-endpoint')
            .send({ key: 'value' });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
```

### Key Guidelines
- Always create test data **within** each test or in `beforeEach` — never rely on seed data.
- Use `afterEach` to clean collections so tests don't leak state.
- Test both the happy path **and** error cases (invalid input, unauthorized access, not found).
