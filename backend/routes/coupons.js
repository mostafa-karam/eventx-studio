const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getCoupons, validateCoupon, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');

const router = express.Router();

// POST /api/coupons/validate — any logged-in user can validate before checkout
router.post('/validate', authenticate, validateCoupon);

// Admin-only CRUD
router.get('/', authenticate, requireAdmin, getCoupons);
router.post('/', authenticate, requireAdmin, createCoupon);
router.put('/:id', authenticate, requireAdmin, updateCoupon);
router.delete('/:id', authenticate, requireAdmin, deleteCoupon);

module.exports = router;
