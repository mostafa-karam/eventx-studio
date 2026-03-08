const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getTickets,
  createTicket,
  getTicketById,
  addTicketResponse,
  updateTicketStatus
} = require('../controllers/supportController');

// Get all support tickets for the authenticated user
router.get('/tickets', authenticate, getTickets);

// Create a new support ticket
router.post('/tickets', authenticate, createTicket);

// Get a specific support ticket
router.get('/tickets/:id', authenticate, getTicketById);

// Add a response to a support ticket
router.post('/tickets/:id/responses', authenticate, addTicketResponse);

// Update support ticket status (for staff)
router.patch('/tickets/:id/status', authenticate, updateTicketStatus);

module.exports = router;
