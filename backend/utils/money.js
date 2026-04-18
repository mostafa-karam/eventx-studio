/**
 * Monetary amounts as integer minor units (e.g. cents for USD/EUR) to avoid float drift
 * in payment verification and booking. Exotic currencies can extend DECIMALS_BY_CURRENCY.
 */

const DEFAULT_DECIMALS = 2;

/** ISO 4217-style: override when minor units ≠ 10^2 (e.g. JPY, BHD). */
const DECIMALS_BY_CURRENCY = {
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

const normalizeCurrency = (currency) => String(currency || 'USD').trim().toUpperCase();

const decimalsForCurrency = (currency) => {
  const c = normalizeCurrency(currency);
  if (Object.prototype.hasOwnProperty.call(DECIMALS_BY_CURRENCY, c)) {
    return DECIMALS_BY_CURRENCY[c];
  }
  return DEFAULT_DECIMALS;
};

/**
 * Convert a decimal amount to integer minor units (half-up rounding).
 * @param {number|string} amount
 * @param {string} currency
 * @returns {number}
 */
const toMinor = (amount, currency) => {
  const d = decimalsForCurrency(currency);
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    throw Object.assign(new Error('Amount must be a finite number'), { status: 400 });
  }
  const factor = 10 ** d;
  return Math.round(n * factor + Number.EPSILON * Math.sign(n));
};

const fromMinor = (minor, currency) => {
  const m = Number(minor);
  if (!Number.isFinite(m)) return NaN;
  const d = decimalsForCurrency(currency);
  return m / 10 ** d;
};

/** Compare two decimal amounts for a currency using minor units. */
const amountsEqualMinor = (a, b, currency) => toMinor(a, currency) === toMinor(b, currency);

/**
 * Resolved minor amount for a Payment document (supports legacy rows without amountMinor).
 */
const paymentAmountMinor = (payment) => {
  if (!payment) return null;
  if (payment.amountMinor != null && Number.isFinite(Number(payment.amountMinor))) {
    return Number(payment.amountMinor);
  }
  return toMinor(payment.amount, payment.currency);
};

/**
 * MongoDB query fragment for Payment: prefer integer amountMinor; fall back to legacy float amount.
 */
const paymentAmountMatchOrLegacy = (expectedMinor, legacyDecimalAmount) => ({
  $or: [
    { amountMinor: expectedMinor },
    {
      $and: [
        { amountMinor: { $exists: false } },
        { amount: Number(legacyDecimalAmount) },
      ],
    },
  ],
});

module.exports = {
  normalizeCurrency,
  decimalsForCurrency,
  toMinor,
  fromMinor,
  amountsEqualMinor,
  paymentAmountMinor,
  paymentAmountMatchOrLegacy,
};
