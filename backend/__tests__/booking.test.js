const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
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

describe('Booking Endpoints', () => {
    beforeEach(async () => {
        client = createTestClient(app);
        // Register and verify email
        await client.csrfRequest('post', '/api/auth/register', {
            name: 'Test User',
            email: 'test@example.com',
            password: 'UniqueTestPass!2026',
            role: 'organizer'
        });

        // Manually verify email for test
        await User.updateOne({ email: 'test@example.com' }, { emailVerified: true, role: 'organizer' });

        const loginRes = await client.csrfRequest('post', '/api/auth/login', {
            email: 'test@example.com',
            password: 'UniqueTestPass!2026'
        });

        // Get token from cookie
        const cookies = loginRes.headers['set-cookie'];
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        authToken = accessTokenCookie.split(';')[0].split('=')[1];

        // Create a test event
        const eventRes = await client.csrfRequest('post', '/api/events', {
            title: 'Test Event',
            description: 'Test event description',
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            venue: {
                name: 'Test Venue',
                address: '123 Test St',
                city: 'Test City',
                country: 'USA',
                capacity: 100
            },
            pricing: {
                type: 'free',
                amount: 0,
                currency: 'USD'
            },
            seating: {
                totalSeats: 50,
                availableSeats: 50,
                seatMap: []
            },
            category: 'conference',
            tags: ['test']
        }, { Authorization: `Bearer ${authToken}` });

        testEventId = eventRes.body.data.event._id;

        // Publish the event
        await client.csrfRequest('post', `/api/events/${testEventId}/publish`, undefined, { Authorization: `Bearer ${authToken}` });
    });

    it('should initiate a booking session', async () => {
        const res = await client.csrfRequest('post', '/api/booking/initiate', {
            eventId: testEventId,
            quantity: 1
        }, { Authorization: `Bearer ${authToken}` });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bookingSession).toBeDefined();
    });

    it('should reject booking initiation with invalid eventId', async () => {
        const res = await client.csrfRequest('post', '/api/booking/initiate', {
            eventId: 'not-a-mongo-id'
        }, { Authorization: `Bearer ${authToken}` });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Validation failed');
    });

    it('should book a free ticket successfully', async () => {
        // First initiate
        const initRes = await client.csrfRequest('post', '/api/booking/initiate', {
            eventId: testEventId,
            quantity: 1
        }, { Authorization: `Bearer ${authToken}` });

        const bookingId = initRes.body.data.bookingSession._id;

        // Then confirm
        const confirmRes = await client.csrfRequest('post', '/api/booking/confirm', {
            eventId: testEventId,
            bookingId,
            paymentId: 'free-transaction',
            paymentMethod: 'free'
        }, { Authorization: `Bearer ${authToken}` });

        expect(confirmRes.statusCode).toBe(200);
        expect(confirmRes.body.success).toBe(true);
        expect(confirmRes.body.data.ticket).toBeDefined();
        expect(confirmRes.body.data.qrCodeImage).toBeDefined();
    });

    it('should retrieve my tickets', async () => {
        // Book a ticket first
        const initRes = await client.csrfRequest('post', '/api/booking/initiate', { eventId: testEventId, quantity: 1 }, { Authorization: `Bearer ${authToken}` });

        await client.csrfRequest('post', '/api/booking/confirm', {
            eventId: testEventId,
            bookingId: initRes.body.data.bookingSession._id,
            paymentId: 'free-transaction',
            paymentMethod: 'free'
        }, { Authorization: `Bearer ${authToken}` });

        // Retrieve tickets
        const getRes = await request(app)
            .get('/api/tickets/my-tickets')
            .set('Authorization', `Bearer ${authToken}`);

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.success).toBe(true);
        expect(Array.isArray(getRes.body.data.tickets)).toBe(true);
        expect(getRes.body.data.tickets.length).toBeGreaterThan(0);
    });

    it('should book multiple paid tickets with a verified payment token', async () => {
        // Create a paid event
        const paidEventRes = await client.csrfRequest('post', '/api/events', {
            title: 'Paid Test Event',
            description: 'Paid event description',
            date: new Date(Date.now() + 86400000).toISOString(),
            venue: {
                name: 'Paid Venue',
                address: '456 Paid St',
                city: 'Paid City',
                country: 'USA',
                capacity: 100
            },
            pricing: {
                type: 'paid',
                amount: 50,
                currency: 'USD'
            },
            seating: {
                totalSeats: 10,
                availableSeats: 10,
                seatMap: []
            },
            category: 'conference',
            tags: ['paid']
        }, { Authorization: `Bearer ${authToken}` });

        const paidEventId = paidEventRes.body.data.event._id;

        await client.csrfRequest('post', `/api/events/${paidEventId}/publish`, undefined, { Authorization: `Bearer ${authToken}` });

        const paymentRes = await client.csrfRequest('post', '/api/payments/process', {
            amount: 100,
            currency: 'USD',
            quantity: 2,
            paymentMethod: 'credit_card',
            eventId: paidEventId
        }, { Authorization: `Bearer ${authToken}` });

        expect(paymentRes.statusCode).toBe(200);
        expect(paymentRes.body.success).toBe(true);
        const { paymentId, token } = paymentRes.body.data;

        const bookRes = await client.csrfRequest('post', '/api/tickets/book-multi', {
            eventId: paidEventId,
            quantity: 2,
            paymentMethod: 'credit_card',
            transactionId: paymentId,
            paymentToken: token
        }, { Authorization: `Bearer ${authToken}` });

        expect(bookRes.statusCode).toBe(201);
        expect(bookRes.body.success).toBe(true);
        expect(Array.isArray(bookRes.body.data.tickets)).toBe(true);
        expect(bookRes.body.data.tickets).toHaveLength(2);
        bookRes.body.data.tickets.forEach(ticket => {
            expect(ticket.payment.amount).toBe(50);
            expect(ticket.payment.currency).toBe('USD');
            expect(ticket.payment.transactionId).toBe(paymentId);
            expect(ticket.user._id).toBeDefined();
        });
    });

    it('should issue simulated payment test token outside production', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        try {
            const res = await client.csrfRequest('post', '/api/payments/test-token', {
                eventId: testEventId
            }, { Authorization: `Bearer ${authToken}` });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.transactionId).toBeDefined();
        } finally {
            process.env.NODE_ENV = originalNodeEnv;
        }
    });

});
