/**
 * Centralized constants for Audit Logging to ensure consistency across controllers and models.
 */
module.exports = {
  ACTIONS: {
    // User actions
    USER_CREATE: 'user.create',
    USER_UPDATE: 'user.update',
    USER_DEACTIVATE: 'user.deactivate',
    USER_ACTIVATE: 'user.activate',
    USER_ROLE_CHANGE: 'user.role_change',
    // FIX H-03 — Add USER_DELETE
    USER_DELETE: 'user.delete',
    
    // Event actions
    EVENT_CREATE: 'event.create',
    EVENT_UPDATE: 'event.update',
    EVENT_DELETE: 'event.delete',
    EVENT_PUBLISH: 'event.publish',
    EVENT_CANCEL: 'event.cancel',
    
    // Hall actions
    HALL_CREATE: 'hall.create',
    HALL_UPDATE: 'hall.update',
    HALL_DELETE: 'hall.delete',
    
    // Hall Booking actions
    HALL_BOOKING_CREATE: 'hall_booking.create',
    HALL_BOOKING_APPROVE: 'hall_booking.approve',
    HALL_BOOKING_REJECT: 'hall_booking.reject',
    HALL_BOOKING_CANCEL: 'hall_booking.cancel',
    
    // Ticket actions
    TICKET_PURCHASE: 'ticket.purchase',
    TICKET_CANCEL: 'ticket.cancel',
    TICKET_REFUND: 'ticket.refund',
    TICKET_ORPHAN_ASSIGN: 'ticket.orphan.assign',
    TICKET_ORPHAN_CANCEL: 'ticket.orphan.cancel',
    BOOKING_INITIATE: 'booking.initiate',
    BOOKING_CONFIRM: 'booking.confirm',
    
    // Coupon actions (New)
    COUPON_CREATE: 'coupon.create',
    COUPON_UPDATE: 'coupon.update',
    COUPON_DELETE: 'coupon.delete',
    
    // Auth actions
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AUTH_PASSWORD_RESET: 'auth.password_reset',
    AUTH_PASSWORD_CHANGED: 'auth.password_changed',
    AUTH_ROLE_UPGRADE_APPROVE: 'auth.role_upgrade_approve',
    AUTH_ACCOUNT_DELETED: 'auth.account_deleted',
  },
  
  RESOURCES: {
    USER: 'User',
    EVENT: 'Event',
    HALL: 'Hall',
    HALL_BOOKING: 'HallBooking',
    TICKET: 'Ticket',
    COUPON: 'Coupon',
    AUTH: 'Auth',
    BOOKING: 'Booking',
  }
};
