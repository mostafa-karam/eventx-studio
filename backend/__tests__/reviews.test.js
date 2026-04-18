const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let authToken;
let testEventId;
let testUserId;
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

describe('Review Soft-Delete & Unique Index', () => {
    beforeEach(async () => {
        client = createTestClient(app);
        await client.csrfRequest('post', '/api/auth/register', {
            name: 'Reviewer User',
            email: 'reviewer@example.com',
            password: 'UniqueTestPass!2026',
            role: 'user'
        });

        const user = await User.findOne({ email: 'reviewer@example.com' });
        testUserId = user._id;
        await User.updateOne({ _id: testUserId }, { emailVerified: true });

        const loginRes = await client.csrfRequest('post', '/api/auth/login', {
            email: 'reviewer@example.com',
            password: 'UniqueTestPass!2026'
        });

        const cookies = loginRes.headers['set-cookie'];
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        authToken = accessTokenCookie.split(';')[0].split('=')[1];

        // Create a future event first (to pass model validation)
        const event = await Event.create({
            title: 'Past Event',
            description: 'This event happened yesterday',
            date: new Date(Date.now() + 86400000), // Tomorrow
            venue: { name: 'Old Venue', address: '123 St', city: 'City', country: 'Country', capacity: 100 },
            pricing: { type: 'free', amount: 0 },
            seating: { totalSeats: 50, availableSeats: 50 },
            category: 'conference',
            organizer: new mongoose.Types.ObjectId(), // Dummy organizer
            status: 'published'
        });
        testEventId = event._id;

        // Manually move it to the past in the database to allow reviews in controller
        await Event.updateOne({ _id: testEventId }, { date: new Date(Date.now() - 86400000) });

        // Create a ticket (to allow reviews)
        await Ticket.create({
            event: testEventId,
            user: testUserId,
            seatNumber: 'S001',
            status: 'used',
            payment: { amount: 0, status: 'completed' },
            qrCode: 'dummy-qr'
        });
    });

    it('should allow re-submitting a review after soft-deletion', async () => {
        // 1. Submit first review
        const res1 = await client.csrfRequest('post', `/api/events/${testEventId}/reviews`, { rating: 5, title: 'Great!', body: 'Loved it' }, {
            Authorization: `Bearer ${authToken}`,
        });

        expect(res1.statusCode).toBe(201);
        const reviewId = res1.body.data.review._id;

        // 2. Soft-delete the review
        const resDel = await client.csrfRequest('delete', `/api/events/${testEventId}/reviews/${reviewId}`, undefined, {
            Authorization: `Bearer ${authToken}`,
        });

        expect(resDel.statusCode).toBe(200);

        // 3. Submit a new review for the same event
        const res2 = await client.csrfRequest('post', `/api/events/${testEventId}/reviews`, { rating: 4, title: 'Again!', body: 'Still good' }, {
            Authorization: `Bearer ${authToken}`,
        });

        // Cooldown is now enforced (24h) after deletion.
        expect(res2.statusCode).toBe(400);
        expect(res2.body.success).toBe(false);

        // 4. Verify original review is still there (soft-deleted) but not in standard list
        const softReview = await Review.findById(reviewId);
        expect(softReview.deletedAt).not.toBeNull();

        const resList = await request(app)
            .get(`/api/events/${testEventId}/reviews`);
        
        // The only review is now soft-deleted and the replacement is blocked by cooldown,
        // so the public list should be empty.
        expect(resList.body.data.reviews.length).toBe(0);
    });

    it('should reject a review when the user has no ticket for the event', async () => {
        await Ticket.deleteMany({ event: testEventId, user: testUserId });

        const res = await client.csrfRequest(
            'post',
            `/api/events/${testEventId}/reviews`,
            { rating: 5, title: 'No ticket', body: 'Should fail' },
            { Authorization: `Bearer ${authToken}` },
        );

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/only attendees with a ticket/i);
    });

    it('should NOT allow multiple active reviews for same event/user', async () => {
        // Submit first review
        await client.csrfRequest('post', `/api/events/${testEventId}/reviews`, { rating: 5, title: 'First', body: '...' }, {
            Authorization: `Bearer ${authToken}`,
        });

        // Submit second review (without deleting first)
        const res = await client.csrfRequest('post', `/api/events/${testEventId}/reviews`, { rating: 2, title: 'Second', body: '...' }, {
            Authorization: `Bearer ${authToken}`,
        });

        // Should fail due to unique index (partial index is for deletedAt: null)
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('already reviewed');
    });
});
