const express = require('express');
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
router.get('/', authenticate, getCategories);

// Create new category
router.post('/', authenticate, createCategory);

// Get specific category
router.get('/:id', authenticate, getCategoryById);

// Update category
router.put('/:id', authenticate, updateCategory);

// Delete category (soft delete)
router.delete('/:id', authenticate, deleteCategory);

// Get category statistics
router.get('/stats/overview', authenticate, getCategoryStats);

module.exports = router;
