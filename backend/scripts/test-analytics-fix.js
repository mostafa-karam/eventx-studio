const mongoose = require('mongoose');
const AnalyticsService = require('../services/analyticsService');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function test() {
  try {
    await mongoose.connect(CONNECTION_URI);
    
    const adminUser = await User.findOne({ email: 'admin@eventx.dev' });
    const organizerUser = await User.findOne({ email: 'organizer@eventx.dev' });
    
    if (!adminUser || !organizerUser) {
        console.error('Test users not found. Run seed first.');
        process.exit(1);
    }

    console.log('--- Testing Attendee Insights Visibility ---');
    
    console.log('Testing Admin Accessibility...');
    const adminAttendees = await AnalyticsService.getAttendeeDemographics(adminUser);
    console.log(`Admin sees ${adminAttendees.length} total attendees.`);
    
    if (adminAttendees.length > 0) {
        const first = adminAttendees[0];
        console.log('Sample Data Check:', {
            hasAge: !!first.age,
            hasGender: !!first.gender,
            hasCity: !!first.city,
            hasInterests: !!first.interests
        });
    }

    console.log('Testing Organizer Accessibility...');
    const organizerAttendees = await AnalyticsService.getAttendeeDemographics(organizerUser);
    console.log(`Organizer sees ${organizerAttendees.length} attendees.`);

    // Check if organizer sees less than admin (unless organizer owns all events)
    if (adminAttendees.length > organizerAttendees.length) {
        console.log('SUCCESS: Admin sees more attendees than a single organizer.');
    } else {
        console.log('NOTE: Admin and Organizer see same count (may happen if organizer owns all seeded events with tickets).');
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

test();
