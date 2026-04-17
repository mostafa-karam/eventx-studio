const mongoose = require('mongoose');

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    signatureDigest: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { versionKey: false },
);

paymentWebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
paymentWebhookEventSchema.index({ provider: 1, eventId: 1, signatureDigest: 1 }, { unique: true });

module.exports = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema);

