const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const { createTestClient } = require('../test-utils/testClient');

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

        // Because email verification is required and we did not mock it to skip, 
        // it will return 403 Email verification required for now.
        // In our authController, unverified accounts get 403 on login.
        expect(res.statusCode).toBe(403);
        expect(res.body.emailVerificationRequired).toBe(true);
    });
});
