const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let authToken;
let testEventId;
let client;

jest.setTimeout(30000);

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

describe('Event Lifecycle & Immutability', () => {
    beforeEach(async () => {
        client = createTestClient(app);
        await client.csrfRequest('post', '/api/auth/register', {
            name: 'Organizer User',
            email: 'org@example.com',
            password: 'UniqueTestPass!2026',
            role: 'organizer'
        });

        // Manually verify email for test
        await User.updateOne({ email: 'org@example.com' }, { emailVerified: true, role: 'organizer' });

        const loginRes = await client.csrfRequest('post', '/api/auth/login', {
            email: 'org@example.com',
            password: 'UniqueTestPass!2026'
        });

        // Get token from cookie
        const cookies = loginRes.headers['set-cookie'];
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        authToken = accessTokenCookie.split(';')[0].split('=')[1];

        // Create a test event
        const eventRes = await client.csrfRequest('post', '/api/events', {
            title: 'Lifecycle Test Event',
            description: 'Test event description',
            date: new Date(Date.now() + 86400000).toISOString(),
            venue: {
                name: 'Initial Venue',
                address: '123 Test St',
                city: 'Test City',
                country: 'USA',
                capacity: 100
            },
            pricing: { type: 'free', amount: 0 },
            seating: { totalSeats: 50, availableSeats: 50 },
            category: 'workshop'
        }, { Authorization: `Bearer ${authToken}` });

        testEventId = eventRes.body.data.event._id;

        // Publish the event
        await client.csrfRequest('post', `/api/events/${testEventId}/publish`, undefined, { Authorization: `Bearer ${authToken}` });
    });

    it('should allow updating critical fields if there are no bookings', async () => {
        const newDate = new Date(Date.now() + 172800000).toISOString();
        const res = await client.csrfRequest('put', `/api/events/${testEventId}`, { date: newDate }, { Authorization: `Bearer ${authToken}` });

        expect(res.statusCode).toBe(200);
        expect(new Date(res.body.data.event.date).toISOString()).toBe(newDate);
    });

    it('should block critical field updates if there are active bookings', async () => {
        // 1. Create a booking
        const initRes = await client.csrfRequest('post', '/api/booking/initiate', { eventId: testEventId, quantity: 1 }, { Authorization: `Bearer ${authToken}` });
        
        const bookingId = initRes.body.data.bookingSession._id;
        
        await client.csrfRequest('post', '/api/booking/confirm', {
            eventId: testEventId,
            bookingId,
            paymentId: 'free-tx',
            paymentMethod: 'free'
        }, { Authorization: `Bearer ${authToken}` });

        // 2. Try to update price (critical field)
        const res = await client.csrfRequest('put', `/api/events/${testEventId}`, {
            pricing: { type: 'paid', amount: 99.99 }
        }, { Authorization: `Bearer ${authToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('Cannot update critical event details');
    });

    it('should cancel event, void tickets, and notify attendees', async () => {
        // 1. Create a booking
        const initRes = await client.csrfRequest('post', '/api/booking/initiate', { eventId: testEventId, quantity: 1 }, { Authorization: `Bearer ${authToken}` });
        
        await client.csrfRequest('post', '/api/booking/confirm', {
            eventId: testEventId,
            bookingId: initRes.body.data.bookingSession._id,
            paymentId: 'free-tx',
            paymentMethod: 'free'
        }, { Authorization: `Bearer ${authToken}` });

        // 2. Cancel event
        const cancelRes = await client.csrfRequest('post', `/api/events/${testEventId}/cancel`, { reason: 'Weather conditions' }, { Authorization: `Bearer ${authToken}` });

        expect(cancelRes.statusCode).toBe(200);
        expect(cancelRes.body.success).toBe(true);

        // 3. Verify event status
        const event = await Event.findById(testEventId);
        expect(event.status).toBe('cancelled');

        // 4. Verify ticket status
        const ticket = await Ticket.findOne({ event: testEventId });
        expect(ticket.status).toBe('cancelled');

        // 5. Verify notification exists
        const notification = await Notification.findOne({ userId: ticket.user, type: 'system' });
        expect(notification).toBeDefined();
        expect(notification.message).toContain('Weather conditions');
    });
});
