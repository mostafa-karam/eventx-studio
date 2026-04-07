const sanitizeHtml = require('sanitize-html');
const AppError = require('../utils/AppError');

const BLOCKED_KEY_PATTERN = /[$.]/;
const BLOCKED_FIELD_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
const SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'paymentToken',
]);

const SANITIZE_HTML_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const buildPath = (segments) => segments.join('.');

const findSuspiciousField = (value, segments = []) => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = findSuspiciousField(value[index], [...segments, String(index)]);
      if (match) return match;
    }
    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (BLOCKED_FIELD_NAMES.has(key) || BLOCKED_KEY_PATTERN.test(key)) {
      return buildPath([...segments, key]);
    }

    const match = findSuspiciousField(nestedValue, [...segments, key]);
    if (match) return match;
  }

  return null;
};

const sanitizeValue = (value, segments = []) => {
  if (typeof value === 'string') {
    const currentField = segments[segments.length - 1];

    if (SENSITIVE_FIELDS.has(currentField)) {
      return value.replace(/\u0000/g, '');
    }

    return sanitizeHtml(value, SANITIZE_HTML_OPTIONS).replace(/\u0000/g, '');
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, [...segments, String(index)]));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      accumulator[key] = sanitizeValue(nestedValue, [...segments, key]);
      return accumulator;
    }, {});
  }

  return value;
};

const sanitizeRequest = (req, _res, next) => {
  const suspiciousField = findSuspiciousField(req.body)
    || findSuspiciousField(req.query)
    || findSuspiciousField(req.params);

  if (suspiciousField) {
    return next(new AppError(`Invalid request payload. Disallowed field "${suspiciousField}" detected.`, 400));
  }

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);

  return next();
};

module.exports = sanitizeRequest;
