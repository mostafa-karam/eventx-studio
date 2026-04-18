const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

jest.setTimeout(30000);

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

    it('should enforce profile validators on /api/users/profile/me (no bypass)', async () => {
        const tooLongName = 'a'.repeat(51);
        const res = await client.csrfRequest('put', '/api/users/profile/me', {
            name: tooLongName
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Validation failed');
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

    it('should reject admin approving role upgrade when user has no pending request', async () => {
        const noRequest = await User.create({
            name: 'No Request',
            email: `no_req_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true,
        });

        const res = await client.csrfRequest(
            'put',
            `/api/auth/role-upgrade-requests/${noRequest._id}`,
            { action: 'approve' },
            { Authorization: `Bearer ${adminToken}` },
        );

        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);

        const still = await User.findById(noRequest._id);
        expect(still.role).toBe('user');
    });

    it('should reject duplicate approve of the same role upgrade request', async () => {
        const candidate = await User.create({
            name: 'Dup Approve',
            email: `dup_app_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true,
        });
        const candSid = crypto.randomUUID();
        candidate.addSession(candSid, { device: 'Jest', ipAddress: '127.0.0.1' });
        await candidate.save();
        const candToken = generateAccessToken(candidate._id, candSid);

        await client.csrfRequest(
            'post',
            '/api/auth/role-upgrade',
            { reason: 'Need organizer', organizationName: 'Org' },
            { Authorization: `Bearer ${candToken}` },
        );

        const first = await client.csrfRequest(
            'put',
            `/api/auth/role-upgrade-requests/${candidate._id}`,
            { action: 'approve' },
            { Authorization: `Bearer ${adminToken}` },
        );
        expect(first.statusCode).toBe(200);

        const second = await client.csrfRequest(
            'put',
            `/api/auth/role-upgrade-requests/${candidate._id}`,
            { action: 'approve' },
            { Authorization: `Bearer ${adminToken}` },
        );
        expect(second.statusCode).toBe(409);
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

    it('should write a user.delete audit log when admin deletes a user', async () => {
        const victim = await User.create({
            name: 'Delete Target',
            email: `delete_target_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true
        });

        const res = await client.csrfRequest(
            'delete',
            `/api/users/${victim._id}`,
            undefined,
            { Authorization: `Bearer ${adminToken}` }
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const audit = await AuditLog.findOne({ action: 'user.delete', resource: 'User' }).sort({ timestamp: -1 });
        expect(audit).toBeTruthy();
        expect(String(audit.resourceId)).toBe(String(victim._id));
    });
});
