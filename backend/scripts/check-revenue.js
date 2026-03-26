const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Ticket = require('../models/Ticket');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx').then(async () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Group by bookingDate
  const byBooking = await Ticket.aggregate([
    { $match: { bookingDate: { $gte: from } } },
    {
      $group: {
        _id: { year: { $year: '$bookingDate' }, month: { $month: '$bookingDate' } },
        count: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$payment.amount', 0] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Also check createdAt grouping
  const byCreated = await Ticket.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  console.log('\n--- By bookingDate ---');
  byBooking.forEach(r =>
    console.log(r._id.year + '-' + String(r._id.month).padStart(2,'0') + '  tickets:' + r.count + '  revenue:$' + r.revenue)
  );

  console.log('\n--- By createdAt ---');
  byCreated.forEach(r =>
    console.log(r._id.year + '-' + String(r._id.month).padStart(2,'0') + '  tickets:' + r.count)
  );

  // Sample 1 ticket to see fields
  const sample = await Ticket.findOne({}).select('bookingDate payment.paymentDate createdAt qrCode').lean();
  console.log('\nSample ticket fields:', JSON.stringify({ bookingDate: sample.bookingDate, paymentDate: sample.payment?.paymentDate, createdAt: sample.createdAt, qrCode: sample.qrCode }, null, 2));

  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
