const express = require('express');

const { authenticate, requireAdmin, requireOrganizer, requireRole } = require('../middleware/auth');
const { bookingLimiter, paymentLimiter } = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');
const { requireHealthyTransactions } = require('../middleware/transactionGuard');
const {
  bookTicketValidator,
  bookMultiTicketsValidator,
} = require('../middleware/validators');
const ticketsController = require('../controllers/ticketsController');

const router = express.Router();

router.post(
  '/book',
  paymentLimiter,
  requireHealthyTransactions,
  authenticate,
  idempotency({ ttlSeconds: 60 * 60, awaitPersist: true }),
  bookTicketValidator,
  ticketsController.bookTicket,
);
router.post(
  '/book-multi',
  bookingLimiter,
  requireHealthyTransactions,
  authenticate,
  idempotency({ ttlSeconds: 60 * 60, awaitPersist: true }),
  bookMultiTicketsValidator,
  ticketsController.bookMultiTickets,
);
router.get('/my-tickets', authenticate, ticketsController.getMyTickets);
router.get('/organizer', authenticate, requireOrganizer, ticketsController.getOrganizerTickets);
router.get('/admin', authenticate, requireAdmin, ticketsController.getTicketsAdmin);
router.get('/admin/orphans', authenticate, requireAdmin, ticketsController.getOrphanTickets);
router.post('/admin/orphans/:id/assign', authenticate, requireAdmin, ticketsController.assignOrphanTicket);
router.post('/admin/orphans/:id/cancel', authenticate, requireAdmin, ticketsController.cancelOrphanTicket);
router.get('/:id', authenticate, ticketsController.getTicketById);
router.put('/:id/cancel', authenticate, ticketsController.cancelTicket);
router.post('/:id/checkin', authenticate, requireRole(['admin', 'organizer']), ticketsController.checkinTicket);
router.get('/event/:eventId', authenticate, requireAdmin, ticketsController.getEventTickets);
router.post('/lookup-qr', authenticate, ticketsController.checkinByQR);
router.put('/:id/refund', authenticate, ticketsController.refundTicket);

module.exports = router;