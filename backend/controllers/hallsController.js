const logger = require('../utils/logger');
const hallsService = require('../services/hallsService');

// @desc    Get all halls with optional filters
// @access  Public (guests see active halls only; venue_admin/admin see all)
exports.getHalls = async (req, res) => {
    try {
        const result = await hallsService.getHalls(req.query, req.user);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get halls error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching halls' });
    }
};

// @desc    Get single hall by ID
// @access  Private (all authenticated users)
exports.getHallById = async (req, res) => {
    try {
        const hall = await hallsService.getHallById(req.params.id);
        res.json({ success: true, data: { hall } });
    } catch (error) {
        logger.error('Get hall error:', error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Hall not found' });
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while fetching hall' });
    }
};

// @desc    Get hall availability for a date range
// @access  Private (all authenticated users)
exports.getHallAvailability = async (req, res) => {
    try {
        const result = await hallsService.getHallAvailability(req.params.id, req.query);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get availability error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while fetching availability' });
    }
};

// @desc    Create a new hall
// @access  Private (venue_admin, admin)
exports.createHall = async (req, res) => {
    try {
        const hall = await hallsService.createHall(req.body, req.user._id);
        res.status(201).json({ success: true, message: 'Hall created successfully', data: { hall } });
    } catch (error) {
        logger.error('Create hall error:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors });
        }
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'A hall with this name already exists' });
        res.status(500).json({ success: false, message: 'Server error while creating hall' });
    }
};

// @desc    Update a hall
// @access  Private (venue_admin, admin)
exports.updateHall = async (req, res) => {
    try {
        const hall = await hallsService.updateHall(req.params.id, req.body);
        res.json({ success: true, message: 'Hall updated successfully', data: { hall } });
    } catch (error) {
        logger.error('Update hall error:', error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, message: 'Hall not found' });
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors });
        }
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while updating hall' });
    }
};

// @desc    Delete a hall
// @access  Private (admin only)
exports.deleteHall = async (req, res) => {
    try {
        await hallsService.deleteHall(req.params.id);
        res.json({ success: true, message: 'Hall deleted successfully' });
    } catch (error) {
        logger.error('Delete hall error:', error);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error while deleting hall' });
    }
};
