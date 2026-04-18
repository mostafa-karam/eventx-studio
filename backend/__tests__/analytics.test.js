const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');

let mongoServer;
let adminToken;
let organizerToken;
let organizer;
let eventId;

jest.setTimeout(30000);

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
        password: 'UniqueTestPass!2026',
        role: 'admin',
        isActive: true,
        emailVerified: true
    });
    const adminSessionId = crypto.randomUUID();
    admin.addSession(adminSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await admin.save();
    adminToken = generateAccessToken(admin._id, adminSessionId);

    const user = await User.create({
        name: 'User',
        email: 'user_analytics@example.com',
        password: 'UniqueTestPass!2026',
        role: 'user',
        isActive: true,
        emailVerified: true
    });

    const organizerUser = await User.create({
        name: 'Organizer',
        email: 'org_analytics@example.com',
        password: 'UniqueTestPass!2026',
        role: 'organizer',
        isActive: true,
        emailVerified: true
    });
    organizer = organizerUser;
    const organizerSessionId = crypto.randomUUID();
    organizer.addSession(organizerSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await organizer.save();
    organizerToken = generateAccessToken(organizer._id, organizerSessionId);

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
    eventId = event._id;

    await Ticket.create({
        event: event._id,
        user: admin._id,
        seatNumber: 'S001',
        status: 'booked',
        payment: { status: 'completed', amount: 50, currency: 'USD' }
    });

    await Ticket.create({
        event: event._id,
        user: user._id,
        seatNumber: 'S002',
        status: 'used',
        checkIn: { isCheckedIn: true, checkInTime: new Date(), checkInBy: admin._id },
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

    it('should include events with zero tickets in allEvents (admin dashboard)', async () => {
        const noTicketEvent = await Event.create({
            title: 'Zero Bookings Event',
            description: 'Newly created; no tickets yet.',
            category: 'conference',
            date: new Date(Date.now() + 86400000 * 2),
            venue: { name: 'Hall X', address: '1 St', city: 'C', country: 'UAE', capacity: 50 },
            organizer: organizer._id,
            seating: { totalSeats: 50, availableSeats: 50, seatMap: [] },
            pricing: { type: 'free', amount: 0, currency: 'USD' },
            status: 'published',
            analytics: { views: 0, bookings: 0, revenue: 0 },
        });

        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        const allEvents = res.body.data.allEvents || [];
        const row = allEvents.find((e) => String(e._id) === String(noTicketEvent._id));
        expect(row).toBeDefined();
        expect(row.analytics.ticketsSold).toBe(0);
        expect(row.analytics.totalRevenue).toBe(0);
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

    it('should return correct attendanceRate and deduped uniqueAttendees in attendee insights', async () => {
        const attendeeRes = await request(app)
            .get(`/api/analytics/attendee-insights?eventId=${eventId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(attendeeRes.statusCode).toBe(200);
        expect(attendeeRes.body.success).toBe(true);
        // 2 tickets total, 1 checked in (used)
        expect(attendeeRes.body.data.trends.attendanceRate).toBe(50);

        const allRes = await request(app)
            .get('/api/analytics/all-attendee-insights')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(allRes.statusCode).toBe(200);
        expect(allRes.body.success).toBe(true);
        // Tickets belong to two different users => unique should be 2
        expect(allRes.body.data.overview.uniqueAttendees).toBe(2);
    });

    it('should scope growth to the requested eventId (event analytics)', async () => {
        const now = Date.now();
        const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000);
        const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);

        const growthEvent = await Event.create({
            title: 'Growth Scoped Event',
            description: 'Growth event',
            category: 'conference',
            date: new Date(Date.now() + 86400000),
            venue: { name: 'VG', address: 'AG', city: 'CG', country: 'UAE', capacity: 100 },
            organizer: organizer._id,
            seating: { totalSeats: 100, availableSeats: 99 },
            pricing: { type: 'paid', amount: 50, currency: 'USD' },
            status: 'published',
            analytics: { views: 0, bookings: 0, revenue: 0 }
        });

        // Another event with extra tickets in current period that must NOT affect growthEvent growth.
        const otherEvent = await Event.create({
            title: 'Other Analytics Event',
            description: 'Other event',
            category: 'conference',
            date: new Date(Date.now() + 86400000),
            venue: { name: 'V2', address: 'A2', city: 'C2', country: 'UAE', capacity: 100 },
            organizer: organizer._id,
            seating: { totalSeats: 100, availableSeats: 99 },
            pricing: { type: 'paid', amount: 50, currency: 'USD' },
            status: 'published',
            analytics: { views: 0, bookings: 0, revenue: 0 }
        });

        const growthUserCurrent = await User.create({
            name: 'Growth Attendee Current',
            email: `growth_current_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true
        });
        const growthUserPrevious = await User.create({
            name: 'Growth Attendee Previous',
            email: `growth_previous_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true
        });

        await Ticket.create({
            event: growthEvent._id,
            user: growthUserCurrent._id,
            seatNumber: 'S010',
            status: 'booked',
            bookingDate: twentyDaysAgo,
            payment: { status: 'completed', amount: 50, currency: 'USD' }
        });

        await Ticket.create({
            event: growthEvent._id,
            user: growthUserPrevious._id,
            seatNumber: 'S011',
            status: 'booked',
            bookingDate: fortyDaysAgo,
            payment: { status: 'completed', amount: 50, currency: 'USD' }
        });

        // These tickets are for the other event and should not change growth for eventId.
        const otherUser1 = await User.create({
            name: 'Other Event Attendee 1',
            email: `other1_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true
        });
        const otherUser2 = await User.create({
            name: 'Other Event Attendee 2',
            email: `other2_${Date.now()}@example.com`,
            password: 'UniqueTestPass!2026',
            role: 'user',
            isActive: true,
            emailVerified: true
        });

        await Ticket.create({
            event: otherEvent._id,
            user: otherUser1._id,
            seatNumber: 'S020',
            status: 'booked',
            bookingDate: twentyDaysAgo,
            payment: { status: 'completed', amount: 50, currency: 'USD' }
        });

        await Ticket.create({
            event: otherEvent._id,
            user: otherUser2._id,
            seatNumber: 'S021',
            status: 'booked',
            bookingDate: twentyDaysAgo,
            payment: { status: 'completed', amount: 50, currency: 'USD' }
        });

        const res = await request(app)
            .get(`/api/analytics/events/${growthEvent._id}`)
            .set('Authorization', `Bearer ${organizerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        // For eventId: current=1, previous=1 => growth 0
        expect(res.body.data.growth).toBe(0);
    });

    it('should prevent fetching singular event metrics for non-owned event', async () => {
        const otherOrg = await User.create({
            name: 'Other Org',
            email: 'other@example.com',
            password: 'UniqueTestPass!2026',
            role: 'organizer',
            isActive: true,
            emailVerified: true
        });
        const otherSessionId = crypto.randomUUID();
        otherOrg.addSession(otherSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
        await otherOrg.save();
        const otherOrgToken = generateAccessToken(otherOrg._id, otherSessionId);

        const event = await Event.findOne({ title: 'Analytics Event' });

        const res = await request(app)
            .get(`/api/analytics/events/${event._id}`)
            .set('Authorization', `Bearer ${otherOrgToken}`);

        expect(res.statusCode).toBe(404); // Not authorized to view this event's analytics (combined 404 in controller)
    });
});
