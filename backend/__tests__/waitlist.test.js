const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Waitlist = require('../models/Waitlist');
const jwt = require('jsonwebtoken');

let mongoServer;
let userToken;
let organizerToken;
let user;
let organizer;
let fullEvent;
let availableEvent;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    user = await User.create({
        name: 'Waitlist User',
        email: 'waitlist_user@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        isActive: true
    });
    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test_secret_for_ci', { expiresIn: '1h' });

    organizer = await User.create({
        name: 'Organizer',
        email: 'org_waitlist@example.com',
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        isActive: true
    });
    organizerToken = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET || 'test_secret_for_ci', { expiresIn: '1h' });

    fullEvent = await Event.create({
        title: 'Full Event',
        description: 'Waitlist test event specifically for full capacity tracking.',
        category: 'conference',
        date: new Date(Date.now() + 86400000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 1 },
        organizer: organizer._id,
        seating: { totalSeats: 1, availableSeats: 0 },
        pricing: { type: 'free' },
        status: 'published'
    });

    availableEvent = await Event.create({
        title: 'Available Event',
        description: 'Test event with availability to verify waitlist rejection logic.',
        category: 'concert',
        date: new Date(Date.now() + 86400000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 10 },
        organizer: organizer._id,
        seating: { totalSeats: 10, availableSeats: 10 },
        pricing: { type: 'free' },
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
    await Waitlist.deleteMany({});
});

describe('Waitlist Endpoints', () => {

    it('should allow user to join waitlist for a full event', async () => {
        const res = await request(app)
            .post(`/api/events/${fullEvent._id}/waitlist`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.waitlist.status).toBe('pending');

        const waitlistEntry = await Waitlist.findOne({ user: user._id, event: fullEvent._id });
        expect(waitlistEntry).toBeDefined();
    });

    it('should prevent joining waitlist for an event with available seats', async () => {
        const res = await request(app)
            .post(`/api/events/${availableEvent._id}/waitlist`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should prevent duplicate pending waitlist entries', async () => {
        await Waitlist.create({
            user: user._id,
            event: fullEvent._id,
            status: 'pending'
        });

        const res = await request(app)
            .post(`/api/events/${fullEvent._id}/waitlist`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already|waitlist/i);
    });

    it('should allow user to see their own waitlist entries', async () => {
       await Waitlist.create({
            user: user._id,
            event: fullEvent._id,
            status: 'pending'
        });

        const res = await request(app)
            .get('/api/events/waitlists/my')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.waitlists.length).toBe(1);
    });

    it('should allow organizer to view waitlist for their event', async () => {
        await Waitlist.create({
            user: user._id,
            event: fullEvent._id,
            status: 'pending'
        });

        const res = await request(app)
            .get(`/api/events/${fullEvent._id}/waitlist`)
            .set('Authorization', `Bearer ${organizerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.waitlist.length).toBe(1);
    });
});
