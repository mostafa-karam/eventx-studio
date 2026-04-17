const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  mongoIdParamValidator,
  createCategoryValidator,
  updateCategoryValidator,
} = require('../middleware/validators');
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
router.post('/', authenticate, requireAdmin, createCategoryValidator, asyncHandler(createCategory));

// Get specific category
router.get('/:id', authenticate, mongoIdParamValidator('id', 'Category ID'), asyncHandler(getCategoryById));

// Update category
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  mongoIdParamValidator('id', 'Category ID'),
  updateCategoryValidator,
  asyncHandler(updateCategory)
);

// Delete category (soft delete)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  mongoIdParamValidator('id', 'Category ID'),
  asyncHandler(deleteCategory)
);

module.exports = router;
