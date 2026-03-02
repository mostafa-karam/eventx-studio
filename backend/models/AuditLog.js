const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    actorName: String,
    actorRole: String,
    action: {
        type: String,
        required: true,
        enum: [
            'user.create', 'user.update', 'user.deactivate', 'user.activate', 'user.role_change',
            'event.create', 'event.update', 'event.delete', 'event.publish', 'event.cancel',
            'hall.create', 'hall.update', 'hall.delete',
            'hall_booking.create', 'hall_booking.approve', 'hall_booking.reject', 'hall_booking.cancel',
            'ticket.purchase', 'ticket.cancel', 'ticket.refund',
            'auth.login', 'auth.logout', 'auth.password_reset', 'auth.role_upgrade_approve',
        ],
    },
    resource: {
        type: String,
        required: true,
        enum: ['User', 'Event', 'Hall', 'HallBooking', 'Ticket', 'Auth'],
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ip: String,
    userAgent: String,
}, {
    timestamps: true,
});

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
