const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let organizerToken;
let organizerUser;
let attendeeUser;
let eventId;
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
        await collections[key].deleteMany({});
    }
});

describe('Public Event Responses', () => {
    beforeEach(async () => {
        client = createTestClient(app);

        await client.csrfRequest('post', '/api/auth/register', {
            name: 'Organizer',
            email: 'public.organizer@example.com',
            password: 'UniqueTestPass!2026',
            role: 'organizer'
        });

        await User.updateOne({ email: 'public.organizer@example.com' }, { emailVerified: true, role: 'organizer' });

        const organizerLoginRes = await client.csrfRequest('post', '/api/auth/login', {
            email: 'public.organizer@example.com',
            password: 'UniqueTestPass!2026'
        });
        const organizerCookies = organizerLoginRes.headers['set-cookie'];
        const organizerAccessTokenCookie = organizerCookies.find(cookie => cookie.startsWith('accessToken='));
        organizerToken = organizerAccessTokenCookie.split(';')[0].split('=')[1];

        organizerUser = await User.findOne({ email: 'public.organizer@example.com' });

        attendeeUser = await User.create({
            name: 'Attendee',
            email: 'public.attendee@example.com',
            password: 'UniqueTestPass!2026',
            role: 'user',
            emailVerified: true
        });

        const eventRes = await client.csrfRequest('post', '/api/events', {
            title: 'Public SeatMap Event',
            description: 'Event used to test public seat map masking',
            date: new Date(Date.now() + 86400000).toISOString(),
            venue: {
                name: 'Venue Name',
                address: '123 Any St',
                city: 'Cairo',
                country: 'Egypt',
                capacity: 50
            },
            pricing: { type: 'free', amount: 0, currency: 'USD' },
            seating: { totalSeats: 2, availableSeats: 1 },
            category: 'conference',
            tags: ['public', 'masking']
        }, { Authorization: `Bearer ${organizerToken}` });

        eventId = eventRes.body.data.event._id;

        await Event.findByIdAndUpdate(eventId, {
            status: 'published',
            seating: {
                totalSeats: 2,
                availableSeats: 1,
                seatMap: [
                    { seatNumber: 'S001', isBooked: true, bookedBy: attendeeUser._id },
                    { seatNumber: 'S002', isBooked: false }
                ]
            }
        });
    });

    it('should not expose seatMap.bookedBy in public event details', async () => {
        const res = await request(app).get(`/api/public/events/${eventId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.event.seating.seatMap)).toBe(true);
        res.body.data.event.seating.seatMap.forEach((seat) => {
            expect(seat.bookedBy).toBeUndefined();
        });
    });

    it('should keep bookedBy in organizer-authenticated event endpoint', async () => {
        const res = await request(app)
            .get(`/api/events/${eventId}`)
            .set('Authorization', `Bearer ${organizerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.event.seating.seatMap[0].bookedBy).toBeDefined();
        expect(String(res.body.data.event.seating.seatMap[0].bookedBy)).toBe(String(attendeeUser._id));
    });
});
