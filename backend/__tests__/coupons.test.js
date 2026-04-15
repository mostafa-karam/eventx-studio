const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Event = require('../models/Event');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let adminToken;
let userToken;
let admin;
let user;
let testEvent;
let client;

beforeAll(async () => {
    client = createTestClient(app);
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin',
        email: 'admin_coupons@example.com',
        password: 'UniqueTestPass!2026',
        role: 'admin',
        isActive: true,
        emailVerified: true
    });
    const adminSessionId = crypto.randomUUID();
    admin.addSession(adminSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await admin.save();
    adminToken = generateAccessToken(admin._id, adminSessionId);

    user = await User.create({
        name: 'User',
        email: 'user_coupons@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        isActive: true,
        emailVerified: true
    });
    const userSessionId = crypto.randomUUID();
    user.addSession(userSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await user.save();
    userToken = generateAccessToken(user._id, userSessionId);

    testEvent = await Event.create({
        title: 'Coupon Event',
        description: 'Test event for coupon logic validation and application.',
        category: 'conference',
        date: new Date(Date.now() + 86400000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 100 },
        organizer: admin._id,
        seating: { totalSeats: 100, availableSeats: 100 },
        pricing: { type: 'paid', amount: 100, currency: 'USD' },
        status: 'published'
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

afterEach(async () => {
    await Coupon.deleteMany({});
});

describe('Coupon Endpoints', () => {

    it('should allow admin to create a coupon', async () => {
        const res = await client.csrfRequest('post', '/api/coupons', {
            code: 'SAVE10',
            discountType: 'percentage',
            discountValue: 10,
            maxUses: 100,
            createdBy: admin._id
        }, { Authorization: `Bearer ${adminToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.coupon.code).toBe('SAVE10');
    });

    it('should validate a valid coupon', async () => {
        await Coupon.create({
            code: 'VALID20',
            discountType: 'percentage',
            discountValue: 20,
            createdBy: admin._id,
            isActive: true
        });

        const res = await client.csrfRequest('post', '/api/coupons/validate', {
            code: 'VALID20',
            eventId: testEvent._id
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.discountValue).toBe(20);
    });

    it('should reject an expired coupon', async () => {
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        await Coupon.create({
            code: 'EXPIRED',
            discountType: 'fixed',
            discountValue: 5,
            expiresAt: pastDate,
            createdBy: admin._id,
            isActive: true
        });

        const res = await client.csrfRequest('post', '/api/coupons/validate', {
            code: 'EXPIRED',
            eventId: testEvent._id
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/expired|invalid/i);
    });

    it('should reject a used-up coupon', async () => {
        await Coupon.create({
            code: 'MAXED',
            discountType: 'percentage',
            discountValue: 50,
            maxUses: 5,
            usedCount: 5,
            createdBy: admin._id,
            isActive: true
        });

        const res = await client.csrfRequest('post', '/api/coupons/validate', {
            code: 'MAXED',
            eventId: testEvent._id
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/limit|invalid/i);
    });

    it('should reject a coupon not applicable to the event', async () => {
        const otherEvent = await Event.create({
            title: 'Other Event',
            description: 'Alternative event for cross-event coupon testing.',
            category: 'concert',
            date: new Date(Date.now() + 172800000),
            venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
            organizer: admin._id,
            seating: { totalSeats: 10, availableSeats: 10 },
            status: 'published'
        });

        await Coupon.create({
            code: 'SPECIFIC',
            discountType: 'percentage',
            discountValue: 30,
            applicableEvents: [otherEvent._id],
            createdBy: admin._id,
            isActive: true
        });

        const res = await client.csrfRequest('post', '/api/coupons/validate', {
            code: 'SPECIFIC',
            eventId: testEvent._id
        }, { Authorization: `Bearer ${userToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/applicable|invalid|valid/i);
    });
});
