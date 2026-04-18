const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const crypto = require('crypto');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { createTestClient } = require('../test-utils/testClient');
const { generateRefreshToken, hashToken } = require('../utils/authUtils');

let mongoServer;

jest.setTimeout(30000);

describe('Security Hardening Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany();
    }
  });

  describe('1. NoSQL Injection Protection', () => {
    it('rejects object-based login payloads before they reach Mongo queries', async () => {
      const client = createTestClient(app);
      const response = await client.csrfRequest('post', '/api/auth/login', {
        email: { $gt: '' },
        password: 'password123',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/invalid request payload|validation failed/i);
    });

    it('rejects suspicious Mongo operators in query strings', async () => {
      const response = await request(app).get('/api/events?title[$ne]=hack');

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/invalid request payload/i);
    });
  });

  describe('2. XSS Payload Handling', () => {
    it('sanitizes HTML/script payloads before persistence', async () => {
      const client = createTestClient(app);
      const response = await client.csrfRequest('post', '/api/auth/register', {
        name: '<script>alert("xss")</script>John Doe',
        email: `johndoe_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.data.user.name).not.toContain('<script>');
      expect(response.body.data.user.name).not.toContain('</script>');
    });
  });

  describe('3. Broken Access Control', () => {
    it('blocks a regular user from reaching admin-only user management routes', async () => {
      const user = await User.create({
        name: 'Regular User',
        email: 'regular-security@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
      });

      const userToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'test_secret_for_ci',
        { expiresIn: '1h' },
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/admin privileges required/i);
    });
  });

  describe('4. Rate Limiting', () => {
    it('returns 429 after repeated failed login attempts from the same key', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-rate-limit-login' });
      let lastResponse;

      for (let attempt = 0; attempt < 9; attempt += 1) {
        lastResponse = await client.csrfRequest('post', '/api/auth/login', {
          email: 'fake@test.com',
          password: 'wrong-password',
        });
      }

      expect(lastResponse.statusCode).toBe(429);
      expect(lastResponse.body.message).toMatch(/too many failed login attempts/i);
    });

    it('returns 429 after too many POST /api/tickets/lookup-qr attempts (per user/IP)', async () => {
      const max = Number(process.env.QR_LOOKUP_RATE_LIMIT_MAX || 5);
      const client = createTestClient(app, { rateLimitKey: 'security-qr-lookup-rate-limit' });

      const organizer = await User.create({
        name: 'QR RL Organizer',
        email: `qr_rl_org_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        emailVerified: true,
        isActive: true,
      });

      const loginRes = await client.csrfRequest('post', '/api/auth/login', {
        email: organizer.email,
        password: 'UniqueTestPass!2026',
      });
      expect(loginRes.statusCode).toBe(200);

      const event = await Event.create({
        title: 'QR Lookup RL Event',
        description: 'Rate limit test.',
        category: 'conference',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: organizer._id,
        seating: { totalSeats: 10, availableSeats: 10 },
        status: 'published',
      });

      const ticketOwner = await User.create({
        name: 'QR RL Owner',
        email: `qr_rl_owner_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      const ticket = await Ticket.create({
        event: event._id,
        user: ticketOwner._id,
        seatNumber: 'S001',
        payment: { status: 'completed', amount: 0, paymentMethod: 'free' },
      });

      const unsignedQrPayload = JSON.stringify({ ticketId: ticket.ticketId });
      let lastResponse;
      for (let i = 0; i < max + 1; i += 1) {
        lastResponse = await client.csrfRequest('post', '/api/tickets/lookup-qr', {
          qrCode: unsignedQrPayload,
          eventId: event._id,
        });
      }

      expect(lastResponse.statusCode).toBe(429);
      expect(String(lastResponse.body.message || '')).toMatch(/too many qr lookup attempts/i);
    });
  });

  describe('5. CSRF Enforcement', () => {
    it('fails module initialization when CSRF_SECRET is missing', () => {
      const originalCsrfSecret = process.env.CSRF_SECRET;
      // Setting to empty keeps it "present" so dotenv won't repopulate it.
      // The CSRF middleware must still fail because empty string is falsy.
      process.env.CSRF_SECRET = '';

      jest.resetModules();

      expect(() => require('../middleware/csrfProtection')).toThrow(/CSRF_SECRET/i);

      if (originalCsrfSecret === undefined) {
        delete process.env.CSRF_SECRET;
      } else {
        process.env.CSRF_SECRET = originalCsrfSecret;
      }
      jest.resetModules();
    });

    it('rejects auth mutations that omit the CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('x-test-rate-limit-key', 'csrf-missing-token')
        .send({
          name: 'No Csrf',
          email: 'nocsrf@example.com',
          password: 'UniqueTestPass!2026',
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/csrf/i);
    });
  });

  describe('6. Payment Token Secret Enforcement', () => {
    it('fails module initialization if PAYMENT_HMAC_SECRET is missing', () => {
      const originalSecret = process.env.PAYMENT_HMAC_SECRET;
      delete process.env.PAYMENT_HMAC_SECRET;
      jest.resetModules();

      expect(() => require('../utils/paymentTokens')).toThrow('Missing PAYMENT_HMAC_SECRET');

      process.env.PAYMENT_HMAC_SECRET = originalSecret || 'test_payment_hmac_secret_for_ci';
      jest.resetModules();
    });
  });

  describe('7. QR signing uses dedicated QR_HMAC_SECRET', () => {
    it('signs QR payload with QR_HMAC_SECRET, not JWT_SECRET', async () => {
      const event = await Event.create({
        title: 'QR Security Event',
        description: 'Security test event for QR signature keying.',
        category: 'conference',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: new mongoose.Types.ObjectId(),
        seating: { totalSeats: 10, availableSeats: 10 },
        status: 'published',
      });

      const user = await User.create({
        name: 'QR Test User',
        email: 'qr-test-user@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
      });

      const ticket = await Ticket.create({
        event: event._id,
        user: user._id,
        seatNumber: 'S001',
        payment: { status: 'completed', amount: 0, paymentMethod: 'free' },
      });

      const parsed = JSON.parse(ticket.qrCode);
      const { sig, ...payload } = parsed;
      const expected = crypto
        .createHmac('sha256', process.env.QR_HMAC_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(sig).toBe(expected);
    });
  });

  describe('8. Pagination normalization and upload access', () => {
    it('normalizes invalid page/limit values for events listing', async () => {
      const response = await request(app).get('/api/events?page=abc&limit=xyz');
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.current).toBe(1);
    });

    it('requires authentication for uploaded file retrieval', async () => {
      const response = await request(app).get('/api/upload/files/sample.png');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('9. Refresh token enforcement', () => {
    it('rejects refresh token rotation for inactive users', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-refresh-inactive' });

      const user = await User.create({
        name: 'Inactive Refresh User',
        email: `inactive_refresh_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: false,
      });

      const sessionId = crypto.randomUUID();
      user.addSession(sessionId, { ipAddress: '127.0.0.1' });

      const refreshToken = generateRefreshToken(user._id, sessionId);
      const refreshTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h in future
      user.setSessionRefreshToken(sessionId, hashToken(refreshToken), refreshTokenExpiry);
      await user.save();

      const response = await client.csrfRequest('post', '/api/auth/refresh', {
        refreshToken,
      });

      expect([400, 401, 403]).toContain(response.statusCode);
      expect(response.body.message).toMatch(/deactivated|invalid|refresh token/i);
    });

    it('rejects refresh token rotation for unverified users', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-refresh-unverified' });

      const user = await User.create({
        name: 'Unverified Refresh User',
        email: `unverified_refresh_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: false,
        isActive: true,
      });

      const sessionId = crypto.randomUUID();
      user.addSession(sessionId, { ipAddress: '127.0.0.1' });

      const refreshToken = generateRefreshToken(user._id, sessionId);
      const refreshTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h in future
      user.setSessionRefreshToken(sessionId, hashToken(refreshToken), refreshTokenExpiry);
      await user.save();

      const response = await client.csrfRequest('post', '/api/auth/refresh', {
        refreshToken,
      });

      expect([400, 401, 403]).toContain(response.statusCode);
      expect(response.body.message).toMatch(/verify your email|invalid|refresh token/i);
    });
  });

  describe('10. Password reset revokes refresh tokens', () => {
    it('prevents an existing refresh token from working after reset', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-password-reset-revoke' });

      const user = await User.create({
        name: 'Reset Revoke User',
        email: `reset_revoke_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      // Login to obtain the refreshToken cookie.
      const loginRes = await client.csrfRequest('post', '/api/auth/login', {
        email: user.email,
        password: 'UniqueTestPass!2026',
      });
      expect(loginRes.statusCode).toBe(200);

      // Issue a password reset token.
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const newPassword = 'UniqueReset!2026GhJK';
      const resetRes = await client.csrfRequest('post', '/api/auth/reset-password', {
        token: resetToken,
        password: newPassword,
      });
      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Refresh should now fail because sessions/refresh hashes were revoked.
      const refreshRes = await client.csrfRequest('post', '/api/auth/refresh', undefined);
      expect(refreshRes.statusCode).toBe(401);
      expect(refreshRes.body.message).toMatch(/session has expired or been revoked|refresh token reuse detected/i);
    });
  });

  describe('11. QR check-in requires signed payload', () => {
    it('rejects an unsigned JSON QR payload', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-qr-unsigned' });

      const organizer = await User.create({
        name: 'QR Organizer',
        email: `qr_org_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        emailVerified: true,
        isActive: true,
      });

      const loginRes = await client.csrfRequest('post', '/api/auth/login', {
        email: organizer.email,
        password: 'UniqueTestPass!2026',
      });
      expect(loginRes.statusCode).toBe(200);

      const event = await Event.create({
        title: 'QR Checkin Event',
        description: 'Event for QR check-in tests.',
        category: 'conference',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: organizer._id,
        seating: { totalSeats: 10, availableSeats: 10 },
        status: 'published',
      });

      const ticketOwner = await User.create({
        name: 'Ticket Owner',
        email: `qr_owner_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      const ticket = await Ticket.create({
        event: event._id,
        user: ticketOwner._id,
        seatNumber: 'S001',
        payment: { status: 'completed', amount: 0, paymentMethod: 'free' },
      });

      const unsignedQrPayload = JSON.stringify({ ticketId: ticket.ticketId });

      const response = await client.csrfRequest('post', '/api/tickets/lookup-qr', {
        qrCode: unsignedQrPayload,
        eventId: event._id,
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid or tampered qr code/i);
    });

    it('rejects non-JSON QR input (no fallback to raw ticketId)', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-qr-non-json' });

      const organizer = await User.create({
        name: 'QR Organizer',
        email: `qr_org_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        emailVerified: true,
        isActive: true,
      });

      const loginRes = await client.csrfRequest('post', '/api/auth/login', {
        email: organizer.email,
        password: 'UniqueTestPass!2026',
      });
      expect(loginRes.statusCode).toBe(200);

      const event = await Event.create({
        title: 'QR Checkin Event 2',
        description: 'Event for QR check-in tests.',
        category: 'conference',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: organizer._id,
        seating: { totalSeats: 10, availableSeats: 10 },
        status: 'published',
      });

      const ticketOwner = await User.create({
        name: 'Ticket Owner 2',
        email: `qr_owner_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      const ticket = await Ticket.create({
        event: event._id,
        user: ticketOwner._id,
        seatNumber: 'S001',
        payment: { status: 'completed', amount: 0, paymentMethod: 'free' },
      });

      const response = await client.csrfRequest('post', '/api/tickets/lookup-qr', {
        qrCode: ticket.ticketId, // raw ticketId string should be rejected now
        eventId: event._id,
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid or tampered qr code/i);
    });

    it('accepts a valid signed JSON QR payload', async () => {
      const client = createTestClient(app, { rateLimitKey: 'security-qr-signed' });

      const organizer = await User.create({
        name: 'QR Organizer',
        email: `qr_org_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        emailVerified: true,
        isActive: true,
      });

      const loginRes = await client.csrfRequest('post', '/api/auth/login', {
        email: organizer.email,
        password: 'UniqueTestPass!2026',
      });
      expect(loginRes.statusCode).toBe(200);

      const event = await Event.create({
        title: 'QR Checkin Event 3',
        description: 'Event for QR check-in tests.',
        category: 'conference',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: organizer._id,
        seating: { totalSeats: 10, availableSeats: 10 },
        status: 'published',
      });

      const ticketOwner = await User.create({
        name: 'Ticket Owner 3',
        email: `qr_owner_${Date.now()}@example.com`,
        password: 'UniqueTestPass!2026',
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      const ticket = await Ticket.create({
        event: event._id,
        user: ticketOwner._id,
        seatNumber: 'S001',
        payment: { status: 'completed', amount: 0, paymentMethod: 'free' },
      });

      const response = await client.csrfRequest('post', '/api/tickets/lookup-qr', {
        qrCode: ticket.qrCode,
        eventId: event._id,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.checkIn.isCheckedIn).toBe(true);
    });
  });
});
