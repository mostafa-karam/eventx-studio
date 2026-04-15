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

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin Audit',
        email: 'admin_audit@example.com',
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
        email: 'user_audit@example.com',
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

describe('Audit Log Endpoints', () => {
    it('should allow admin to fetch audit logs', async () => {
        // Trigger some log action by fetching profile to ensure there are audit records or just test format
        await client.csrfRequest('get', '/api/auth/me', undefined, { Authorization: `Bearer ${adminToken}` });
        
        const res = await client.csrfRequest('get', '/api/audit-log', undefined, { Authorization: `Bearer ${adminToken}` });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.logs)).toBe(true);
    });

    it('should deny non-admin users from accessing audit logs', async () => {
        const res = await client.csrfRequest('get', '/api/audit-log', undefined, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(403);
    });

    it('should support pagination arguments', async () => {
        const res = await client.csrfRequest('get', '/api/audit-log?page=1&limit=5', undefined, { Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.pagination).toBeDefined();
    });
});
