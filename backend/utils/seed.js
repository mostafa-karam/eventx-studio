require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('./logger');

const demoUsers = [
    {
        name: 'Admin User',
        email: 'mostafa.karam.work@gmail.com',
        password: 'admin123',
        role: 'admin',
        emailVerified: true
    },
    {
        name: 'Venue Admin',
        email: 'venueadmin@eventx.com',
        password: 'password123',
        role: 'venue_admin',
        emailVerified: true
    },
    {
        name: 'Organizer User',
        email: 'organizer@eventx.com',
        password: 'password123',
        role: 'organizer',
        emailVerified: true
    },
    {
        name: 'Regular User',
        email: 'user@eventx.com',
        password: 'user1234',
        role: 'user',
        emailVerified: true
    }
];

const seedUsers = async () => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx-studio';
            await mongoose.connect(mongoURI);
            logger.info('MongoDB connected for seeding');
        }

        for (const userData of demoUsers) {
            let user = await User.findOne({ email: userData.email });
            if (!user) {
                user = new User(userData);
                await user.save();
                logger.info(`Created demo user: ${userData.email} (${userData.role})`);
            } else {
                // Update credentials and role if they already exist
                user.password = userData.password;
                user.role = userData.role;
                user.emailVerified = userData.emailVerified;
                // Deactivate any locks or 2FA for the demo account
                user.isLocked = false;
                user.lockUntil = undefined;
                user.loginAttempts = 0;
                user.twoFactorEnabled = false;
                user.isActive = true;
                await user.save();
                logger.info(`Updated existing demo user: ${userData.email}`);
            }
        }
    } catch (error) {
        logger.error('Error seeding users:', error);
    }
};

if (require.main === module) {
    seedUsers().then(() => {
        logger.info('Seeding finished');
        process.exit(0);
    });
}

module.exports = seedUsers;
