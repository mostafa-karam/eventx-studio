/**
 * Coupons Service
 *
 * Encapsulates all coupon-related database operations.
 * Controllers should delegate to this service instead of
 * querying Mongoose models directly.
 */

const Coupon = require('../models/Coupon');
const auditService = require('./auditService');
const { ACTIONS, RESOURCES } = require('../utils/auditConstants');

class CouponsService {
  /**
   * Get paginated list of coupons.
   */
  async getCoupons({ page = 1, limit = 20 } = {}) {
    page = parseInt(page) || 1;
    limit = Math.min(parseInt(limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      Coupon.find()
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(),
    ]);

    return {
      coupons,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
    };
  }

  /**
   * Validate and calculate discount for a coupon code.
   */
  async validateCoupon(code, eventId, amount) {
    if (!code) throw Object.assign(new Error('Coupon code is required'), { status: 400 });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon || !coupon.isValid) {
      throw Object.assign(new Error('Invalid or expired coupon code'), { status: 400 });
    }

    // Check event restriction
    if (coupon.applicableEvents.length > 0 && eventId) {
      const applicable = coupon.applicableEvents.map(id => id.toString()).includes(eventId);
      if (!applicable) {
        throw Object.assign(new Error('This coupon is not valid for this event'), { status: 400 });
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

    return {
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round((purchaseAmount - discountAmount) * 100) / 100,
    };
  }

  /**
   * Create a new coupon.
   */
  async createCoupon({ code, description, discountType, discountValue, maxUses, expiresAt, applicableEvents }, creatorId, req) {
    if (!code || !discountType || discountValue === undefined) {
      throw Object.assign(new Error('code, discountType, and discountValue are required'), { status: 400 });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      applicableEvents: applicableEvents || [],
      createdBy: creatorId,
    });

    await auditService.log({
      req,
      actor: creatorId,
      action: ACTIONS.COUPON_CREATE,
      resource: RESOURCES.COUPON,
      resourceId: coupon._id,
      details: { code: coupon.code },
    });

    return coupon;
  }

  /**
   * Update a coupon by ID.
   */
  async updateCoupon(couponId, updateData) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw Object.assign(new Error('Coupon not found'), { status: 404 });

    const allowed = ['description', 'discountType', 'discountValue', 'maxUses', 'expiresAt', 'isActive', 'applicableEvents'];
    allowed.forEach(field => {
      if (updateData[field] !== undefined) coupon[field] = updateData[field];
    });

    await coupon.save();
    return coupon;
  }

  /**
   * Delete a coupon by ID.
   */
  async deleteCoupon(couponId) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw Object.assign(new Error('Coupon not found'), { status: 404 });
    await coupon.deleteOne();
    return true;
  }
}

module.exports = new CouponsService();
