const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let userToken;
let user;
let client;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    user = await User.create({
        name: 'Upload User',
        email: 'upload_test@example.com',
        password: 'Password123!',
        role: 'user',
        isActive: true,
        emailVerified: true
    });
    const userSessionId = crypto.randomUUID();
    user.addSession(userSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await user.save();
    userToken = generateAccessToken(user._id, userSessionId);

    client = createTestClient(app);
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('Upload Endpoints', () => {
    it('should reject unauthenticated upload requests', async () => {
        const res = await request(app).post('/api/upload');
        expect(res.statusCode).toBe(403);
    });

    it('should upload an image successfully', async () => {
        // Valid 1x1 PNG Buffer
        const validPngBuffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 
            0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 
            0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 
            0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 
            0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 
            0x42, 0x60, 0x82
        ]);
        
        const csrfToken = await client.getCsrfToken();
        const res = await client.agent.post('/api/upload')
            .set('x-csrf-token', csrfToken)
            .set('Authorization', `Bearer ${userToken}`)
            .attach('images', validPngBuffer, { filename: 'test.png', contentType: 'image/png' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.images).toBeDefined();
        expect(res.body.data.images.length).toBe(1);
    });
});
