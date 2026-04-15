const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const crypto = require('crypto');
const { generateAccessToken } = require('../utils/authUtils');
const { createTestClient } = require('../test-utils/testClient');

let mongoServer;
let adminToken, orgToken;
let admin, org;
let client;
let testCampaignId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    admin = await User.create({
        name: 'Admin Marketer',
        email: 'admin_market@example.com',
        password: 'Password123!',
        role: 'admin',
        isActive: true,
        emailVerified: true
    });
    const adminSessionId = crypto.randomUUID();
    admin.addSession(adminSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await admin.save();
    adminToken = generateAccessToken(admin._id, adminSessionId);

    org = await User.create({
        name: 'Organizer Marketer',
        email: 'org_market@example.com',
        password: 'Password123!',
        role: 'organizer',
        isActive: true,
        emailVerified: true
    });
    const orgSessionId = crypto.randomUUID();
    org.addSession(orgSessionId, { device: 'Jest', ipAddress: '127.0.0.1' });
    await org.save();
    orgToken = generateAccessToken(org._id, orgSessionId);

    client = createTestClient(app);
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('Marketing Campaigns Endpoints', () => {
    it('should allow organizer to create a campaign', async () => {
        const eventId = new mongoose.Types.ObjectId(); // fake valid event for test

        const res = await client.csrfRequest('post', '/api/marketing/campaigns', {
            name: 'Summer Sale',
            type: 'email',
            event: eventId.toString(),
            targetAudience: 'all',
            subject: 'Flash Sale',
            content: 'Get 20% off!',
            scheduledAt: new Date().toISOString()
        }, { Authorization: `Bearer ${orgToken}` });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.campaign.name).toBe('Summer Sale');
        testCampaignId = res.body.data.campaign.id;
    });

    it('should launch a campaign successfully', async () => {
        const res = await client.csrfRequest('post', `/api/marketing/campaigns/${testCampaignId}/launch`, undefined, { Authorization: `Bearer ${orgToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should fetch all campaigns for organizer', async () => {
        const res = await client.csrfRequest('get', '/api/marketing/campaigns', undefined, { Authorization: `Bearer ${orgToken}` });
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data.campaigns)).toBe(true);
        expect(res.body.data.campaigns.length).toBeGreaterThan(0);
    });

    it('should allow admin to update any campaign', async () => {
        const res = await client.csrfRequest('put', `/api/marketing/campaigns/${testCampaignId}`, {
            name: 'Admin Summer Sale Update'
        }, { Authorization: `Bearer ${adminToken}` });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should allow organizer to delete campaign', async () => {
        const res = await client.csrfRequest('delete', `/api/marketing/campaigns/${testCampaignId}`, undefined, { Authorization: `Bearer ${orgToken}` });
        expect(res.statusCode).toBe(200);
    });
});
