/**
 * Database Seeder — Development Only
 *
 * Creates demo accounts for local development.
 * Passwords meet the application's password strength policy.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('./logger');

const getDemoPassword = () => {
  const pw = process.env.DEMO_SEED_PASSWORD;
  if (!pw) {
    throw new Error('Missing DEMO_SEED_PASSWORD. Put it in .env.development (not committed).');
  }
  return pw;
};

const DEMO_USERS = [
  { name: 'Admin User', email: 'admin@eventx.dev', role: 'admin' },
  { name: 'Venue Admin', email: 'venue@eventx.dev', role: 'venue_admin' },
  { name: 'Event Organizer', email: 'organizer@eventx.dev', role: 'organizer' },
  { name: 'Regular User', email: 'user@eventx.dev', role: 'user' },
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
      password: getDemoPassword(),
      role: userData.role,
      emailVerified: true,
      isActive: true,
    });
    await user.save();
    logger.info(`[Seed] Created dev user: ${userData.email} (${userData.role})`);
  }
}

module.exports = seedUsers;
