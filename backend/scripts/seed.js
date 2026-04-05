require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

// Models
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Hall = require('../models/Hall');
const Category = require('../models/EventCategory');
const HallBooking = require('../models/HallBooking');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Waitlist = require('../models/Waitlist');
const Campaign = require('../models/Campaign');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        console.log('--- Connecting to database... ---');
        await connectDB();

        console.log('--- Clearing existing data... ---');
        await Promise.all([
            Ticket.deleteMany({}),
            Event.deleteMany({}),
            Hall.deleteMany({}),
            Category.deleteMany({}),
            User.deleteMany({}),
            HallBooking.deleteMany({}),
            Coupon.deleteMany({}),
            Review.deleteMany({}),
            Notification.deleteMany({}),
            Waitlist.deleteMany({}),
            Campaign.deleteMany({}),
            SupportTicket.deleteMany({}),
            AuditLog.deleteMany({})
        ]);

        console.log('--- Inserting realistic mock data... ---');

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('password123', salt);

        // 1. Create Core Users (Fixed logins for ease of access)
        const admin = await User.create({
            name: 'Admin Chief',
            email: 'admin@eventx.com',
            password,
            role: 'admin',
            emailVerified: true,
            isActive: true,
            location: { city: 'Dubai', country: 'UAE' },
            interests: ['Technology', 'Music']
        });

        const venueAdmin = await User.create({
            name: 'Venue Executive',
            email: 'venue@eventx.com',
            password,
            role: 'venue_admin',
            emailVerified: true,
            isActive: true
        });

        const organizer1 = await User.create({
            name: 'Innovate Tech',
            email: 'organizer@techx.com',
            password,
            role: 'organizer',
            emailVerified: true,
            isActive: true,
            location: { city: 'London', country: 'UK' }
        });

        const organizer2 = await User.create({
            name: 'Live Music Festivals',
            email: 'music@events.com',
            password,
            role: 'organizer',
            emailVerified: true,
            isActive: true,
            location: { city: 'New York', country: 'USA' }
        });

        // 2. Generate Realistic Attendees using Faker
        const attendees = [];
        const interestsPool = ['music', 'technology', 'sports', 'art', 'networking', 'business', 'food'];

        for (let i = 1; i <= 20; i++) {
            attendees.push(await User.create({
                name: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password,
                role: 'user',
                emailVerified: true,
                isActive: true,
                age: faker.number.int({ min: 18, max: 65 }),
                gender: faker.helpers.arrayElement(['male', 'female', 'other']),
                location: { 
                    city: faker.location.city(), 
                    country: faker.helpers.arrayElement(['UAE', 'UK', 'USA', 'Egypt', 'France']) 
                },
                interests: faker.helpers.arrayElements(interestsPool, { min: 2, max: 4 })
            }));
        }

        // 3. Create Event Categories
        const categories = await Category.insertMany([
            { name: 'Conference', slug: 'conference', icon: '💼', color: '#3B82F6', createdBy: admin._id },
            { name: 'Music', slug: 'music', icon: '🎵', color: '#8B5CF6', createdBy: admin._id },
            { name: 'Sports', slug: 'sports', icon: '🏆', color: '#10B981', createdBy: admin._id },
            { name: 'Workshop', slug: 'workshop', icon: '🛠️', color: '#F59E0B', createdBy: admin._id }
        ]);

        // 4. Create World-Class Halls
        const mainHall = await Hall.create({
            name: 'Grand Expo Center',
            description: faker.lorem.paragraph(),
            capacity: 1000,
            hourlyRate: 350,
            dailyRate: 2500,
            status: 'active',
            createdBy: venueAdmin._id,
            location: {
                address: faker.location.streetAddress(),
                city: 'Dubai',
                country: 'UAE'
            },
            equipment: ['projector', 'sound_system', 'stage', 'lighting'],
            amenities: ['wifi', 'parking', 'ac'],
            rules: ['no_smoking']
        });

        const musicArena = await Hall.create({
            name: 'Central Music Arena',
            description: faker.lorem.paragraph(),
            capacity: 500,
            hourlyRate: 150,
            dailyRate: 1000,
            status: 'active',
            createdBy: venueAdmin._id,
            location: {
                address: faker.location.streetAddress(),
                city: 'New York',
                country: 'USA'
            },
            equipment: ['stage', 'sound_system', 'lighting'],
            amenities: ['wifi', 'bar', 'ac'],
            rules: ['no_outside_food']
        });

        // 5. Hall Bookings (Organizers renting halls)
        await HallBooking.create([
            {
                hall: mainHall._id,
                event: null, // Will map to an event logically
                organizer: organizer1._id,
                startDate: faker.date.future(),
                endDate: faker.date.future(),
                status: 'approved',
                totalCost: 1500,
                notes: 'Annual Tech Conference setup'
            },
            {
                hall: musicArena._id,
                event: null,
                organizer: organizer2._id,
                startDate: faker.date.past(),
                endDate: faker.date.past(),
                status: 'approved',
                totalCost: 800,
                notes: 'Summer festival main stage'
            }
        ]);

        // 6. Create Realistic Events
        const pastEventDate = faker.date.past();
        const futureEventDate = faker.date.future();

        const eventTech = await Event.create({
            title: 'Global Tech & AI Summit 2026',
            description: `<p>${faker.lorem.paragraphs(2)}</p>`,
            category: 'conference',
            date: futureEventDate,
            endDate: new Date(futureEventDate.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
            venue: {
                name: mainHall.name,
                city: mainHall.location.city,
                country: mainHall.location.country,
                capacity: mainHall.capacity
            },
            pricing: { type: 'paid', amount: 199.99, currency: 'USD' },
            seating: { totalSeats: 500, availableSeats: 500 },
            organizer: organizer1._id,
            status: 'published',
            hall: mainHall._id,
            analytics: { views: faker.number.int({min: 200, max: 1000}), bookings: 0, revenue: 0 },
            tags: ['AI', 'Tech', 'Web3', 'Future']
        });

        const eventMusic = await Event.create({
            title: 'Electric Summer SoundFest',
            description: `<p>${faker.lorem.paragraphs(2)}</p>`,
            category: 'music',
            date: pastEventDate,
            endDate: new Date(pastEventDate.getTime() + 6 * 60 * 60 * 1000), 
            venue: {
                name: musicArena.name,
                city: musicArena.location.city,
                country: musicArena.location.country,
                capacity: musicArena.capacity
            },
            pricing: { type: 'paid', amount: 85, currency: 'USD' },
            seating: { totalSeats: 250, availableSeats: 250 },
            organizer: organizer2._id,
            status: 'completed',
            hall: musicArena._id,
            analytics: { views: faker.number.int({min: 1500, max: 4000}), bookings: 0, revenue: 0 },
            tags: ['Music', 'Summer', 'Live', 'Festival']
        });

        // 7. Seed Tickets, Check-ins, and Generate Database Notifications
        console.log('Generating bookings and notifications...');
        
        // 12 Attendees book the upcoming Tech event
        for (let i = 0; i < 12; i++) {
            const user = attendees[i];
            const seatNumber = `A-${String(i + 1).padStart(2, '0')}`;
            
            await eventTech.bookSeat(seatNumber, user._id);
            
            const ticket = await Ticket.create({
                event: eventTech._id,
                user: user._id,
                seatNumber: seatNumber,
                status: 'booked',
                payment: {
                    status: 'completed',
                    amount: eventTech.pricing.amount,
                    currency: eventTech.pricing.currency,
                    paymentMethod: 'credit_card',
                    paymentDate: new Date()
                },
                qrCode: faker.string.uuid()
            });

            // True Database Notification!
            await Notification.create({
                title: 'Order Confirmed! 🎉',
                message: `You successfully booked a ticket for ${eventTech.title}. Get ready!`,
                type: 'booking',
                userId: user._id,
                priority: 'high',
                metadata: { eventId: eventTech._id, ticketId: ticket._id },
                createdAt: faker.date.recent()
            });

            // Occasional Support Ticket related to booking
            if (i === 3) {
                await SupportTicket.create({
                    subject: 'Dietary requirements for lunch',
                    description: 'Hello, I just booked my ticket. Do you provide vegan lunch options?',
                    category: 'event',
                    priority: 'medium',
                    status: 'open',
                    userId: user._id
                });
            }
        }
        await eventTech.save();

        // 8 Attendees booked the past Music event (some checked in, some missed it)
        for (let i = 12; i < 20; i++) {
            const user = attendees[i];
            const checkedIn = Math.random() > 0.2; // 80% attendance rate
            const seatNumber = `M-${String(i + 1).padStart(2, '0')}`;

            await eventMusic.bookSeat(seatNumber, user._id);

            const ticket = await Ticket.create({
                event: eventMusic._id,
                user: user._id,
                seatNumber: seatNumber,
                status: checkedIn ? 'used' : 'booked',
                payment: {
                    status: 'completed',
                    amount: eventMusic.pricing.amount,
                    currency: eventMusic.pricing.currency,
                    paymentMethod: 'paypal',
                    paymentDate: faker.date.past()
                },
                qrCode: faker.string.uuid(),
                checkIn: { isCheckedIn: checkedIn, checkInTime: checkedIn ? eventMusic.date : null }
            });

            await Notification.create({
                title: 'Here is your ticket!',
                message: `You booked a ticket for ${eventMusic.title}. Keep this safe.`,
                type: 'booking',
                userId: user._id,
                metadata: { eventId: eventMusic._id, ticketId: ticket._id },
                createdAt: faker.date.past()
            });

            // If checked in and attended, maybe write a glowing review!
            if (checkedIn && Math.random() > 0.3) {
                await Review.create({
                    event: eventMusic._id,
                    user: user._id,
                    rating: faker.number.int({ min: 4, max: 5 }),
                    title: faker.helpers.arrayElement(['Incredible experience!', 'Best weekend ever', 'Awesome vibes', 'Sound system was insane']),
                    body: faker.lorem.paragraph(),
                    attendedVerified: true,
                    createdAt: faker.date.recent()
                });
            }
        }
        await eventMusic.save();

        // 8. Create Sales & Discounts (Coupons)
        await Coupon.create([
            { code: 'EARLYBIRD', description: 'Early Bird 20%', discountType: 'percentage', discountValue: 20, createdBy: admin._id },
            { code: 'VIPUPGRADE', description: '$50 Off VIP Packages', discountType: 'fixed', discountValue: 50, createdBy: organizer1._id }
        ]);

        // 9. Create a Waitlist for a heavily-demanded event
        await Waitlist.create({
            event: eventTech._id,
            user: attendees[19]._id, // The last guy didn't make the cut for the first block!
            status: 'pending',
            createdAt: faker.date.recent()
        });

        // 10. Audit Logs
        await AuditLog.create([
            {
                actor: admin._id,
                actorName: admin.name,
                actorRole: admin.role,
                action: 'auth.login',
                resource: 'Auth',
                ip: '127.0.0.1',
                createdAt: faker.date.recent()
            },
            {
                actor: admin._id,
                actorName: admin.name,
                actorRole: admin.role,
                action: 'coupon.create',
                resource: 'Coupon',
                ip: '127.0.0.1',
                createdAt: faker.date.recent()
            }
        ]);

        // 11. Marketing Campaigns
        await Campaign.create({
            name: 'Tech Summit Final Push',
            type: 'email',
            status: 'completed',
            eventId: eventTech._id,
            content: 'Last chance to grab your tickets for the Innovation Tech Summit 2026. Only a few spots left!',
            createdBy: organizer1._id,
            metrics: { sent: 500, delivered: 480, opened: 320 },
            createdAt: faker.date.recent()
        });

        console.log('\n--- Database Seeded Successfully! ---');
        console.log('Use the following credentials to test your panels:');
        console.log('🔑 Admin:      admin@eventx.com     / password123');
        console.log('🔑 Organizer:  organizer@techx.com  / password123');
        console.log('🔑 Venue Mngr: venue@eventx.com     / password123');
        console.log('🔑 User:       (Any faker email)    / password123');
        
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
