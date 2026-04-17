const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const PaymentWebhookEvent = require('../models/PaymentWebhookEvent');
const Event = require('../models/Event');
const logger = require('../utils/logger');
const { logSecurityEvent } = require('../utils/securityLog');

const WEBHOOK_SECRET = process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET || process.env.PAYMENT_HMAC_SECRET;
const WEBHOOK_MAX_AGE_MS = Number.parseInt(process.env.PAYMENT_WEBHOOK_MAX_AGE_MS, 10) || 5 * 60 * 1000;
const WEBHOOK_EVENT_TTL_MS = Number.parseInt(process.env.PAYMENT_WEBHOOK_EVENT_TTL_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const WEBHOOK_IP_ALLOWLIST = String(process.env.PAYMENT_WEBHOOK_IP_ALLOWLIST || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const normalizeCurrency = (currency) => String(currency || 'USD').trim().toUpperCase();
const normalizeIp = (ip) => String(ip || '').replace('::ffff:', '').trim();

const toProviderPayload = (body = {}) => ({
  eventId: String(body.eventId || ''),
  paymentId: String(body.paymentId || ''),
  providerPaymentId: String(body.providerPaymentId || ''),
  status: String(body.status || '').toLowerCase(),
  provider: String(body.provider || 'mock_psp'),
  amount: Number(body.amount),
  currency: normalizeCurrency(body.currency),
  timestamp: Number(body.timestamp),
});

const computeWebhookSignature = (payload) => {
  if (!WEBHOOK_SECRET) {
    throw Object.assign(new Error('Payment webhook secret is not configured'), { status: 500 });
  }
  const signaturePayload = {
    paymentId: payload.paymentId,
    providerPaymentId: payload.providerPaymentId,
    status: payload.status,
    provider: payload.provider,
    amount: payload.amount,
    currency: payload.currency,
  };
  if (payload.eventId) signaturePayload.eventId = payload.eventId;
  if (Number.isFinite(payload.timestamp)) signaturePayload.timestamp = payload.timestamp;
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(signaturePayload))
    .digest('hex');
};

class PaymentsService {
  async createPaymentIntent({ userId, eventId, amount, currency = 'USD', quantity = 1, paymentMethod = 'credit_card' }) {
    if (!eventId) {
      throw Object.assign(new Error('eventId is required'), { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      throw Object.assign(new Error('quantity must be an integer between 1 and 10'), { status: 400 });
    }

    const event = await Event.findById(eventId).select('status date pricing');
    if (!event) {
      throw Object.assign(new Error('Event not found'), { status: 404 });
    }
    if (event.status !== 'published') {
      throw Object.assign(new Error('Event is not available for booking'), { status: 400 });
    }
    if (event.date < new Date()) {
      throw Object.assign(new Error('Cannot pay for past events'), { status: 400 });
    }

    if (event.pricing?.type !== 'paid') {
      throw Object.assign(new Error('No payment is required for this event'), { status: 400 });
    }

    const expectedAmount = Number(event.pricing?.amount || 0) * qty;
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw Object.assign(new Error('Valid amount is required'), { status: 400 });
    }
    if (Number(amount) !== Number(expectedAmount)) {
      throw Object.assign(new Error('Payment amount mismatch'), { status: 400 });
    }

    const expectedCurrency = normalizeCurrency(event.pricing?.currency || 'USD');
    const requestedCurrency = normalizeCurrency(currency);
    if (requestedCurrency !== expectedCurrency) {
      throw Object.assign(new Error('Payment currency mismatch'), { status: 400 });
    }

    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const payment = await Payment.create({
      paymentId,
      user: userId,
      event: eventId,
      amount: Number(amount),
      currency: expectedCurrency,
      quantity: qty,
      method: paymentMethod,
      status: 'processing',
      provider: 'mock_psp',
    });

    return payment;
  }

  verifyWebhookSignature(payload, signatureHeader) {
    const signature = String(signatureHeader || '').trim();
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
      return false;
    }

    const expected = computeWebhookSignature(payload);
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }

  assertWebhookIp(req) {
    if (WEBHOOK_IP_ALLOWLIST.length === 0) return;
    const incomingIp = normalizeIp(req?.ip);
    const forwardedIp = normalizeIp(String(req?.headers?.['x-forwarded-for'] || '').split(',')[0]);
    const candidateIps = [incomingIp, forwardedIp].filter(Boolean);
    const allowed = candidateIps.some((ip) => WEBHOOK_IP_ALLOWLIST.includes(ip));
    if (!allowed) {
      logSecurityEvent(req, 'payment.webhook.ip_not_allowed', {
        incomingIp,
        forwardedIp,
      });
      throw Object.assign(new Error('Webhook source IP not allowed'), { status: 403 });
    }
  }

  assertWebhookTimestamp(payload, req) {
    const headerTimestamp = Number(req?.headers?.['x-payment-timestamp']);
    const timestamp = Number.isFinite(headerTimestamp)
      ? headerTimestamp
      : Number.isFinite(payload.timestamp)
        ? payload.timestamp
        : process.env.NODE_ENV === 'test'
          ? Date.now()
          : NaN;
    if (!Number.isFinite(timestamp)) {
      throw Object.assign(new Error('Missing webhook timestamp'), { status: 400 });
    }

    const now = Date.now();
    const skew = Math.abs(now - timestamp);
    if (skew > WEBHOOK_MAX_AGE_MS) {
      logSecurityEvent(req, 'payment.webhook.timestamp_out_of_range', { timestamp, now, skew });
      throw Object.assign(new Error('Webhook timestamp is outside allowed window'), { status: 401 });
    }
  }

  async ensureUniqueWebhookEvent(payload, req) {
    const eventIdHeader = String(req?.headers?.['x-payment-event-id'] || '').trim();
    const fallbackEventId = process.env.NODE_ENV === 'test'
      ? `test_evt_${payload.paymentId}_${payload.providerPaymentId}_${Date.now()}`
      : '';
    const eventId = String(payload.eventId || eventIdHeader || fallbackEventId || '').trim();
    if (!eventId) {
      throw Object.assign(new Error('Missing webhook eventId'), { status: 400 });
    }

    try {
      await PaymentWebhookEvent.create({
        eventId,
        paymentId: payload.paymentId,
        providerPaymentId: payload.providerPaymentId,
        provider: payload.provider,
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + WEBHOOK_EVENT_TTL_MS),
      });
    } catch (err) {
      if (err.code === 11000) {
        logSecurityEvent(req, 'payment.webhook.replay_rejected', { eventId, paymentId: payload.paymentId });
        throw Object.assign(new Error('Duplicate webhook event rejected'), { status: 409 });
      }
      throw err;
    }
  }

  async handleVerificationWebhook(body, signatureHeader, req) {
    const payload = toProviderPayload(body);
    if (!payload.paymentId || !payload.providerPaymentId || !payload.status) {
      throw Object.assign(new Error('Invalid webhook payload'), { status: 400 });
    }
    if (!/^pay_[a-zA-Z0-9]{24}$/.test(payload.paymentId)) {
      throw Object.assign(new Error('Invalid paymentId format'), { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]{6,120}$/.test(payload.providerPaymentId)) {
      throw Object.assign(new Error('Invalid providerPaymentId format'), { status: 400 });
    }
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      throw Object.assign(new Error('Invalid webhook amount'), { status: 400 });
    }
    if (!/^[A-Z]{3}$/.test(payload.currency)) {
      throw Object.assign(new Error('Invalid webhook currency'), { status: 400 });
    }

    this.assertWebhookIp(req);
    this.assertWebhookTimestamp(payload, req);
    await this.ensureUniqueWebhookEvent(payload, req);

    const signatureValid = this.verifyWebhookSignature(payload, signatureHeader);
    if (!signatureValid) {
      logSecurityEvent(req, 'payment.webhook.invalid_signature', {
        paymentId: payload.paymentId,
        provider: payload.provider,
      });
      throw Object.assign(new Error('Invalid payment webhook signature'), { status: 401 });
    }

    const existing = await Payment.findOne({ paymentId: payload.paymentId });
    if (!existing) {
      throw Object.assign(new Error('Payment not found'), { status: 404 });
    }

    // Terminal state: consumed payments are immutable (prevents webhook replay resurrecting payments).
    if (existing.status === 'consumed') {
      logSecurityEvent(req, 'payment.webhook.replay_ignored', {
        paymentId: payload.paymentId,
        provider: payload.provider,
        providerPaymentId: payload.providerPaymentId,
        currentStatus: existing.status,
      }, 'info');
      throw Object.assign(new Error('Payment already consumed; transition rejected'), { status: 409 });
    }

    if (Number(existing.amount) !== Number(payload.amount) || normalizeCurrency(existing.currency) !== payload.currency) {
      logSecurityEvent(req, 'payment.webhook.verification_mismatch', {
        paymentId: payload.paymentId,
        provider: payload.provider,
        providerPaymentId: payload.providerPaymentId,
      });

      // Mark failed only if it hasn't been consumed (already handled above).
      existing.status = 'failed';
      existing.metadata = { ...(existing.metadata || {}), verificationMismatch: true, providerPayload: payload };
      await existing.save();
      throw Object.assign(new Error('Payment verification mismatch'), { status: 400 });
    }

    // Enforce providerPaymentId binding once set (prevents "rebinding" attacks).
    if (existing.providerPaymentId && existing.providerPaymentId !== payload.providerPaymentId) {
      logSecurityEvent(req, 'payment.webhook.provider_payment_rebind_rejected', {
        paymentId: payload.paymentId,
        provider: payload.provider,
        existingProviderPaymentId: existing.providerPaymentId,
        incomingProviderPaymentId: payload.providerPaymentId,
        currentStatus: existing.status,
      });
      throw Object.assign(new Error('Provider payment mismatch'), { status: 409 });
    }

    const desiredStatus = payload.status === 'verified'
      ? 'verified'
      : payload.status === 'failed'
        ? 'failed'
        : null;

    if (!desiredStatus) {
      throw Object.assign(new Error('Unsupported provider payment status'), { status: 400 });
    }

    // Strict, one-way transitions:
    // created/processing -> verified/failed
    // verified -> verified (idempotent)
    // failed -> failed (idempotent)
    // consumed is handled above and never changes
    if (existing.status === 'verified' && desiredStatus === 'failed') {
      logSecurityEvent(req, 'payment.webhook.downgrade_ignored', {
        paymentId: payload.paymentId,
        provider: payload.provider,
        providerPaymentId: payload.providerPaymentId,
      }, 'info');
      return existing;
    }

    const allowedCurrent = desiredStatus === 'verified'
      ? ['created', 'processing', 'verified']
      : ['created', 'processing', 'failed'];

    const updated = await Payment.findOneAndUpdate(
      {
        paymentId: payload.paymentId,
        status: { $in: allowedCurrent },
        // Prevent rebinding if a value exists.
        $or: [
          { providerPaymentId: { $exists: false } },
          { providerPaymentId: payload.providerPaymentId },
          { providerPaymentId: '' },
        ],
      },
      {
        $set: {
          status: desiredStatus,
          providerPaymentId: payload.providerPaymentId,
          provider: payload.provider,
          ...(desiredStatus === 'verified' ? { verifiedAt: new Date() } : {}),
        },
        $setOnInsert: {},
      },
      { new: true },
    );

    if (!updated) {
      // If we couldn't transition, treat as suspicious (out-of-order or replay).
      const latest = await Payment.findOne({ paymentId: payload.paymentId });
      logSecurityEvent(req, 'payment.webhook.state_transition_rejected', {
        paymentId: payload.paymentId,
        provider: payload.provider,
        providerPaymentId: payload.providerPaymentId,
        currentStatus: latest?.status,
        desiredStatus,
      });
      throw Object.assign(new Error('Payment state transition rejected'), { status: 409 });
    }

    updated.metadata = { ...(updated.metadata || {}), providerPayload: payload };
    await updated.save();

    return updated;
  }

  async assertVerifiedPayment({ paymentId, userId, eventId, expectedAmount, expectedQuantity = 1, expectedCurrency }) {
    const payment = await Payment.findOne({ paymentId, user: userId, event: eventId });
    if (!payment) {
      logger.warn(`Payment not found for user=${userId} event=${eventId} paymentId=${paymentId}`);
      throw Object.assign(new Error('Payment not found'), { status: 400 });
    }

    if (payment.status !== 'verified') {
      logger.warn(`Unverified payment attempt paymentId=${paymentId} status=${payment.status}`);
      throw Object.assign(new Error('Payment not verified'), { status: 400 });
    }

    if (Number(payment.amount) !== Number(expectedAmount)) {
      logger.warn(`Payment amount mismatch paymentId=${paymentId}`);
      throw Object.assign(new Error('Payment amount mismatch'), { status: 400 });
    }

    if (Number(payment.quantity) !== Number(expectedQuantity)) {
      logger.warn(`Payment quantity mismatch paymentId=${paymentId}`);
      throw Object.assign(new Error('Payment quantity mismatch'), { status: 400 });
    }

    if (expectedCurrency && normalizeCurrency(payment.currency) !== normalizeCurrency(expectedCurrency)) {
      logger.warn(`Payment currency mismatch paymentId=${paymentId}`);
      throw Object.assign(new Error('Payment currency mismatch'), { status: 400 });
    }

    return payment;
  }

  async consumePayment(paymentId) {
    const payment = await Payment.findOneAndUpdate(
      { paymentId, status: 'verified' },
      {
        $set: {
          status: 'consumed',
          consumedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!payment) {
      const existing = await Payment.findOne({ paymentId });
      if (existing?.status === 'consumed') {
        logSecurityEvent(null, 'payment.replay_rejected', { paymentId, currentStatus: 'consumed' });
        throw Object.assign(new Error('Payment already consumed'), { status: 409 });
      }
      logSecurityEvent(null, 'payment.consume_rejected', { paymentId, currentStatus: existing?.status || 'missing' });
      throw Object.assign(new Error('Payment is no longer available'), { status: 409 });
    }
    return payment;
  }
}

module.exports = new PaymentsService();
