const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const { authenticate } = require('../middleware/auth');

// Get all support tickets for the authenticated user
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id })
      .populate('assignedTo', 'name email')
      .populate('responses.userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        assignedTo: ticket.assignedTo,
        attachments: ticket.attachments,
        responses: ticket.responses
      }))
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets'
    });
  }
});

// Create a new support ticket
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const { subject, description, category, priority, attachments } = req.body;

    const ticket = new SupportTicket({
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      userId: req.user.id,
      attachments: attachments || []
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        attachments: ticket.attachments
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

// Get a specific support ticket
router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
    .populate('assignedTo', 'name email')
    .populate('responses.userId', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        assignedTo: ticket.assignedTo,
        attachments: ticket.attachments,
        responses: ticket.responses
      }
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket'
    });
  }
});

// Add a response to a support ticket
router.post('/tickets/:id/responses', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    ticket.responses.push({
      message,
      userId: req.user.id,
      isStaff: false
    });

    // Update ticket status if it was resolved/closed
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Error adding response to support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
});

// Update support ticket status (for staff)
router.patch('/tickets/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Only allow users to update their own tickets or staff to update any
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    ticket.status = status;
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    console.error('Error updating support ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status'
    });
  }
});

module.exports = router;
