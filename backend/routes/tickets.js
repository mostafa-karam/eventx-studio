const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ticketsController = require('../controllers/ticketsController');

const router = express.Router();

router.post('/book', authenticate, ticketsController.bookTicket);
router.post('/book-multi', authenticate, ticketsController.bookMultiTickets);
router.get('/my-tickets', authenticate, ticketsController.getMyTickets);
router.get('/admin', authenticate, requireAdmin, ticketsController.getTicketsAdmin);
router.get('/admin/orphans', authenticate, requireAdmin, ticketsController.getOrphanTickets);
router.post('/admin/orphans/:id/assign', authenticate, requireAdmin, ticketsController.assignOrphanTicket);
router.post('/admin/orphans/:id/cancel', authenticate, requireAdmin, ticketsController.cancelOrphanTicket);
router.get('/:id', authenticate, ticketsController.getTicketById);
router.put('/:id/cancel', authenticate, ticketsController.cancelTicket);
router.post('/:id/checkin', authenticate, requireAdmin, ticketsController.checkinTicket);
router.get('/event/:eventId', authenticate, requireAdmin, ticketsController.getEventTickets);
router.get('/qr/:qrCode', authenticate, ticketsController.lookupByQR);
router.put('/:id/refund', authenticate, ticketsController.refundTicket);

module.exports = router;