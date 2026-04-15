const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Notification = require('../models/Notification');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let testUser;
let token;
let client;

beforeAll(async () => {
    client = createTestClient(app);
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    // Create a dummy user
    testUser = await User.create({
        name: 'Test Notif User',
        email: 'notif@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        isActive: true,
        emailVerified: true
    });

    const sessionId = crypto.randomUUID();
    testUser.addSession(sessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await testUser.save();
    token = generateAccessToken(testUser._id, sessionId);
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

afterEach(async () => {
    // Clear notifications collection between tests
    await Notification.deleteMany({});
});

describe('Notifications Endpoints', () => {

    it('should fetch empty notifications for new user', async () => {
        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notifications.length).toBe(0);
    });

    it('should fetch persisted database notifications', async () => {
        // Create a real DB notification
        await Notification.create({
            userId: testUser._id,
            title: 'Welcome!',
            message: 'Thanks for joining.',
            type: 'system',
            priority: 'high'
        });

        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notifications.length).toBe(1);
        expect(res.body.data.notifications[0].title).toBe('Welcome!');
        expect(res.body.data.notifications[0].read).toBe(false);
    });

    it('should mark a notification as read safely persist', async () => {
        const notif = await Notification.create({
            userId: testUser._id,
            title: 'Please Read Me',
            message: 'Info',
            type: 'system',
            read: false
        });

        const res = await client.csrfRequest('patch', `/api/notifications/${notif._id}/read`, undefined, {
            Authorization: `Bearer ${token}`,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify Database Mutation Document accurately
        const updated = await Notification.findById(notif._id);
        expect(updated.read).toBe(true);
    });

    it('should delete a notification', async () => {
        const notif = await Notification.create({
            userId: testUser._id,
            title: 'Delete Me',
            message: 'Trash this',
            type: 'system'
        });

        const res = await client.csrfRequest('delete', `/api/notifications/${notif._id}`, undefined, {
            Authorization: `Bearer ${token}`,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const check = await Notification.findById(notif._id);
        expect(check).toBeNull();
    });
});
