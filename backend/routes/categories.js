const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryStats
} = require('../controllers/categoriesController');

// Get all event categories
router.get('/', authenticate, asyncHandler(getCategories));

// Get category statistics (admin only)
router.get('/stats/overview', authenticate, requireAdmin, asyncHandler(getCategoryStats));

// Create new category
router.post('/', authenticate, requireAdmin, asyncHandler(createCategory));

// Get specific category
router.get('/:id', authenticate, asyncHandler(getCategoryById));

// Update category
router.put('/:id', authenticate, requireAdmin, asyncHandler(updateCategory));

// Delete category (soft delete)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(deleteCategory));

module.exports = router;
