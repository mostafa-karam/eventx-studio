const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
    },
    description: { type: String, trim: true },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
        default: 'percentage',
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount must be positive'],
    },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null }, // null = no expiry
    isActive: { type: Boolean, default: true },
    applicableEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // empty = all events
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Computed: is this coupon still valid?
couponSchema.virtual('isValid').get(function () {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;
    return true;
});

couponSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
