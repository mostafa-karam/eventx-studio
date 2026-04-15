const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let adminToken, userToken;
let admin, user;
let client;
let testCategoryId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin Categorizer',
        email: 'admin_cat@example.com',
        password: 'Password123!',
        role: 'admin',
        isActive: true,
        emailVerified: true
    });
    const adminSessionId = crypto.randomUUID();
    admin.addSession(adminSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await admin.save();
    adminToken = generateAccessToken(admin._id, adminSessionId);

    user = await User.create({
        name: 'Normal User',
        email: 'user_cat@example.com',
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

describe('Category Endpoints', () => {
    it('should prevent non-admin from creating category', async () => {
        const res = await client.csrfRequest('post', '/api/categories', {
            name: 'Music', description: 'Music events'
        }, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(403);
    });

    it('should allow admin to create a category', async () => {
        const res = await client.csrfRequest('post', '/api/categories', {
            name: 'Music Festival',
            description: 'Large music events',
            icon: 'music',
            color: '#ff0000'
        }, { Authorization: `Bearer ${adminToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.category.name).toBe('Music Festival');
        testCategoryId = res.body.category.id;
    });

    it('should fetch all categories', async () => {
        const res = await client.csrfRequest('get', '/api/categories', undefined, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.categories)).toBe(true);
        expect(res.body.data.categories.length).toBeGreaterThan(0);
    });

    it('should fetch a specific category', async () => {
        const res = await client.csrfRequest('get', `/api/categories/${testCategoryId}`, undefined, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.category.name).toBe('Music Festival');
    });

    it('should allow admin to update a category', async () => {
        const res = await client.csrfRequest('put', `/api/categories/${testCategoryId}`, {
            name: 'Music Fest'
        }, { Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.category.name).toBe('Music Fest');
    });

    it('should fetch category stats for admin', async () => {
        const res = await client.csrfRequest('get', '/api/categories/stats/overview', undefined, { Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should allow admin to delete category', async () => {
        const res = await client.csrfRequest('delete', `/api/categories/${testCategoryId}`, undefined, { Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
    });
});
