const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Models
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Hall = require('../models/Hall');
const EventCategory = require('../models/EventCategory');
const HallBooking = require('../models/HallBooking');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Waitlist = require('../models/Waitlist');
const Campaign = require('../models/Campaign');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function seed() {
  try {
    console.log('--- Database Seeding Started ---');
    await mongoose.connect(CONNECTION_URI);
    console.log('Connected to MongoDB');

    // Clean up
    console.log('Cleaning up existing data...');
    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Ticket.deleteMany({}),
      Hall.deleteMany({}),
      EventCategory.deleteMany({}),
      HallBooking.deleteMany({}),
      Coupon.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({}),
      Waitlist.deleteMany({}),
      Campaign.deleteMany({}),
      SupportTicket.deleteMany({}),
      AuditLog.deleteMany({}),
      mongoose.connection.collection('counters').deleteMany({})
    ]);

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Create User Roles
    console.log('Seeding Users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@eventx.dev',
      password: 'Password123!', // User model likely hashes it in pre-save, but let's be sure or use plain if it does
      role: 'admin',
      emailVerified: true,
      isActive: true
    });

    const venueAdmin = await User.create({
      name: 'Venue Manager',
      email: 'venue@eventx.dev',
      password: 'Password123!',
      role: 'venue_admin',
      emailVerified: true,
      isActive: true
    });

    const organizer = await User.create({
      name: 'Event Organizer',
      email: 'organizer@eventx.dev',
      password: 'Password123!',
      role: 'organizer',
      emailVerified: true,
      isActive: true
    });

    const regularUsers = [];
    for (let i = 0; i < 20; i++) {
      regularUsers.push(await User.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'Password123!',
        role: 'user',
        emailVerified: true,
        isActive: true,
        age: faker.number.int({ min: 18, max: 70 }),
        gender: faker.helpers.arrayElement(['male', 'female', 'other', 'prefer-not-to-say']),
        location: {
            city: faker.location.city(),
            country: faker.helpers.arrayElement(['USA', 'UK', 'Germany', 'France', 'Egypt', 'UAE', 'Saudi Arabia', 'Canada', 'Japan', 'Australia']),
            address: faker.location.streetAddress()
        },
        interests: faker.helpers.arrayElements(['music', 'tech', 'business', 'art', 'sports'], 2)
      }));
    }

    // 2. Event Categories
    console.log('Seeding Categories...');
    const categoriesData = [
      { name: 'Conference', description: 'Professional gatherings', emoji: '💼', color: '#3B82F6', createdBy: adminUser._id },
      { name: 'Workshop', description: 'Hands-on learning', emoji: '🛠️', color: '#F59E0B', createdBy: adminUser._id },
      { name: 'Concert', description: 'Live music events', emoji: '🎵', color: '#EF4444', createdBy: adminUser._id },
      { name: 'Networking', description: 'Connect with people', emoji: '🤝', color: '#10B981', createdBy: adminUser._id }
    ];
    const categories = await EventCategory.insertMany(categoriesData);

    // 3. Halls
    console.log('Seeding Halls...');
    const halls = [];
    const equipmentOptions = ['projector', 'sound_system', 'wifi', 'stage', 'lighting', 'air_conditioning'];
    for (let i = 0; i < 5; i++) {
        halls.push(await Hall.create({
            name: `${faker.company.name()} Hall`,
            description: faker.lorem.paragraph(),
            capacity: faker.number.int({ min: 50, max: 500 }),
            equipment: faker.helpers.arrayElements(equipmentOptions, 3),
            hourlyRate: faker.number.int({ min: 50, max: 200 }),
            dailyRate: faker.number.int({ min: 300, max: 1500 }),
            status: 'active',
            createdBy: venueAdmin._id,
            location: {
                floor: `${faker.number.int({ min: 1, max: 5 })}th Floor`,
                wing: faker.helpers.arrayElement(['North', 'South', 'East', 'West'])
            }
        }));
    }

    // 4. Events
    console.log('Seeding Events...');
    const events = [];
    const eventStatuses = ['published', 'draft', 'completed', 'cancelled'];
    const eventTypes = ['conference', 'workshop', 'seminar', 'concert', 'sports', 'exhibition', 'networking', 'other'];
    
    for (let i = 0; i < 10; i++) {
        const isPaid = faker.datatype.boolean();
        const totalSeats = faker.number.int({ min: 20, max: 100 });
        const date = i < 3 ? faker.date.past() : faker.date.future();
        const status = i < 3 ? 'completed' : faker.helpers.arrayElement(['published', 'draft']);

        const eventData = {
            title: faker.company.catchPhrase(),
            description: faker.lorem.paragraphs(2),
            category: faker.helpers.arrayElement(eventTypes),
            date: date,
            endDate: new Date(date.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
            venue: {
                name: faker.company.name(),
                address: faker.location.streetAddress(),
                city: faker.location.city(),
                country: faker.location.country(),
                capacity: totalSeats + 50
            },
            pricing: {
                type: isPaid ? 'paid' : 'free',
                amount: isPaid ? faker.number.int({ min: 10, max: 150 }) : 0,
                currency: 'USD'
            },
            seating: {
                totalSeats: totalSeats,
                availableSeats: totalSeats
            },
            organizer: organizer._id,
            hall: faker.helpers.arrayElement(halls)._id,
            status: status,
            tags: faker.helpers.arrayElements(['tech', 'innovation', 'future', 'music', 'workshop'], 3)
        };

        const newEvent = new Event(eventData);
        await newEvent.save({ validateBeforeSave: false });
        events.push(newEvent);
    }

    // 5. Create Tickets
    console.log('Creating tickets and check-ins...');
    // regularUsers array is already filtered and available from step 1.
    
    for (const event of events) {
        if (event.status === 'draft') continue;
        
        for (let i = 0; i < 8; i++) {
            const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
            
            const isPast = event.startDate < new Date();
            const status = isPast ? (Math.random() > 0.2 ? 'used' : 'booked') : 'booked';
            const isCheckedIn = status === 'used';
            
            await Ticket.create({
                event: event._id,
                user: user._id,
                seatNumber: `S${String(i + 1).padStart(3, '0')}`,
                status: status,
                payment: {
                    status: 'completed',
                    amount: event.pricing.amount,
                    currency: 'USD',
                    paymentMethod: event.pricing.type === 'free' ? 'free' : 'credit_card',
                    paymentDate: new Date()
                },
                qrCode: faker.string.uuid(),
                checkIn: {
                    isCheckedIn: isCheckedIn,
                    checkInTime: isCheckedIn ? event.startDate : null
                }
            });
            
            // Update event seating/analytics manually or it might happen in model
            // Actually the model has bookSeat method, but we are doing mass insert
            event.seating.availableSeats -= 1;
            event.analytics.bookings += 1;
            event.analytics.revenue += event.pricing.amount;
        }
        await event.save();
    }

    // 6. Hall Bookings
    console.log('Seeding Hall Bookings...');
    for (let i = 0; i < 5; i++) {
        const start = faker.date.future();
        await HallBooking.create({
            hall: faker.helpers.arrayElement(halls)._id,
            event: faker.helpers.arrayElement(events)._id,
            organizer: organizer._id,
            startDate: start,
            endDate: new Date(start.getTime() + 8 * 60 * 60 * 1000),
            status: faker.helpers.arrayElement(['approved', 'pending', 'rejected']),
            totalCost: faker.number.int({ min: 500, max: 2000 }),
            notes: faker.lorem.sentence()
        });
    }

    // 7. Coupons
    console.log('Seeding Coupons...');
    await Coupon.create([
      { code: 'SAVE10', description: '10% off', discountType: 'percentage', discountValue: 10, createdBy: adminUser._id },
      { code: 'FIXED50', description: '$50 off', discountType: 'fixed', discountValue: 50, createdBy: adminUser._id }
    ]);

    // 8. Reviews
    console.log('Seeding Reviews...');
    const completedEvents = events.filter(e => e.status === 'completed');
    for (const event of completedEvents) {
        const reviewers = faker.helpers.arrayElements(regularUsers, 3);
        for (const user of reviewers) {
            await Review.create({
                event: event._id,
                user: user._id,
                rating: faker.number.int({ min: 3, max: 5 }),
                title: faker.lorem.sentence(),
                body: faker.lorem.paragraph(),
                attendedVerified: true
            }).catch(() => {}); // Ignore duplicates if any
        }
    }

    // 9. Notifications
    console.log('Seeding Notifications...');
    for (const user of regularUsers.slice(0, 5)) {
        await Notification.create({
            title: 'Welcome to EventX!',
            message: 'Thanks for joining our platform.',
            type: 'system',
            userId: user._id
        });
    }

    // 10. Waitlist
    console.log('Seeding Waitlist...');
    const topEvent = events[0];
    await Waitlist.create({
        event: topEvent._id,
        user: regularUsers[regularUsers.length - 1]._id,
        status: 'pending'
    });

    // 11. Campaigns
    console.log('Seeding Campaigns...');
    await Campaign.create({
        name: 'Summer Launch',
        type: 'email',
        status: 'completed',
        eventId: events[0]._id,
        content: 'Check out our new summer events!',
        createdBy: organizer._id,
        metrics: { sent: 100, delivered: 98, opened: 50 }
    });

    // 12. Support Tickets
    console.log('Seeding Support Tickets...');
    await SupportTicket.create({
        subject: 'Login Issue',
        description: 'I cannot login to my account',
        category: 'technical',
        priority: 'high',
        status: 'open',
        userId: regularUsers[0]._id
    });

    // 13. Audit Logs
    console.log('Seeding Audit Logs...');
    await AuditLog.create({
        actor: adminUser._id,
        actorName: adminUser.name,
        actorRole: adminUser.role,
        action: 'auth.login',
        resource: 'Auth',
        ip: '127.0.0.1'
    });

    console.log('--- Database Seeding Completed Successfully ---');
    console.log('Admin: admin@eventx.dev / Password123!');
    console.log('Venue Admin: venue@eventx.dev / Password123!');
    console.log('Organizer: organizer@eventx.dev / Password123!');
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
