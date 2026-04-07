const logger = require('../utils/logger');
const couponsService = require('../services/couponsService');

// @desc    List all coupons (admin)
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
    try {
        const result = await couponsService.getCoupons(req.query);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Get coupons error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Validate & apply a coupon code (public — call before checkout)
// @access  Private
exports.validateCoupon = async (req, res) => {
    try {
        const result = await couponsService.validateCoupon(req.body.code, req.body.eventId, req.body.amount);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Validate coupon error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a coupon (admin)
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
    try {
        const coupon = await couponsService.createCoupon(req.body, req.user._id, req);
        res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        logger.error('Create coupon error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update a coupon (admin)
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await couponsService.updateCoupon(req.params.id, req.body);
        res.json({ success: true, message: 'Coupon updated', data: { coupon } });
    } catch (error) {
        logger.error('Update coupon error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete a coupon (admin)
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
    try {
        await couponsService.deleteCoupon(req.params.id);
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        logger.error('Delete coupon error: ' + error.message);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
