const Hall = require('../models/Hall');
const HallBooking = require('../models/HallBooking');
const logger = require('../utils/logger');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all halls with optional filters
// @access  Public (guests see active halls only; venue_admin/admin see all)
exports.getHalls = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 12, 100);
        const skip = (page - 1) * limit;

        // Build query
        let query = {};

        // Filter by specific IDs
        if (req.query.ids) {
            const idsList = req.query.ids.split(',');
            query._id = { $in: idsList };
        }

        // Filter by status (default: only active halls for non-admin/venue_admin users)
        if (req.query.status) {
            if (req.user && (req.user.role === 'admin' || req.user.role === 'venue_admin')) {
                query.status = req.query.status;
            } else {
                query.status = 'active'; // force active for non-privileged users
            }
        } else if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'venue_admin')) {
            query.status = 'active';
        }

        // Filter by capacity range
        if (req.query.minCapacity || req.query.maxCapacity) {
            query.capacity = {};
            if (req.query.minCapacity) query.capacity.$gte = parseInt(req.query.minCapacity);
            if (req.query.maxCapacity) query.capacity.$lte = parseInt(req.query.maxCapacity);
        }

        // Filter by equipment
        if (req.query.equipment) {
            const equipmentArr = req.query.equipment.split(',');
            query.equipment = { $all: equipmentArr };
        }

        // Search by name
        if (req.query.search) {
            query.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
        }

        // Sort options
        let sort = { name: 1 };
        if (req.query.sort === 'capacity-asc') sort = { capacity: 1 };
        else if (req.query.sort === 'capacity-desc') sort = { capacity: -1 };
        else if (req.query.sort === 'price-asc') sort = { hourlyRate: 1 };
        else if (req.query.sort === 'price-desc') sort = { hourlyRate: -1 };
        else if (req.query.sort === 'newest') sort = { createdAt: -1 };

        const halls = await Hall.find(query)
            .populate('createdBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Hall.countDocuments(query);

        res.json({
            success: true,
            data: {
                halls,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        logger.error('Get halls error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching halls'
        });
    }
};

// @desc    Get single hall by ID
// @access  Private (all authenticated users)
exports.getHallById = async (req, res) => {
    try {
        const hall = await Hall.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        res.json({
            success: true,
            data: { hall }
        });
    } catch (error) {
        logger.error('Get hall error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while fetching hall'
        });
    }
};

// @desc    Get hall availability for a date range
// @access  Private (all authenticated users)
exports.getHallAvailability = async (req, res) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        // Get approved bookings for this hall within the date range
        const { from, to } = req.query;

        const startDate = from ? new Date(from) : new Date();
        const endDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: next 30 days

        const bookings = await HallBooking.find({
            hall: req.params.id,
            status: 'approved',
            startDate: { $lt: endDate },
            endDate: { $gt: startDate }
        })
            .populate('organizer', 'name')
            .populate('event', 'title')
            .select('startDate endDate organizer event status')
            .sort({ startDate: 1 });

        res.json({
            success: true,
            data: {
                hall: {
                    _id: hall._id,
                    name: hall.name,
                    capacity: hall.capacity,
                    status: hall.status
                },
                bookings,
                dateRange: { from: startDate, to: endDate }
            }
        });
    } catch (error) {
        logger.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching availability'
        });
    }
};

// @desc    Create a new hall
// @access  Private (venue_admin, admin)
exports.createHall = async (req, res) => {
    try {
        const hallData = {
            ...req.body,
            createdBy: req.user._id
        };

        const hall = new Hall(hallData);
        await hall.save();

        const populatedHall = await Hall.findById(hall._id)
            .populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Hall created successfully',
            data: { hall: populatedHall }
        });
    } catch (error) {
        logger.error('Create hall error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A hall with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while creating hall'
        });
    }
};

// @desc    Update a hall
// @access  Private (venue_admin, admin)
exports.updateHall = async (req, res) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        // Update fields
        const allowedFields = [
            'name', 'description', 'capacity', 'equipment', 'hourlyRate',
            'dailyRate', 'images', 'status', 'location', 'amenities', 'rules'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                hall[field] = req.body[field];
            }
        });

        await hall.save();

        const populatedHall = await Hall.findById(hall._id)
            .populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Hall updated successfully',
            data: { hall: populatedHall }
        });
    } catch (error) {
        logger.error('Update hall error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Hall not found' });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating hall'
        });
    }
};

// @desc    Delete a hall
// @access  Private (admin only)
exports.deleteHall = async (req, res) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        // Check for active bookings before deleting
        const activeBookings = await HallBooking.countDocuments({
            hall: req.params.id,
            status: { $in: ['pending', 'approved'] },
            endDate: { $gt: new Date() }
        });

        if (activeBookings > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete hall with ${activeBookings} active/pending booking(s). Cancel them first.`
            });
        }

        await Hall.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Hall deleted successfully'
        });
    } catch (error) {
        logger.error('Delete hall error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting hall'
        });
    }
};
