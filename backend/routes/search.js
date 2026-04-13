const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

// ─── Global Search ──────────────────────────────────────────────────
// GET /api/search?q=<query>&type=all|events|halls
router.get('/', asyncHandler(globalSearch));

module.exports = router;
