const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
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

// Create new category
router.post('/', authenticate, asyncHandler(createCategory));

// Get specific category
router.get('/:id', authenticate, asyncHandler(getCategoryById));

// Update category
router.put('/:id', authenticate, asyncHandler(updateCategory));

// Delete category (soft delete)
router.delete('/:id', authenticate, asyncHandler(deleteCategory));

// Get category statistics
router.get('/stats/overview', authenticate, asyncHandler(getCategoryStats));

module.exports = router;
