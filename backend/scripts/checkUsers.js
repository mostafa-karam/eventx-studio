require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./../models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eventx');
        const emails = ['admin@eventx.com', 'venue@eventx.com', 'organizer@techx.com', 'user@eventx.com'];
        for (const email of emails) {
            const u = await User.findOne({ email: email.toLowerCase() }).select('email role isActive emailVerified createdAt');
            console.log(email, u ? JSON.stringify(u) : 'NOT FOUND');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
