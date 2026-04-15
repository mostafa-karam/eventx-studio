const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const { authenticate, requireAdmin } = require('../middleware/auth');
const { createCouponValidator, updateCouponValidator, validateCouponValidator } = require('../middleware/validators');
const { getCoupons, validateCoupon, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');

const router = express.Router();

// POST /api/coupons/validate — any logged-in user can validate before checkout
router.post('/validate', authenticate, validateCouponValidator, asyncHandler(validateCoupon));

// Admin-only CRUD
router.get('/', authenticate, requireAdmin, asyncHandler(getCoupons));
router.post('/', authenticate, requireAdmin, createCouponValidator, asyncHandler(createCoupon));
router.put('/:id', authenticate, requireAdmin, updateCouponValidator, asyncHandler(updateCoupon));
router.delete('/:id', authenticate, requireAdmin, asyncHandler(deleteCoupon));

module.exports = router;
