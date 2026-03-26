const mongoose = require('mongoose');
const AnalyticsService = require('../services/analyticsService');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function test() {
  try {
    await mongoose.connect(CONNECTION_URI);
    
    console.log('--- Global Demographics ---');
    const global = await AnalyticsService.getGlobalDemographics();
    console.log('Location Distribution:', JSON.stringify(global.locations, null, 2));

    console.log('\n--- Specific Event (if any) ---');
    const adminUser = await User.findOne({ role: 'admin' });
    const attendees = await AnalyticsService.getAttendeeDemographics(adminUser);
    if (attendees.length > 0) {
        const countryCounts = attendees.reduce((acc, curr) => {
            acc[curr.country] = (acc[curr.country] || 0) + 1;
            return acc;
        }, {});
        console.log('Attendee Countries:', countryCounts);
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

test();
