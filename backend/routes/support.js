const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createSupportTicketValidator } = require('../middleware/validators');
const {
  getTickets,
  createTicket,
  getTicketById,
  addTicketResponse,
  updateTicketStatus
} = require('../controllers/supportController');

// Get all support tickets for the authenticated user
router.get('/tickets', authenticate, asyncHandler(getTickets));

// Create a new support ticket
router.post('/tickets', authenticate, createSupportTicketValidator, asyncHandler(createTicket));

// Get a specific support ticket
router.get('/tickets/:id', authenticate, asyncHandler(getTicketById));

// Add a response to a support ticket
router.post('/tickets/:id/responses', authenticate, asyncHandler(addTicketResponse));

// Update support ticket status (for staff)
router.patch('/tickets/:id/status', authenticate, asyncHandler(updateTicketStatus));

module.exports = router;
