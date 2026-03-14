/**
 * Database Seeder — Development Only
 *
 * Creates demo accounts for local development.
 * Passwords meet the application's password strength policy.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('./logger');

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'admin@eventx.dev',
    password: 'Admin@Dev2024!',
    role: 'admin',
  },
  {
    name: 'Venue Admin',
    email: 'venue@eventx.dev',
    password: 'Venue@Dev2024!',
    role: 'venue_admin',
  },
  {
    name: 'Event Organizer',
    email: 'organizer@eventx.dev',
    password: 'Organizer@Dev2024!',
    role: 'organizer',
  },
  {
    name: 'Regular User',
    email: 'user@eventx.dev',
    password: 'User@Dev2024!',
    role: 'user',
  },
];

async function seedUsers() {
  // Guard: only seed in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Seed script skipped: NODE_ENV is production');
    return;
  }

  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      // Only update if it's a dev seed user (don't touch real users)
      if (existing.name === userData.name) {
        existing.role = userData.role;
        existing.isActive = true;
        existing.emailVerified = true;
        await existing.save();
        logger.info(`[Seed] Updated existing dev user: ${userData.email} (${userData.role})`);
      }
      continue;
    }

    const user = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      emailVerified: true,
      isActive: true,
    });
    await user.save();
    logger.info(`[Seed] Created dev user: ${userData.email} (${userData.role})`);
  }
}

module.exports = seedUsers;
