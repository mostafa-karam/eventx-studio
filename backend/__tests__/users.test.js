const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let adminToken;
let userToken;
let admin;
let user;
let client;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin User',
        email: 'admin_users@example.com',
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
        name: 'Standard User',
        email: 'user_users@example.com',
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

describe('User Management Endpoints', () => {

    it('should allow user to fetch their own profile', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('user_users@example.com');
    });

    it('should allow user to update their profile', async () => {
        const res = await client.csrfRequest('put', '/api/auth/profile', {
            name: 'Updated Name',
            interests: ['coding', 'music']
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe('Updated Name');
        expect(updatedUser.interests).toContain('coding');
    });

    it('should allow user to request a role upgrade', async () => {
        const res = await client.csrfRequest('post', '/api/auth/role-upgrade', {
            reason: 'I want to organize tech meetups',
            organizationName: 'Techies Collective'
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.roleUpgradeRequest.status).toBe('pending');
        expect(updatedUser.roleUpgradeRequest.organizationName).toBe('Techies Collective');
    });

    it('should allow admin to view role upgrade requests', async () => {
        const res = await request(app)
            .get('/api/auth/role-upgrade-requests')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.requests.some(req => req._id.toString() === user._id.toString())).toBe(true);
    });

    it('should allow admin to approve a role upgrade', async () => {
        const res = await client.csrfRequest('put', `/api/auth/role-upgrade-requests/${user._id}`, {
            action: 'approve'
        }, { Authorization: `Bearer ${adminToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.role).toBe('organizer');
        expect(updatedUser.roleUpgradeRequest.status).toBe('approved');
    });

    it('should prevent non-admin from approving role upgrades', async () => {
        // Create another user to test against
        const victim = await User.create({
            name: 'Victim',
            email: 'victim@example.com',
            password: 'UniqueTestPass!2026',
            isActive: true
        });

        const res = await client.csrfRequest('put', `/api/auth/role-upgrade-requests/${victim._id}`, {
            action: 'approve'
        }, { Authorization: `Bearer ${userToken}` }); // using 'organizer' token (user was upgraded in prev test)

        expect(res.statusCode).toBe(403);
    });
});
