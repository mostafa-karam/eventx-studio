const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;
let authToken;
let testEventId;

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
        // Register and verify email
        await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123!',
                role: 'organizer'
            });

        // Manually verify email for test
        await User.updateOne({ email: 'test@example.com' }, { emailVerified: true, role: 'organizer' });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'Password123!'
            });

        // Get token from cookie
        const cookies = loginRes.headers['set-cookie'];
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        authToken = accessTokenCookie.split(';')[0].split('=')[1];

        // Create a test event
        const eventRes = await request(app)
            .post('/api/events')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
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
            });

        testEventId = eventRes.body.data.event._id;

        // Publish the event
        await request(app)
            .post(`/api/events/${testEventId}/publish`)
            .set('Authorization', `Bearer ${authToken}`);
    });

    it('should initiate a booking session', async () => {
        const res = await request(app)
            .post('/api/booking/initiate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                eventId: testEventId,
                quantity: 1
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bookingSession).toBeDefined();
    });

    it('should book a free ticket successfully', async () => {
        // First initiate
        const initRes = await request(app)
            .post('/api/booking/initiate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                eventId: testEventId,
                quantity: 1
            });

        const bookingId = initRes.body.data.bookingSession._id;

        // Then confirm
        const confirmRes = await request(app)
            .post('/api/booking/confirm')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                eventId: testEventId,
                bookingId,
                paymentId: 'free-transaction',
                paymentMethod: 'free'
            });

        expect(confirmRes.statusCode).toBe(200);
        expect(confirmRes.body.success).toBe(true);
        expect(confirmRes.body.data.ticket).toBeDefined();
        expect(confirmRes.body.data.qrCodeImage).toBeDefined();
    });
});