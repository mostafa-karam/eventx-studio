const mongoose = require('mongoose');
const AnalyticsService = require('../services/analyticsService');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const dotenv = require('dotenv');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function test() {
  try {
    await mongoose.connect(CONNECTION_URI);
    
    const adminUser = await User.findOne({ email: 'admin@eventx.dev' });
    const someEvent = await Event.findOne();
    
    if (!adminUser || !someEvent) {
        console.error('Test data not found.');
        process.exit(1);
    }

    console.log(`Testing with Event: ${someEvent.title} (${someEvent._id})`);
    
    const ticketCount = await Ticket.countDocuments({ event: someEvent._id });
    console.log(`Direct Ticket Count: ${ticketCount}`);

    const attendees = await AnalyticsService.getAttendeeDemographics(adminUser, someEvent._id.toString());
    console.log(`AttendeeDemographics returned ${attendees.length} attendees.`);
    
    if (attendees.length === 0) {
        console.log('DEBUGGING PIPELINE...');
        // Let's see what the pipeline finds without the match
        const debugPipeline = await Ticket.aggregate([
            { $match: { event: someEvent._id, status: { $in: ['booked', 'used'] } } },
            { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventData' } },
            { $unwind: '$eventData' },
            { $project: { eventId: '$eventData._id', status: 1 } }
        ]);
        console.log('Pipeline middle results:', debugPipeline.length);
        if (debugPipeline.length > 0) {
            console.log('Sample result:', debugPipeline[0]);
        }
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

test();
