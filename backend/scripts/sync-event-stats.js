const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx').then(async () => {
  console.log('Syncing Event seat counts and analytics with actual Ticket bookings...');

  const events = await Event.find({});
  let totalFixed = 0;

  for (const event of events) {
    // Count actual valid tickets for this event
    const ticketCount = await Ticket.countDocuments({
      event: event._id,
      status: { $in: ['booked', 'used'] }
    });

    const revenueResult = await Ticket.aggregate([
      { $match: { event: event._id, status: { $in: ['booked', 'used'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$payment.amount', 0] } } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    let modified = false;

    // Fix analytics.bookings and analytics.revenue
    if (!event.analytics) event.analytics = {};
    if (event.analytics.bookings !== ticketCount) {
      event.analytics.bookings = ticketCount;
      modified = true;
    }
    if (event.analytics.revenue !== totalRevenue) {
      event.analytics.revenue = totalRevenue;
      modified = true;
    }

    // Fix availableSeats and dynamically expand capacity if overbooked by the random seed
    if (event.seating && event.seating.totalSeats !== undefined) {
      if (ticketCount > event.seating.totalSeats) {
        event.seating.totalSeats = ticketCount;
        modified = true;
      }
      const correctAvailable = Math.max(0, event.seating.totalSeats - ticketCount);
      if (event.seating.availableSeats !== correctAvailable) {
        event.seating.availableSeats = correctAvailable;
        modified = true;
      }
    }

    if (modified) {
      await event.save({ validateBeforeSave: false });
      totalFixed++;
      console.log(`Fixed event ${event.title}: ${ticketCount} tickets, $${totalRevenue}`);
    }
  }

  console.log(`\nDone! Synced ${totalFixed} events.`);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
