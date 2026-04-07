const logger = require('../utils/logger');
const User = require('../models/User');
const auditService = require('../services/auditService');
const { sanitizeSearchInput, createSafeRegex } = require('../utils/helpers');
const { ACTIONS, RESOURCES } = require('../utils/auditConstants');

// @desc    Get all users (Admin only)
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        // Build query
        let query = {};

        if (req.query.search) {
            const searchRegex = createSafeRegex(sanitizeSearchInput(req.query.search));
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        // Role filter
        if (req.query.role) {
            query.role = req.query.role;
        }

        // Status filter
        if (req.query.status) {
            query.isActive = req.query.status === 'active';
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        // Get user statistics
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                },
                statistics: stats
            }
        });
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
};

// @desc    Get single user by ID
// @access  Private/Admin
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user
            }
        });
    } catch (error) {
        logger.error('Get user error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while fetching user'
        });
    }
};

// @desc    Update user
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Strict allowlist — prevent admin mass-assignment of sensitive fields
        const ADMIN_ALLOWED_FIELDS = [
            'name', 'email', 'phone', 'age', 'gender', 'interests',
            'location', 'role', 'isActive', 'avatar'
        ];
        const payload = req.validatedBody || req.body;
        const before = {
            role: user.role,
            isActive: user.isActive,
        };

        ADMIN_ALLOWED_FIELDS.forEach(field => {
            if (payload[field] !== undefined) {
                user[field] = payload[field];
            }
        });

        await user.save();

        const changedFields = Object.keys(payload).filter((field) => ADMIN_ALLOWED_FIELDS.includes(field));
        await auditService.log({
            req,
            actor: req.user,
            action: payload.role && payload.role !== before.role ? ACTIONS.USER_ROLE_CHANGE : ACTIONS.USER_UPDATE,
            resource: RESOURCES.USER,
            resourceId: user._id,
            details: {
                changedFields,
                previousRole: before.role,
                newRole: user.role,
                previousStatus: before.isActive,
                newStatus: user.isActive,
            },
        });

        const updatedUser = await User.findById(user._id).select('-password');

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: updatedUser
            }
        });
    } catch (error) {
        logger.error('Update user error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating user'
        });
    }
};

// @desc    Update user status (activate/deactivate)
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.validatedBody || req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active, inactive, or suspended'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = status === 'active';
        await user.save();
        await auditService.log({
            req,
            actor: req.user,
            action: user.isActive ? ACTIONS.USER_ACTIVATE : ACTIONS.USER_DEACTIVATE,
            resource: RESOURCES.USER,
            resourceId: user._id,
            details: { status },
        });

        const updatedUser = await User.findById(user._id).select('-password');

        res.json({
            success: true,
            message: `User ${status} successfully`,
            data: {
                user: updatedUser
            }
        });
    } catch (error) {
        logger.error('Update user status error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating user status'
        });
    }
};

// @desc    Delete user
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't allow deleting the current admin
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        await User.findByIdAndDelete(req.params.id);
        await auditService.log({
            req,
            actor: req.user,
            action: ACTIONS.USER_UPDATE,
            resource: RESOURCES.USER,
            resourceId: req.params.id,
            details: { operation: 'delete' },
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Delete user error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while deleting user'
        });
    }
};


// @desc    Get public organizer profile by ID
// @access  Public
exports.getOrganizerProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name role createdAt') // Only safe fields
            .lean();

        if (!user || user.role !== 'organizer') {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error('Get organizer profile error:', error);

        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching organizer profile'
        });
    }
};
