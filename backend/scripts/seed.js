require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Hall = require('../models/Hall');
const Category = require('../models/EventCategory');

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
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing existing data...');
    await Ticket.deleteMany({});
    await Event.deleteMany({});
    await Hall.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});

    console.log('Inserting mock data...');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@eventx.com',
      password,
      role: 'admin',
      location: { city: 'Dubai', country: 'UAE' },
      interests: ['Technology', 'Music']
    });

    const organizer1 = await User.create({
      name: 'Tech Organizer',
      email: 'organizer@techx.com',
      password,
      role: 'organizer',
      location: { city: 'London', country: 'UK' }
    });

    const organizer2 = await User.create({
      name: 'Music Festivals Ltd',
      email: 'music@events.com',
      password,
      role: 'organizer',
      location: { city: 'New York', country: 'USA' }
    });

    // Create 10 attendees with various interests
    const attendees = [];
    const interests = ['music', 'technology', 'sports', 'art', 'networking', 'business', 'food'];
    
    for (let i = 1; i <= 10; i++) {
        const userInterests = [];
        for (let j = 0; j < 3; j++) {
            const randomInterest = interests[Math.floor(Math.random() * interests.length)];
            if (!userInterests.includes(randomInterest)) userInterests.push(randomInterest);
        }
        
        attendees.push(await User.create({
            name: `Attendee ${i}`,
            email: `attendee${i}@test.com`,
            password,
            role: 'user',
            age: 20 + i,
            gender: i % 2 === 0 ? 'female' : 'male',
            location: { city: i % 2 === 0 ? 'Dubai' : 'Cairo', country: i % 2 === 0 ? 'UAE' : 'Egypt' },
            interests: userInterests
        }));
    }

    // 2. Create Categories
    await Category.create([
      { name: 'Conference', slug: 'conference', icon: '💼', color: '#3B82F6' },
      { name: 'Music', slug: 'music', icon: '🎵', color: '#8B5CF6' },
      { name: 'Sports', slug: 'sports', icon: '🏆', color: '#10B981' },
      { name: 'Workshop', slug: 'workshop', icon: '🛠️', color: '#F59E0B' }
    ]);

    // 3. Create Halls
    const mainHall = await Hall.create({
        name: 'Grand Convention Center',
        description: 'A large hall suitable for grand events and conferences.',
        capacity: 500,
        location: {
            address: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            country: 'UAE',
            zipCode: '00000',
            coordinates: { type: 'Point', coordinates: [55.2708, 25.2048] }
        },
        pricing: { basePrice: 1000, pricePerHour: 200, currency: 'USD' },
        equipment: ['projector', 'sound_system', 'stage'],
        amenities: ['wifi', 'parking', 'ac'],
        rules: ['no_smoking']
    });

    // 4. Create Events
    const event1Date = new Date();
    event1Date.setDate(event1Date.getDate() + 10); // 10 days in the future
    
    const event2Date = new Date();
    event2Date.setDate(event2Date.getDate() - 5); // 5 days in the past
    
    const event1 = await Event.create({
        title: 'Global Tech Expo 2024',
        description: '<p>The biggest tech event of the year featuring innovations in AI, Web3, and more.</p>',
        category: 'conference',
        date: event1Date,
        venue: {
            name: mainHall.name,
            address: mainHall.location.address,
            city: mainHall.location.city,
            country: mainHall.location.country,
            capacity: 500
        },
        pricing: { type: 'paid', amount: 49.99, currency: 'USD' },
        seating: { totalSeats: 500, availableSeats: 500 },
        organizer: organizer1._id,
        status: 'published',
        hall: mainHall._id,
        analytics: { views: 154, bookings: 0, revenue: 0 }
    });

    const event2 = await Event.create({
        title: 'Summer Music Fest',
        description: '<p>Live outdoor summer music festival with top artists.</p>',
        category: 'music',
        date: event2Date,
        venue: {
            name: 'Central Park Arena',
            address: 'Park Ave',
            city: 'New York',
            country: 'USA',
            capacity: 200
        },
        pricing: { type: 'paid', amount: 150, currency: 'USD' },
        seating: { totalSeats: 200, availableSeats: 200 },
        organizer: organizer2._id,
        status: 'completed',
        analytics: { views: 980, bookings: 0, revenue: 0 }
    });

    // 5. Create Tickets (Attendees joining events)
    console.log('Booking tickets...');
    
    // 8 attendees book event 1
    for (let i = 0; i < 8; i++) {
        await event1.bookSeat(`S00${i+1}`, attendees[i]._id);
        await Ticket.create({
            event: event1._id,
            user: attendees[i]._id,
            seatNumber: `S00${i+1}`,
            status: 'booked',
            payment: {
                status: 'completed',
                amount: event1.pricing.amount,
                currency: 'USD',
                paymentMethod: 'credit_card'
            },
            qrCode: 'mock_qr_data'
        });
    }
    await event1.save();
    
    // 5 attendees book event 2 (already completed, so tickets might be 'used')
    for (let i = 0; i < 5; i++) {
        await event2.bookSeat(`S00${i+1}`, attendees[i+5 > 9 ? i : i+5]._id);
        await Ticket.create({
            event: event2._id,
            user: attendees[i+5 > 9 ? i : i+5]._id,
            seatNumber: `S00${i+1}`,
            status: 'used',
            payment: {
                status: 'completed',
                amount: event2.pricing.amount,
                currency: 'USD',
                paymentMethod: 'credit_card'
            },
            qrCode: 'mock_qr_data',
            checkIn: { isCheckedIn: true, checkInTime: event2Date }
        });
    }
    await event2.save();

    console.log('Database seeded successfully!');
    console.log('Admin Info: email: admin@eventx.com | password: password123');
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
