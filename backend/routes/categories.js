const express = require('express');
const router = express.Router();
const EventCategory = require('../models/EventCategory');
const { authenticate } = require('../middleware/auth');

// Get all event categories
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await EventCategory.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      categories: categories.map(category => ({
        id: category._id,
        name: category.name,
        description: category.description,
        color: category.color,
        emoji: category.emoji,
        eventCount: category.eventCount,
        isActive: category.isActive,
        createdAt: category.createdAt,
        createdBy: category.createdBy
      }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Create new category
router.post('/', authenticate, async (req, res) => {
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
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// Get specific category
router.get('/:id', authenticate, async (req, res) => {
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
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

// Update category
router.put('/:id', authenticate, async (req, res) => {
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
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// Delete category (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
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
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

// Get category statistics
router.get('/stats/overview', authenticate, async (req, res) => {
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

    res.json({
      success: true,
      stats: {
        totalCategories,
        recentCategories,
        topCategories: topCategories.map(cat => ({
          id: cat._id,
          name: cat.name,
          eventCount: cat.eventCount,
          emoji: cat.emoji
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics'
    });
  }
});

module.exports = router;
