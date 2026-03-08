const SupportTicket = require('../models/SupportTicket');
const logger = require('../utils/logger');

// @desc    Get all support tickets for the authenticated user
// @access  Private
exports.getTickets = async (req, res) => {
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
        logger.error('Error fetching support tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support tickets'
        });
    }
};

// @desc    Create a new support ticket
// @access  Private
exports.createTicket = async (req, res) => {
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
        logger.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support ticket'
        });
    }
};

// @desc    Get a specific support ticket
// @access  Private
exports.getTicketById = async (req, res) => {
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
        logger.error('Error fetching support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support ticket'
        });
    }
};

// @desc    Add a response to a support ticket
// @access  Private
exports.addTicketResponse = async (req, res) => {
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
        logger.error('Error adding response to support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add response'
        });
    }
};

// @desc    Update support ticket status
// @access  Private (staff)
exports.updateTicketStatus = async (req, res) => {
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
        logger.error('Error updating support ticket status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket status'
        });
    }
};
