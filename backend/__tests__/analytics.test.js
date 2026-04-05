const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const jwt = require('jsonwebtoken');

let mongoServer;
let adminToken;
let organizerToken;
let organizer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    const admin = await User.create({
        name: 'Admin',
        email: 'admin_analytics@example.com',
        password: 'Password123!',
        role: 'admin',
        isActive: true
    });
    adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'test_secret_for_ci', { expiresIn: '1h' });

    const user = await User.create({
        name: 'User',
        email: 'user_analytics@example.com',
        password: 'Password123!',
        role: 'user',
        isActive: true
    });

    const organizerUser = await User.create({
        name: 'Organizer',
        email: 'org_analytics@example.com',
        password: 'Password123!',
        role: 'organizer',
        isActive: true
    });
    organizer = organizerUser;
    organizerToken = jwt.sign({ id: organizer._id }, process.env.JWT_SECRET || 'test_secret_for_ci', { expiresIn: '1h' });

    // Seed some metrics
    const event = await Event.create({
        title: 'Analytics Event',
        description: 'Test event description specifically for analytics testing.',
        category: 'conference',
        date: new Date(Date.now() + 86400000),
        venue: { name: 'V', address: 'A', city: 'C', country: 'UAE', capacity: 100 },
        organizer: organizer._id,
        seating: { totalSeats: 100, availableSeats: 98 },
        pricing: { type: 'paid', amount: 50, currency: 'USD' },
        status: 'published',
        analytics: {
            views: 15,
            bookings: 2,
            revenue: 100
        }
    });

    await Ticket.create({
        event: event._id,
        user: admin._id,
        seatNumber: 'S001',
        status: 'booked',
        payment: { status: 'completed', amount: 50, currency: 'USD' }
    });

    await Ticket.create({
        event: event._id,
        user: admin._id,
        seatNumber: 'S002',
        status: 'booked',
        payment: { status: 'completed', amount: 50, currency: 'USD' }
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('Analytics Endpoints', () => {
    
    it('should return 401 for unauthorized dashboard access', async () => {
        const res = await request(app).get('/api/analytics/dashboard');
        expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin dashboard access', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${organizerToken}`);
        expect(res.statusCode).toBe(403);
    });

    it('should allow admin to fetch global dashboard metrics', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.overview).toBeDefined();
        // Check for specific overview metrics
        expect(res.body.data.overview.totalUsers).toBeGreaterThanOrEqual(1);
    });

    it('should prevent non-admin from fetching global dashboard metrics', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${organizerToken}`);
            
        expect(res.statusCode).toBe(403);
    });

    it('should allow organizer to fetch singular event metrics', async () => {
        // Fetch event created in beforeAll
        const event = await Event.findOne({ title: 'Analytics Event' });
        
        const res = await request(app)
            .get(`/api/analytics/events/${event._id}`)
            .set('Authorization', `Bearer ${organizerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.event).toBeDefined();
        expect(res.body.data.event.analytics.views).toBe(15);
    });

    it('should prevent fetching singular event metrics for non-owned event', async () => {
        const otherOrg = await User.create({
            name: 'Other Org',
            email: 'other@example.com',
            password: 'Password123!',
            role: 'organizer',
            isActive: true
        });
        const otherOrgToken = jwt.sign({ id: otherOrg._id }, process.env.JWT_SECRET || 'test_secret_for_ci', { expiresIn: '1h' });

        const event = await Event.findOne({ title: 'Analytics Event' });

        const res = await request(app)
            .get(`/api/analytics/events/${event._id}`)
            .set('Authorization', `Bearer ${otherOrgToken}`);

        expect(res.statusCode).toBe(404); // Not authorized to view this event's analytics (combined 404 in controller)
    });
});
