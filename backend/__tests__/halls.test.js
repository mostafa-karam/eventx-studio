const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Hall = require('../models/Hall');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let authToken;
let testHallId;
let client;

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

describe('Halls Endpoints', () => {
    beforeEach(async () => {
        client = createTestClient(app);
        await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'UniqueTestPass!2026',
            role: 'admin',
            emailVerified: true
        });

        const loginRes = await client.csrfRequest('post', '/api/auth/login', {
            email: 'admin@example.com',
            password: 'UniqueTestPass!2026'
        });

        const cookies = loginRes.headers['set-cookie'];
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        authToken = accessTokenCookie.split(';')[0].split('=')[1];
    });

    it('should create a hall', async () => {
        const createHallRes = await request(app)
            .post('/api/halls')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Grand Ballroom',
                capacity: 500,
                hourlyRate: 150
            });

        expect(createHallRes.statusCode).toBe(201);
        expect(createHallRes.body.success).toBe(true);
        expect(createHallRes.body.data.hall).toBeDefined();
        testHallId = createHallRes.body.data.hall._id;
    });

    it('should list halls', async () => {
        await request(app)
            .post('/api/halls')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Grand Ballroom',
                capacity: 500,
                hourlyRate: 150
            });

        const listRes = await request(app)
            .get('/api/halls')
            .set('Authorization', `Bearer ${authToken}`);

        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.success).toBe(true);
        expect(Array.isArray(listRes.body.data.halls)).toBe(true);
        expect(listRes.body.data.halls.length).toBe(1);
    });
});
