const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const { createTestClient } = require('../test-utils/testClient');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');

const base32Decode = (input) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input).toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    while (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotp = (secret, timeMs = Date.now(), stepSeconds = 30, digits = 6) => {
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(timeMs / (stepSeconds * 1000)));

  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[19] & 0x0f;
  const codeInt = (hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits);
  return String(codeInt).padStart(digits, '0');
};

let mongoServer;

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
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

describe('Auth Endpoints', () => {
    it('should register a new user successfully', async () => {
        const client = createTestClient(app);
        const res = await client.csrfRequest('post', '/api/auth/register', {
            name: 'Test user',
            email: 'test@example.com',
            password: 'UniqueTestPass!2026',
            role: 'user'
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject a weak password', async () => {
        const client = createTestClient(app);
        const res = await client.csrfRequest('post', '/api/auth/register', {
            name: 'Weak user',
            email: 'weak@example.com',
            password: 'password',
            role: 'user'
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should login an existing user', async () => {
        const client = createTestClient(app);
        await client.csrfRequest('post', '/api/auth/register', {
            name: 'Login user',
            email: 'login@example.com',
            password: 'UniqueTestPass!2026'
        });

        const res = await client.csrfRequest('post', '/api/auth/login', {
            email: 'login@example.com',
            password: 'UniqueTestPass!2026'
        });

        // Login failures intentionally use a uniform response to prevent
        // account-state enumeration (unverified vs non-existing users).
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid email or password');
    });

  it('allows login with a valid 2FA TOTP code', async () => {
    const client = createTestClient(app);

    const plainSecret = 'JBSWY3DPEHPK3PXP'; // base32 secret
    const user = await User.create({
      name: '2FA User',
      email: `twofa_${Date.now()}@example.com`,
      password: 'UniqueTestPass!2026',
      role: 'user',
      emailVerified: true,
      isActive: true,
      twoFactorEnabled: true,
    });

    user.setTwoFactorSecret(plainSecret);
    await user.save();

    const twoFactorCode = generateTotp(plainSecret);

    const res = await client.csrfRequest('post', '/api/auth/login', {
      email: user.email,
      password: 'UniqueTestPass!2026',
      twoFactorCode,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('rejects account deletion when password is missing or not a string', async () => {
    const client = createTestClient(app);

    const user = await User.create({
      name: 'Delete Me',
      email: `delete_${Date.now()}@example.com`,
      password: 'UniqueTestPass!2026',
      role: 'user',
      emailVerified: true,
      isActive: true,
    });

    const sessionId = crypto.randomUUID();
    user.addSession(sessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await user.save();

    const token = generateAccessToken(user._id, sessionId);

    const missingRes = await client.csrfRequest(
      'delete',
      '/api/auth/account',
      {},
      { Authorization: `Bearer ${token}` }
    );

    expect(missingRes.statusCode).toBe(400);
    expect(missingRes.body.success).toBe(false);
    expect(missingRes.body.message).toBe('Validation failed');

    const nonStringRes = await client.csrfRequest(
      'delete',
      '/api/auth/account',
      { password: 12345 },
      { Authorization: `Bearer ${token}` }
    );

    expect(nonStringRes.statusCode).toBe(400);
    expect(nonStringRes.body.success).toBe(false);
    expect(nonStringRes.body.message).toBe('Validation failed');
  });
});
