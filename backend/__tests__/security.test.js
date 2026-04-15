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

let mongoServer;

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
  });

  describe('5. CSRF Enforcement', () => {
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
});
