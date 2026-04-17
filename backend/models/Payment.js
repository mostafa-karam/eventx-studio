const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    default: 'USD',
    maxlength: 3,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
    default: 'credit_card',
  },
  status: {
    type: String,
    enum: ['created', 'processing', 'verified', 'failed', 'consumed'],
    default: 'created',
    index: true,
  },
  provider: {
    type: String,
    trim: true,
    default: 'mock_psp',
  },
  providerPaymentId: {
    type: String,
    trim: true,
    index: true,
  },
  verifiedAt: Date,
  consumedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

paymentSchema.index({ user: 1, event: 1, status: 1, createdAt: -1 });
// Prevent provider-side payment IDs from being re-attached to a different Payment record.
// Uses a partial index so empty/unset values don't violate uniqueness.
paymentSchema.index(
  { provider: 1, providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerPaymentId: { $exists: true, $type: 'string', $ne: '' } },
  },
);

module.exports = mongoose.model('Payment', paymentSchema);
