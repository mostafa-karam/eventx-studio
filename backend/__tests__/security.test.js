const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

const { MongoMemoryServer } = require('mongodb-memory-server');

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

  describe('1. NoSQL Injection Protection', () => {
    it('should block NoSQL injection payloads in body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { "$gt": "" },
          password: "password123"
        });

      // It might pass as a 400 Validation Error or 401 if parsed literally, but shouldn't be 500 or 200
      expect(res.statusCode).not.toBe(200);
      expect(res.statusCode).not.toBe(500);
    });
  });

  describe('2. XSS Payload Handling', () => {
    it('should sanitize HTML tags from request body', async () => {
      // Send a payload containing HTML
      const res = await request(app)
        .post('/api/auth/register') // A route that echoes back validation or accepts data
        .send({
          name: '<script>alert("xss")</script>John Doe',
          email: 'johndoe_' + Date.now() + '@example.com',
          password: 'Password123!',
          role: 'user'
        });

      // Verification heavily depends on the router, but we check that the DB input/validation
      // process was either rejected or stripped the <script> tag.
      // E.g., if validation error occurs on name length or if it was accepted:
      if (res.body.success && res.body.data && res.body.data.user) {
         expect(res.body.data.user.name).not.toContain('<script>');
      } else {
         // Either validation caught it or it was cleanly stripped and passed
         expect(res.text).not.toContain('<script>alert("xss")</script>');
      }
    });
  });

  describe('3. Broken Access Control (BAC)', () => {
    it('should prevent unauthenticated user from accessing admin route', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('4. Rate Limiting', () => {
     it('should return 429 Too Many Requests if brute forcing /api/auth/login', async () => {
        // Our authLimiter is set to max 15 requests per 15 minutes.
        // We will make 16 requests.
        let status;
        for(let i = 0; i < 16; i++) {
           const res = await request(app)
             .post('/api/auth/login')
             .send({ email: 'fake@test.com', password: 'fake' });
           status = res.statusCode;
        }
        
        // The 16th request should be 429
        expect(status).toBe(429);
     });
  });

});
