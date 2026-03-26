const EventCategory = require('../models/EventCategory');
const logger = require('../utils/logger');

// @desc    Get all event categories
// @access  Private
exports.getCategories = async (req, res) => {
    try {
        const categories = await EventCategory.find({ isActive: true })
            .populate('createdBy', 'name email')
            .sort({ name: 1 });

        // Dynamically calculate event counts
        const Event = require('../models/Event');
        const eventCounts = await Event.aggregate([
            { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
        ]);
        
        const countMap = {};
        eventCounts.forEach(e => {
            if (e._id) countMap[e._id.toString().trim().toLowerCase()] = e.count;
        });

        res.json({
            success: true,
            categories: categories.map(category => {
                const catName = category.name.toString().trim().toLowerCase();
                return {
                    id: category._id,
                    name: category.name,
                    description: category.description,
                    color: category.color,
                    emoji: category.emoji,
                    eventCount: countMap[catName] || 0,
                    isActive: category.isActive,
                    createdAt: category.createdAt,
                    createdBy: category.createdBy
                };
            })
        });
    } catch (error) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

// @desc    Create new category
// @access  Private
exports.createCategory = async (req, res) => {
    try {
        const { name, description, color, emoji } = req.body;

        const category = new EventCategory({
            name,
            description,
            color: color || '#3B82F6',
            emoji: emoji || '📅',
            createdBy: req.user.id
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: {
                id: category._id,
                name: category.name,
                description: category.description,
                color: category.color,
                emoji: category.emoji,
                eventCount: category.eventCount,
                isActive: category.isActive,
                createdAt: category.createdAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }
        logger.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

// @desc    Get specific category
// @access  Private
exports.getCategoryById = async (req, res) => {
    try {
        const category = await EventCategory.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            category: {
                id: category._id,
                name: category.name,
                description: category.description,
                color: category.color,
                emoji: category.emoji,
                eventCount: category.eventCount,
                isActive: category.isActive,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt,
                createdBy: category.createdBy
            }
        });
    } catch (error) {
        logger.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

// @desc    Update category
// @access  Private
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, color, emoji, isActive } = req.body;

        const category = await EventCategory.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Update fields
        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (color) category.color = color;
        if (emoji) category.emoji = emoji;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: {
                id: category._id,
                name: category.name,
                description: category.description,
                color: category.color,
                emoji: category.emoji,
                eventCount: category.eventCount,
                isActive: category.isActive,
                updatedAt: category.updatedAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }
        logger.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

// @desc    Delete category (soft delete)
// @access  Private
exports.deleteCategory = async (req, res) => {
    try {
        const category = await EventCategory.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Soft delete by setting isActive to false
        category.isActive = false;
        await category.save();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

// @desc    Get category statistics
// @access  Private
exports.getCategoryStats = async (req, res) => {
    try {
        const totalCategories = await EventCategory.countDocuments({ isActive: true });
        const recentCategories = await EventCategory.countDocuments({
            isActive: true,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        const topCategories = await EventCategory.find({ isActive: true })
            .sort({ eventCount: -1 })
            .limit(5)
            .select('name eventCount emoji');

        const Event = require('../models/Event');
        const eventCounts = await Event.aggregate([
            { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
        ]);
        const countMap = {};
        eventCounts.forEach(e => { if (e._id) countMap[e._id.toString().trim().toLowerCase()] = e.count; });

        const topCategoriesWithCounts = topCategories.map(cat => {
            const catName = cat.name.toString().trim().toLowerCase();
            return {
                id: cat._id,
                name: cat.name,
                eventCount: countMap[catName] || 0,
                emoji: cat.emoji
            };
        });

        res.json({
            success: true,
            stats: {
                totalCategories,
                recentCategories,
                topCategories: topCategoriesWithCounts.sort((a,b) => b.eventCount - a.eventCount)
            }
        });
    } catch (error) {
        logger.error('Error fetching category stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category statistics'
        });
    }
};
