const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

// ─── Global Search ──────────────────────────────────────────────────
// GET /api/search?q=<query>&type=all|events|halls
router.get('/', globalSearch);

module.exports = router;
