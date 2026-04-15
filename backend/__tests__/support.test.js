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
let testTicketId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin Supporter',
        email: 'admin_support@example.com',
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
        email: 'user_support@example.com',
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

describe('Support System Endpoints', () => {
    it('should allow user to create a support ticket', async () => {
        const res = await client.csrfRequest('post', '/api/support/tickets', {
            subject: 'Billing Issue',
            description: 'I was charged twice.',
            priority: 'medium',
            category: 'billing'
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.ticket.subject).toBe('Billing Issue');
        testTicketId = res.body.data.ticket.id;
    });

    it('should allow user to view their tickets', async () => {
        const res = await client.csrfRequest('get', '/api/support/tickets', undefined, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.tickets.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow user to get a specific ticket by ID', async () => {
        const res = await client.csrfRequest('get', `/api/support/tickets/${testTicketId}`, undefined, { Authorization: `Bearer ${userToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.ticket.subject).toBe('Billing Issue');
    });

    it('should allow admin to update ticket status', async () => {
        const res = await client.csrfRequest('patch', `/api/support/tickets/${testTicketId}/status`, {
            status: 'in-progress'
        }, { Authorization: `Bearer ${adminToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        // Wait, updateTicketStatus returns message, it doesn't return the ticket!
        // Let's just check success
    });

    it('should prevent standard user from updating status', async () => {
        const res = await client.csrfRequest('patch', `/api/support/tickets/${testTicketId}/status`, {
            status: 'resolved'
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(403);
    });

    it('should allow user to add a response to the ticket', async () => {
        const res = await client.csrfRequest('post', `/api/support/tickets/${testTicketId}/responses`, {
            message: 'Any updates?',
            attachments: []
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
