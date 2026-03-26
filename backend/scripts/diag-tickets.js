const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const dotenv = require('dotenv');

dotenv.config();

const CONNECTION_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx';

async function test() {
  try {
    await mongoose.connect(CONNECTION_URI);
    
    const events = await Event.find();
    console.log(`Total Events: ${events.length}`);
    
    for (const event of events) {
        const bookedCount = await Ticket.countDocuments({ event: event._id, status: 'booked' });
        const usedCount = await Ticket.countDocuments({ event: event._id, status: 'used' });
        console.log(`Event: ${event.title.substring(0, 30)}... | Booked: ${bookedCount} | Used: ${usedCount}`);
    }

    const totalTickets = await Ticket.countDocuments();
    console.log(`\nTotal Tickets in DB: ${totalTickets}`);

    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

test();
