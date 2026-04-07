const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
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
});
