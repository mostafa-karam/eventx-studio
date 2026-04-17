const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');
const app = require('../server');
const User = require('../models/User');
const HallBooking = require('../models/HallBooking');
const Hall = require('../models/Hall');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let ownerVenueAdminToken;
let otherVenueAdminToken;
let adminToken;
let organizerToken;
let ownerVenueAdminId;
let otherVenueAdminId;
let hallId;
let organizerUserId;
let ownerClient;
let otherClient;
let adminClient;
let organizerClient;

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

describe('Hall Bookings Maintenance Authorization', () => {
    jest.setTimeout(30000);

    beforeEach(async () => {
        ownerClient = createTestClient(app);
        otherClient = createTestClient(app);
        adminClient = createTestClient(app);
        organizerClient = createTestClient(app);

        const ownerUser = await User.create({
            name: 'Owner Venue Admin',
            email: 'owner.venue.admin@example.com',
            password: 'UniqueTestPass!2026',
            role: 'venue_admin',
            emailVerified: true
        });
        const ownerSessionId = crypto.randomUUID();
        ownerUser.addSession(ownerSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
        await ownerUser.save();
        ownerVenueAdminId = ownerUser._id;
        ownerVenueAdminToken = generateAccessToken(ownerUser._id, ownerSessionId);

        const otherUser = await User.create({
            name: 'Other Venue Admin',
            email: 'other.venue.admin@example.com',
            password: 'UniqueTestPass!2026',
            role: 'venue_admin',
            emailVerified: true
        });
        const otherSessionId = crypto.randomUUID();
        otherUser.addSession(otherSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
        await otherUser.save();
        otherVenueAdminId = otherUser._id;
        otherVenueAdminToken = generateAccessToken(otherUser._id, otherSessionId);

        const adminUser = await User.create({
            name: 'Admin User',
            email: 'global.admin@example.com',
            password: 'UniqueTestPass!2026',
            role: 'admin',
            emailVerified: true
        });
        const adminSessionId = crypto.randomUUID();
        adminUser.addSession(adminSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
        await adminUser.save();
        adminToken = generateAccessToken(adminUser._id, adminSessionId);

        const organizerUser = await User.create({
            name: 'Event Organizer',
            email: 'event.organizer@example.com',
            password: 'UniqueTestPass!2026',
            role: 'organizer',
            emailVerified: true
        });
        organizerUserId = organizerUser._id;
        const organizerSessionId = crypto.randomUUID();
        organizerUser.addSession(organizerSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
        await organizerUser.save();
        organizerToken = generateAccessToken(organizerUser._id, organizerSessionId);

        const createHallRes = await ownerClient.csrfRequest('post', '/api/halls', {
            name: 'Owner Hall',
            capacity: 200,
            hourlyRate: 120
        }, { Authorization: `Bearer ${ownerVenueAdminToken}` });

        hallId = createHallRes.body.data.hall._id;
    });

    const createPendingBooking = async () => {
        const start = new Date(Date.now() + (72 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));
        const bookingRes = await organizerClient.csrfRequest('post', '/api/hall-bookings', {
            hall: hallId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            notes: 'Organizer booking'
        }, { Authorization: `Bearer ${organizerToken}` });

        expect(bookingRes.statusCode).toBe(201);
        return bookingRes.body.data.booking._id;
    };

    it('blocks venue_admin from scheduling maintenance on unowned hall', async () => {
        const start = new Date(Date.now() + (24 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));

        const res = await otherClient.csrfRequest('post', '/api/hall-bookings/maintenance', {
            hall: hallId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            notes: 'Unauthorized maintenance attempt'
        }, { Authorization: `Bearer ${otherVenueAdminToken}` });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Not authorized to manage bookings for this hall');
    });

    it('allows hall owner venue_admin to schedule maintenance', async () => {
        const start = new Date(Date.now() + (24 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));

        const res = await ownerClient.csrfRequest('post', '/api/hall-bookings/maintenance', {
            hall: hallId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            notes: 'Owner maintenance window'
        }, { Authorization: `Bearer ${ownerVenueAdminToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.maintenance.status).toBe('maintenance');
    });

    it('allows admin to schedule maintenance on any hall', async () => {
        const start = new Date(Date.now() + (48 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));

        const res = await adminClient.csrfRequest('post', '/api/hall-bookings/maintenance', {
            hall: hallId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            notes: 'Admin maintenance window'
        }, { Authorization: `Bearer ${adminToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.maintenance.status).toBe('maintenance');
    });

    it('allows hall owner venue_admin to cancel organizer booking on owned hall', async () => {
        const bookingId = await createPendingBooking();

        const res = await ownerClient.csrfRequest(
            'delete',
            `/api/hall-bookings/${bookingId}`,
            undefined,
            { Authorization: `Bearer ${ownerVenueAdminToken}` }
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const booking = await HallBooking.findById(bookingId);
        expect(booking.status).toBe('cancelled');
    });

    it('allows admin to cancel organizer booking', async () => {
        const bookingId = await createPendingBooking();

        const res = await adminClient.csrfRequest(
            'delete',
            `/api/hall-bookings/${bookingId}`,
            undefined,
            { Authorization: `Bearer ${adminToken}` }
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('scopes statusCounts to venue_admin owned halls', async () => {
        const otherHall = await Hall.create({
            name: 'Other Admin Hall',
            capacity: 150,
            hourlyRate: 95,
            createdBy: otherVenueAdminId,
        });

        const start = new Date(Date.now() + (96 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));

        await HallBooking.create({
            hall: hallId,
            organizer: organizerUserId,
            startDate: start,
            endDate: end,
            status: 'pending',
            totalCost: 100,
        });

        await HallBooking.create({
            hall: otherHall._id,
            organizer: organizerUserId,
            startDate: new Date(start.getTime() + (4 * 60 * 60 * 1000)),
            endDate: new Date(end.getTime() + (4 * 60 * 60 * 1000)),
            status: 'approved',
            totalCost: 120,
        });

        const res = await ownerClient.csrfRequest(
            'get',
            '/api/hall-bookings',
            undefined,
            { Authorization: `Bearer ${ownerVenueAdminToken}` }
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bookings).toHaveLength(1);
        expect(res.body.data.statusCounts.pending).toBe(1);
        expect(res.body.data.statusCounts.approved).toBeUndefined();
    });
});
