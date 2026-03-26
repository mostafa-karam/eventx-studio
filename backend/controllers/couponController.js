const Coupon = require('../models/Coupon');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// @desc    List all coupons (admin)
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: { coupons } });
    } catch (error) {
        logger.error('Get coupons error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Validate & apply a coupon code (public — call before checkout)
// @access  Private
exports.validateCoupon = async (req, res) => {
    try {
        const { code, eventId, amount } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });

        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
        if (!coupon || !coupon.isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
        }

        // Check event restriction
        if (coupon.applicableEvents.length > 0 && eventId) {
            const applicable = coupon.applicableEvents.map(id => id.toString()).includes(eventId);
            if (!applicable) {
                return res.status(400).json({ success: false, message: 'This coupon is not valid for this event' });
            }
        }

        // Calculate discount
        let discountAmount = 0;
        const purchaseAmount = Number(amount) || 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.min((purchaseAmount * coupon.discountValue) / 100, purchaseAmount);
        } else {
            discountAmount = Math.min(coupon.discountValue, purchaseAmount);
        }

        res.json({
            success: true,
            data: {
                couponId: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount: Math.round(discountAmount * 100) / 100,
                finalAmount: Math.round((purchaseAmount - discountAmount) * 100) / 100,
            }
        });
    } catch (error) {
        logger.error('Validate coupon error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a coupon (admin)
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
    try {
        const { code, description, discountType, discountValue, maxUses, expiresAt, applicableEvents } = req.body;

        if (!code || !discountType || discountValue === undefined) {
            return res.status(400).json({ success: false, message: 'code, discountType, and discountValue are required' });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase().trim(),
            description,
            discountType,
            discountValue,
            maxUses: maxUses || null,
            expiresAt: expiresAt || null,
            applicableEvents: applicableEvents || [],
            createdBy: req.user._id,
        });

        await AuditLog.create({ actor: req.user._id, action: 'create', resource: 'coupon', resourceId: coupon._id, details: { code: coupon.code } });

        res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        logger.error('Create coupon error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update a coupon (admin)
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        const allowed = ['description', 'discountType', 'discountValue', 'maxUses', 'expiresAt', 'isActive', 'applicableEvents'];
        allowed.forEach(field => { if (req.body[field] !== undefined) coupon[field] = req.body[field]; });

        await coupon.save();
        res.json({ success: true, message: 'Coupon updated', data: { coupon } });
    } catch (error) {
        logger.error('Update coupon error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete a coupon (admin)
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        await coupon.deleteOne();
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        logger.error('Delete coupon error: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
