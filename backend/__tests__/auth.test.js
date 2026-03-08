const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

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
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test user',
                email: 'test@example.com',
                password: 'Password123!',
                role: 'user'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject a weak password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Weak user',
                email: 'weak@example.com',
                password: 'password', // weak
                role: 'user'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should login an existing user', async () => {
        // Register
        await request(app).post('/api/auth/register').send({
            name: 'Login user',
            email: 'login@example.com',
            password: 'StrongPassword1!'
        });

        // Login
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'login@example.com',
                password: 'StrongPassword1!'
            });

        // Because email verification is required and we did not mock it to skip, 
        // it will return 403 Email verification required for now.
        // In our authController, unverified accounts get 403 on login.
        expect(res.statusCode).toBe(403);
        expect(res.body.emailVerificationRequired).toBe(true);
    });
});
