const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { createTestClient } = require('../test-utils/testClient');

jest.setTimeout(45000);

let mongoServer;

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
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany();
  }
});

describe('Ticket refund, cancel concurrency, organizer access', () => {
  it('allows the event organizer to fetch an attendee ticket by id', async () => {
    const client = createTestClient(app);

    await client.csrfRequest('post', '/api/auth/register', {
      name: 'Org',
      email: 'org_ticket_view@example.com',
      password: 'UniqueTestPass!2026',
      role: 'organizer',
    });
    await User.updateOne(
      { email: 'org_ticket_view@example.com' },
      { emailVerified: true, role: 'organizer' },
    );

    const orgLogin = await client.csrfRequest('post', '/api/auth/login', {
      email: 'org_ticket_view@example.com',
      password: 'UniqueTestPass!2026',
    });
    const orgCookies = orgLogin.headers['set-cookie'];
    const orgToken = orgCookies.find((c) => c.startsWith('accessToken=')).split(';')[0].split('=')[1];
    const org = await User.findOne({ email: 'org_ticket_view@example.com' });

    await client.csrfRequest('post', '/api/auth/register', {
      name: 'Fan',
      email: 'fan_ticket_view@example.com',
      password: 'UniqueTestPass!2026',
      role: 'user',
    });
    await User.updateOne({ email: 'fan_ticket_view@example.com' }, { emailVerified: true });

    const fanLogin = await client.csrfRequest('post', '/api/auth/login', {
      email: 'fan_ticket_view@example.com',
      password: 'UniqueTestPass!2026',
    });
    const fanCookies = fanLogin.headers['set-cookie'];
    const fanToken = fanCookies.find((c) => c.startsWith('accessToken=')).split(';')[0].split('=')[1];

    const eventRes = await client.csrfRequest(
      'post',
      '/api/events',
      {
        title: 'Organizer View Ticket',
        description: 'Test',
        date: new Date(Date.now() + 86400000).toISOString(),
        venue: { name: 'V', address: '1', city: 'C', country: 'US', capacity: 50 },
        pricing: { type: 'free', amount: 0, currency: 'USD' },
        seating: { totalSeats: 10, availableSeats: 10, seatMap: [] },
        category: 'conference',
        tags: [],
      },
      { Authorization: `Bearer ${orgToken}` },
    );
    const eventId = eventRes.body.data.event._id;
    await client.csrfRequest('post', `/api/events/${eventId}/publish`, undefined, {
      Authorization: `Bearer ${orgToken}`,
    });

    await client.csrfRequest('post', '/api/booking/initiate', { eventId, quantity: 1 }, {
      Authorization: `Bearer ${fanToken}`,
    });
    const confirm = await client.csrfRequest(
      'post',
      '/api/booking/confirm',
      {
        eventId,
        bookingId: 'bs_test',
        paymentId: 'free-transaction',
        paymentMethod: 'free',
      },
      { Authorization: `Bearer ${fanToken}` },
    );
    expect(confirm.statusCode).toBe(200);
    const ticketId = confirm.body.data.ticket._id;

    const view = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(view.statusCode).toBe(200);
    expect(view.body.success).toBe(true);
    expect(view.body.data.ticket.user.email).toBe('fan_ticket_view@example.com');
    expect(String(view.body.data.ticket.event.organizer)).toBe(String(org._id));
  });

  it('only one parallel refund succeeds for the same ticket', async () => {
    const client = createTestClient(app);

    await client.csrfRequest('post', '/api/auth/register', {
      name: 'Refund User',
      email: 'refund_parallel@example.com',
      password: 'UniqueTestPass!2026',
      role: 'user',
    });
    await User.updateOne({ email: 'refund_parallel@example.com' }, { emailVerified: true });

    const login = await client.csrfRequest('post', '/api/auth/login', {
      email: 'refund_parallel@example.com',
      password: 'UniqueTestPass!2026',
    });
    const cookies = login.headers['set-cookie'];
    const token = cookies.find((c) => c.startsWith('accessToken=')).split(';')[0].split('=')[1];
    const user = await User.findOne({ email: 'refund_parallel@example.com' });

    const ev = await Event.create({
      title: 'Refund Event',
      description: 'R',
      category: 'conference',
      date: new Date(Date.now() + 86400000),
      venue: { name: 'V', address: '1', city: 'C', country: 'US', capacity: 10 },
      organizer: user._id,
      seating: { totalSeats: 5, availableSeats: 4, seatMap: [] },
      pricing: { type: 'free', amount: 0, currency: 'USD' },
      status: 'published',
    });

    const ticket = await Ticket.create({
      event: ev._id,
      user: user._id,
      seatNumber: `GA-${Date.now()}`,
      status: 'booked',
      payment: { status: 'completed', amount: 0, currency: 'USD', paymentMethod: 'free' },
    });

    const [a, b] = await Promise.all([
      client.csrfRequest('put', `/api/tickets/${ticket._id}/refund`, {}, {
        Authorization: `Bearer ${token}`,
      }),
      client.csrfRequest('put', `/api/tickets/${ticket._id}/refund`, {}, {
        Authorization: `Bearer ${token}`,
      }),
    ]);

    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toContain(200);
    expect(codes.some((c) => c === 400 || c === 409)).toBe(true);

    const evAfter = await Event.findById(ev._id);
    expect(evAfter.seating.availableSeats).toBe(5);
  });

  it('only one parallel cancel succeeds for the same ticket', async () => {
    const client = createTestClient(app);

    await client.csrfRequest('post', '/api/auth/register', {
      name: 'Cancel User',
      email: 'cancel_parallel@example.com',
      password: 'UniqueTestPass!2026',
      role: 'user',
    });
    await User.updateOne({ email: 'cancel_parallel@example.com' }, { emailVerified: true });

    const login = await client.csrfRequest('post', '/api/auth/login', {
      email: 'cancel_parallel@example.com',
      password: 'UniqueTestPass!2026',
    });
    const cookies = login.headers['set-cookie'];
    const token = cookies.find((c) => c.startsWith('accessToken=')).split(';')[0].split('=')[1];
    const user = await User.findOne({ email: 'cancel_parallel@example.com' });

    const ev = await Event.create({
      title: 'Cancel Event',
      description: 'C',
      category: 'conference',
      date: new Date(Date.now() + 86400000),
      venue: { name: 'V', address: '1', city: 'C', country: 'US', capacity: 10 },
      organizer: user._id,
      seating: { totalSeats: 3, availableSeats: 2, seatMap: [] },
      pricing: { type: 'free', amount: 0, currency: 'USD' },
      status: 'published',
    });

    const ticket = await Ticket.create({
      event: ev._id,
      user: user._id,
      seatNumber: `GA-${Date.now()}`,
      status: 'booked',
      payment: { status: 'completed', amount: 0, currency: 'USD', paymentMethod: 'free' },
    });

    const bookingService = require('../services/bookingService');
    const settled = await Promise.allSettled([
      bookingService.cancelBooking(String(ticket._id), String(user._id)),
      bookingService.cancelBooking(String(ticket._id), String(user._id)),
    ]);

    const fulfilled = settled.filter((s) => s.status === 'fulfilled');
    expect(fulfilled.length).toBe(1);
    expect(fulfilled[0].value.ticket.status).toBe('cancelled');
    expect(settled.filter((s) => s.status === 'rejected').length).toBe(1);

    const evAfter = await Event.findById(ev._id);
    expect(evAfter.seating.availableSeats).toBe(3);
  });
});
