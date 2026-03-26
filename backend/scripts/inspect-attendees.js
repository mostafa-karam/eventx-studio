const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function test() {
  try {
    await mongoose.connect(CONNECTION_URI);
    
    const someEvent = await Event.findOne({ title: /Sustainable/i }) || await Event.findOne();
    if (!someEvent) {
        console.error('No event found.');
        process.exit(1);
    }

    console.log(`Checking Event: ${someEvent.title} (${someEvent._id})`);
    
    const attendees = await Ticket.find({ event: someEvent._id, status: { $in: ['booked', 'used'] } }).populate('user');
    console.log(`Found ${attendees.length} tickets.`);
    
    if (attendees.length > 0) {
        const first = attendees[0];
        console.log('Sample Ticket Structure:');
        console.log(JSON.stringify({
            _id: first._id,
            status: first.status,
            user: first.user ? {
                _id: first.user._id,
                name: first.user.name,
                age: first.user.age,
                gender: first.user.gender,
                location: first.user.location
            } : 'NULL'
        }, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

test();
