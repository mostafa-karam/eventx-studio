const {
  body,
  param,
  query,
  validationResult,
  matchedData,
} = require('express-validator');
const { validatePasswordStrength } = require('../utils/authUtils');

const roles = ['user', 'organizer', 'venue_admin', 'admin'];
const publicRegistrationRoles = ['user', 'organizer'];

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => error.msg),
    });
  }

  req.validatedBody = matchedData(req, {
    locations: ['body'],
    includeOptionals: true,
  });
  req.validatedParams = matchedData(req, {
    locations: ['params'],
    includeOptionals: true,
  });
  req.validatedQuery = matchedData(req, {
    locations: ['query'],
    includeOptionals: true,
  });

  return next();
};

const stringField = (field, label, options = {}) => {
  const validator = options.optional ? body(field).optional() : body(field).exists({ values: 'falsy' }).withMessage(`${label} is required`);
  const chain = validator
    .bail()
    .isString()
    .withMessage(`${label} must be a string`)
    .trim();

  if (options.max) {
    chain.isLength({ max: options.max }).withMessage(`${label} cannot exceed ${options.max} characters`);
  }

  if (options.min) {
    chain.isLength({ min: options.min }).withMessage(`${label} must be at least ${options.min} characters`);
  }

  return chain;
};

const mongoIdField = (field, label, options = {}) => {
  const validator = options.optional ? body(field).optional() : body(field).exists({ values: 'falsy' }).withMessage(`${label} is required`);
  return validator
    .bail()
    .isString()
    .withMessage(`${label} must be a string`)
    .bail()
    .isMongoId()
    .withMessage(`${label} must be a valid identifier`);
};

const mongoIdParamValidator = (field = 'id', label = 'Identifier') => [
  param(field)
    .isString()
    .withMessage(`${label} must be a string`)
    .bail()
    .isMongoId()
    .withMessage(`${label} must be a valid identifier`),
  validate,
];

const registerValidator = [
  stringField('name', 'Name', { max: 50 }),
  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .bail()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .custom((value) => {
      const errors = validatePasswordStrength(value);
      if (errors.length > 0) {
        throw new Error(`Password does not meet requirements: ${errors.join(', ')}`);
      }
      return true;
    }),
  body('role')
    .optional()
    .isString()
    .withMessage('Role must be a string')
    .bail()
    .isIn(publicRegistrationRoles)
    .withMessage('Role must be user or organizer'),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  validate,
];

const loginValidator = [
  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .bail()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string'),
  body('twoFactorCode')
    .optional()
    .isString()
    .withMessage('Two-factor code must be a string')
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('Two-factor code must be between 6 and 10 characters'),
  validate,
];

const updateProfileValidator = [
  stringField('name', 'Name', { optional: true, max: 50 }),
  stringField('phone', 'Phone', { optional: true, max: 25 }),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isString()
    .withMessage('Gender must be a string')
    .bail()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Invalid gender value'),
  body('interests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Interests must be an array with at most 20 items'),
  body('interests.*')
    .optional()
    .isString()
    .withMessage('Each interest must be a string')
    .trim()
    .isLength({ max: 40 })
    .withMessage('Each interest must be at most 40 characters'),
  body('avatar')
    .optional()
    .isString()
    .withMessage('Avatar must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Avatar URL cannot exceed 500 characters'),
  body('location')
    .optional()
    .custom((value) => isPlainObject(value))
    .withMessage('Location must be an object'),
  stringField('location.city', 'Location city', { optional: true, max: 100 }),
  stringField('location.state', 'Location state', { optional: true, max: 100 }),
  stringField('location.country', 'Location country', { optional: true, max: 100 }),
  stringField('location.timezone', 'Location timezone', { optional: true, max: 100 }),
  validate,
];

const changePasswordValidator = [
  body('currentPassword')
    .exists({ values: 'falsy' })
    .withMessage('Current password is required')
    .bail()
    .isString()
    .withMessage('Current password must be a string'),
  body('newPassword')
    .exists({ values: 'falsy' })
    .withMessage('New password is required')
    .bail()
    .isString()
    .withMessage('New password must be a string')
    .bail()
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .custom((value) => {
      const errors = validatePasswordStrength(value);
      if (errors.length > 0) {
        throw new Error(`Password does not meet requirements: ${errors.join(', ')}`);
      }
      return true;
    }),
  validate,
];

const createEventValidator = [
  stringField('title', 'Event title', { max: 100 }),
  stringField('description', 'Event description', { max: 2000 }),
  body('category')
    .exists({ values: 'falsy' })
    .withMessage('Category is required')
    .bail()
    .isString()
    .withMessage('Category must be a string')
    .bail()
    .isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'exhibition', 'networking', 'other'])
    .withMessage('Invalid category'),
  body('date')
    .exists({ values: 'falsy' })
    .withMessage('Valid start date is required')
    .bail()
    .isISO8601()
    .withMessage('Valid start date is required')
    .toDate(),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.date && new Date(value) <= new Date(req.body.date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('venue')
    .custom((value) => isPlainObject(value))
    .withMessage('Venue must be an object'),
  stringField('venue.name', 'Venue name', { max: 100 }),
  stringField('venue.address', 'Venue address', { max: 200 }),
  stringField('venue.city', 'Venue city', { max: 100 }),
  stringField('venue.country', 'Venue country', { max: 100 }),
  stringField('venue.state', 'Venue state', { optional: true, max: 100 }),
  body('venue.capacity')
    .exists({ values: 'falsy' })
    .withMessage('Venue capacity is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('seating')
    .custom((value) => isPlainObject(value))
    .withMessage('Seating must be an object'),
  body('seating.totalSeats')
    .exists({ values: 'falsy' })
    .withMessage('Total seats is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('Total seats must be at least 1'),
  body('seating.availableSeats')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available seats must be 0 or greater'),
  body('pricing')
    .optional()
    .custom((value) => value === undefined || isPlainObject(value))
    .withMessage('Pricing must be an object'),
  body('pricing.type')
    .optional()
    .isString()
    .withMessage('Pricing type must be a string')
    .bail()
    .isIn(['free', 'paid'])
    .withMessage('Pricing type must be free or paid'),
  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('pricing.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('tags')
    .optional()
    .isArray({ max: 15 })
    .withMessage('Tags must be an array with at most 15 items'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag must be at most 30 characters'),
  validate,
];

const updateEventValidator = [
  stringField('title', 'Event title', { optional: true, max: 100 }),
  stringField('description', 'Event description', { optional: true, max: 2000 }),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
    .bail()
    .isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'exhibition', 'networking', 'other'])
    .withMessage('Invalid category'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date')
    .toDate(),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .toDate(),
  body('venue')
    .optional()
    .custom((value) => isPlainObject(value))
    .withMessage('Venue must be an object'),
  stringField('venue.name', 'Venue name', { optional: true, max: 100 }),
  stringField('venue.address', 'Venue address', { optional: true, max: 200 }),
  stringField('venue.city', 'Venue city', { optional: true, max: 100 }),
  stringField('venue.country', 'Venue country', { optional: true, max: 100 }),
  body('venue.capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('seating')
    .optional()
    .custom((value) => isPlainObject(value))
    .withMessage('Seating must be an object'),
  body('seating.totalSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total seats must be at least 1'),
  body('seating.availableSeats')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available seats must be 0 or greater'),
  body('pricing')
    .optional()
    .custom((value) => isPlainObject(value))
    .withMessage('Pricing must be an object'),
  body('pricing.type')
    .optional()
    .isString()
    .withMessage('Pricing type must be a string')
    .bail()
    .isIn(['free', 'paid'])
    .withMessage('Pricing type must be free or paid'),
  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('tags')
    .optional()
    .isArray({ max: 15 })
    .withMessage('Tags must be an array with at most 15 items'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag must be at most 30 characters'),
  validate,
];

const createHallValidator = [
  stringField('name', 'Hall name', { max: 100 }),
  body('capacity')
    .exists({ values: 'falsy' })
    .withMessage('Capacity is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('hourlyRate')
    .exists({ values: 'falsy' })
    .withMessage('Hourly rate is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate cannot be negative'),
  validate,
];

const updateHallValidator = [
  stringField('name', 'Hall name', { optional: true, max: 100 }),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate cannot be negative'),
  validate,
];

const createBookingValidator = [
  mongoIdField('hall', 'Hall ID'),
  body('startDate')
    .exists({ values: 'falsy' })
    .withMessage('Valid start date is required')
    .bail()
    .isISO8601()
    .withMessage('Valid start date is required')
    .toDate(),
  body('endDate')
    .exists({ values: 'falsy' })
    .withMessage('Valid end date is required')
    .bail()
    .isISO8601()
    .withMessage('Valid end date is required')
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  stringField('notes', 'Notes', { optional: true, max: 500 }),
  body('event')
    .optional()
    .isString()
    .withMessage('Event must be a string')
    .bail()
    .isMongoId()
    .withMessage('Event must be a valid ID'),
  validate,
];

const confirmBookingValidator = [
  mongoIdField('eventId', 'Event ID'),
  stringField('paymentId', 'Payment ID', { max: 120 }),
  stringField('bookingId', 'Booking ID', { optional: true, max: 120 }),
  stringField('paymentMethod', 'Payment method', { optional: true, max: 50 }),
  stringField('couponCode', 'Coupon code', { optional: true, max: 40 }),
  body('paymentToken')
    .optional()
    .isString()
    .withMessage('Payment token must be a string'),
  validate,
];

const initiateBookingValidator = [
  mongoIdField('eventId', 'Event ID'),
  validate,
];

const roleUpgradeRequestValidator = [
  stringField('reason', 'Reason', { max: 500 }),
  stringField('organizationName', 'Organization name', { max: 150 }),
  validate,
];

const roleUpgradeDecisionValidator = [
  param('userId')
    .isString()
    .withMessage('User ID must be a string')
    .bail()
    .isMongoId()
    .withMessage('User ID must be a valid identifier'),
  body('action')
    .exists({ values: 'falsy' })
    .withMessage('Action is required')
    .bail()
    .isString()
    .withMessage('Action must be a string')
    .bail()
    .isIn(['approve', 'deny'])
    .withMessage('Action must be "approve" or "deny"'),
  validate,
];

const adminUserUpdateValidator = [
  param('id')
    .isString()
    .withMessage('User ID must be a string')
    .bail()
    .isMongoId()
    .withMessage('User ID must be a valid identifier'),
  stringField('name', 'Name', { optional: true, max: 50 }),
  body('email')
    .optional()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  stringField('phone', 'Phone', { optional: true, max: 25 }),
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isString()
    .withMessage('Gender must be a string')
    .bail()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Invalid gender value'),
  body('role')
    .optional()
    .isString()
    .withMessage('Role must be a string')
    .bail()
    .isIn(roles)
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
  body('interests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Interests must be an array with at most 20 items'),
  body('interests.*')
    .optional()
    .isString()
    .withMessage('Each interest must be a string')
    .trim()
    .isLength({ max: 40 })
    .withMessage('Each interest must be at most 40 characters'),
  body('location')
    .optional()
    .custom((value) => isPlainObject(value))
    .withMessage('Location must be an object'),
  stringField('avatar', 'Avatar', { optional: true, max: 500 }),
  validate,
];

const userStatusValidator = [
  param('id')
    .isString()
    .withMessage('User ID must be a string')
    .bail()
    .isMongoId()
    .withMessage('User ID must be a valid identifier'),
  body('status')
    .exists({ values: 'falsy' })
    .withMessage('Status is required')
    .bail()
    .isString()
    .withMessage('Status must be a string')
    .bail()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status. Must be active, inactive, or suspended'),
  validate,
];

const paginationQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  validate,
];

const createSupportTicketValidator = [
  body('subject').isString().trim().isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters'),
  body('description').isString().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('category').isIn(['general', 'technical', 'billing', 'feature-request', 'bug-report']).withMessage('Invalid category'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('attachments').optional().isArray({ max: 5 }).withMessage('Maximum 5 attachments allowed'),
  body('attachments.*').custom((value) => isPlainObject(value)).withMessage('Each attachment must be an object'),
  body('attachments.*.filename').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Attachment filename is required'),
  body('attachments.*.url').isURL({ protocols: ['https'] }).withMessage('Attachment url must be a secure HTTPS URL'),
  body('attachments.*.size').optional().isInt({ min: 0, max: 50 * 1024 * 1024 }).toInt().withMessage('Attachment size must be an integer (max 50MB)'),
  validate,
];

const createCampaignValidator = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('type').isIn(['email', 'sms', 'social', 'push']).withMessage('Invalid campaign type'),
  body('subject').isString().trim().isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
  body('content').isString().trim().isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters'),
  body('targetAudience').optional().isIn(['all', 'registered', 'potential', 'vip', 'custom']).withMessage('Invalid target audience'),
  body('scheduledAt').optional().isISO8601().toDate().withMessage('Valid scheduledAt date required'),
  validate,
];

const createCouponValidator = [
  stringField('code', 'Coupon code', { min: 3, max: 20 }),
  stringField('description', 'Description', { optional: true, max: 200 }),
  body('discountType')
    .exists({ values: 'falsy' })
    .withMessage('Discount type is required')
    .bail()
    .isIn(['percentage', 'fixed'])
    .withMessage('Invalid discount type'),
  body('discountValue')
    .exists({ values: 'falsy' })
    .withMessage('Discount value is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Discount must be positive'),
  body('maxUses')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Max uses must be at least 1'),
  body('expiresAt')
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage('Valid expiry date is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('applicableEvents')
    .optional()
    .isArray()
    .withMessage('Applicable events must be an array'),
  body('applicableEvents.*')
    .optional()
    .isMongoId()
    .withMessage('Each applicable event must be a valid ID'),
  validate,
];

const updateCouponValidator = [
  stringField('description', 'Description', { optional: true, max: 200 }),
  body('maxUses')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Max uses must be at least 1'),
  body('expiresAt')
    .optional({ nullable: true })
    .isISO8601()
    .toDate()
    .withMessage('Valid expiry date is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('applicableEvents')
    .optional()
    .isArray()
    .withMessage('Applicable events must be an array'),
  body('applicableEvents.*')
    .optional()
    .isMongoId()
    .withMessage('Each applicable event must be a valid ID'),
  validate,
];

const validateCouponValidator = [
  stringField('code', 'Coupon code', { min: 3, max: 20 }),
  mongoIdField('eventId', 'Event ID'),
  body('amount')
    .exists({ values: 'falsy' })
    .withMessage('Amount is required')
    .bail()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Amount must be a valid number between 0 and 1000000')
    .toFloat(),
  validate,
];

const deleteAccountValidator = [
  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: 1, max: 200 })
    .withMessage('Password must be between 1 and 200 characters'),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  createEventValidator,
  updateEventValidator,
  createHallValidator,
  updateHallValidator,
  createBookingValidator,
  confirmBookingValidator,
  initiateBookingValidator,
  roleUpgradeRequestValidator,
  roleUpgradeDecisionValidator,
  adminUserUpdateValidator,
  userStatusValidator,
  mongoIdParamValidator,
  paginationQueryValidator,
  createSupportTicketValidator,
  createCampaignValidator,
  createCouponValidator,
  updateCouponValidator,
  validateCouponValidator,
  deleteAccountValidator,
};
