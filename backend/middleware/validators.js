const { body, param, validationResult } = require('express-validator');

// Generic validation result checker middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => err.msg)
        });
    }
    next();
};

// ─── Auth Validators ───────────────────────────────────────────────────
const registerValidator = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
    validate
];

const loginValidator = [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

const updateProfileValidator = [
    body('name').optional().trim().isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']),
    validate
];

const changePasswordValidator = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    validate
];

// ─── Event Validators ──────────────────────────────────────────────────
const createEventValidator = [
    body('title').trim().notEmpty().withMessage('Event title is required').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
    body('description').trim().notEmpty().withMessage('Event description is required').isLength({ max: 2000 }),
    body('category').isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'exhibition', 'networking', 'other']).withMessage('Invalid category'),
    body('date').isISO8601().toDate().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().toDate().custom((value, { req }) => {
        if (value && req.body.date && new Date(value) <= new Date(req.body.date)) {
            throw new Error('End date must be after start date');
        }
        return true;
    }),
    body('venue.name').trim().notEmpty().withMessage('Venue name is required'),
    body('venue.address').trim().notEmpty().withMessage('Venue address is required'),
    body('venue.city').trim().notEmpty().withMessage('Venue city is required'),
    body('venue.country').trim().notEmpty().withMessage('Venue country is required'),
    body('venue.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('seating.totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
    body('pricing.type').optional().isIn(['free', 'paid']),
    body('pricing.amount').optional().isFloat({ min: 0 }).withMessage('Price cannot be negative'),
    validate
];

const updateEventValidator = [
    body('title').optional().trim().notEmpty().isLength({ max: 100 }),
    body('date').optional().isISO8601().toDate(),
    body('seating.totalSeats').optional().isInt({ min: 1 }),
    // Apply similar optional rules for other fields...
    validate
];

// ─── Hall Validators ───────────────────────────────────────────────────
const createHallValidator = [
    body('name').trim().notEmpty().withMessage('Hall name is required').isLength({ max: 100 }),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate cannot be negative'),
    validate
];

const updateHallValidator = [
    body('name').optional().trim().notEmpty().withMessage('Hall name is required').isLength({ max: 100 }),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate cannot be negative'),
    validate
];

// ─── Booking Validators ────────────────────────────────────────────────
const createBookingValidator = [
    body('hall').trim().notEmpty().withMessage('Hall ID is required'),
    body('date').isISO8601().toDate().withMessage('Valid date is required'),
    body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:mm)'),
    body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:mm)'),
    validate
];

// ─── Export ────────────────────────────────────────────────────────────
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
    createBookingValidator
};
