const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    alias: 'actor',
  },
  actorName: String,
  actorRole: String,
  action: {
    type: String,
    required: true,
    enum: [
      'user.create',
      'user.update',
      'user.deactivate',
      'user.activate',
      'user.role_change',
      'event.create',
      'event.update',
      'event.delete',
      'event.publish',
      'event.cancel',
      'hall.create',
      'hall.update',
      'hall.delete',
      'hall_booking.create',
      'hall_booking.approve',
      'hall_booking.reject',
      'hall_booking.cancel',
      'ticket.purchase',
      'ticket.cancel',
      'ticket.refund',
      'booking.initiate',
      'booking.confirm',
      'coupon.create',
      'coupon.update',
      'coupon.delete',
      'auth.login',
      'auth.logout',
      'auth.password_reset',
      'auth.password_changed',
      'auth.role_upgrade_approve',
      'auth.account_deleted',
    ],
  },
  resource: {
    type: String,
    required: true,
    enum: ['User', 'Event', 'Hall', 'HallBooking', 'Ticket', 'Coupon', 'Auth', 'Booking'],
  },
  resourceId: {
    type: mongoose.Schema.Types.Mixed,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    alias: 'ip',
  },
  userAgent: String,
  requestId: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
