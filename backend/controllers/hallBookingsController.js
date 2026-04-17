const mongoose = require('mongoose');
const logger = require('../utils/logger');
const HallBooking = require('../models/HallBooking');
const Hall = require('../models/Hall');
const notificationService = require('../services/notificationService');

// FIX C-01 — NoSQL Injection allowlist for query filters
// Prevents injection of MongoDB operators (e.g. { "$ne": null }) via req.query
const VALID_BOOKING_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'maintenance'];

const assertHallOwnershipForVenueAdmin = async (req, hallId) => {
    if (req.user?.role === 'admin') return;
    if (req.user?.role !== 'venue_admin') {
        return;
    }

    const hall = await Hall.findById(hallId).select('createdBy');
    if (!hall) {
        const error = new Error('Hall not found');
        error.status = 404;
        throw error;
    }

    if (String(hall.createdBy) !== String(req.user._id)) {
        const error = new Error('Not authorized to manage bookings for this hall');
        error.status = 403;
        throw error;
    }
};

// @desc    Get all hall bookings (venue_admin, admin)
// @access  Private (venue_admin, admin)
exports.getPlatformBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        let query = {};

        // FIX C-01 — Validate status against enum allowlist to block NoSQL injection
        if (req.query.status && VALID_BOOKING_STATUSES.includes(req.query.status)) {
            query.status = req.query.status;
        }

        // Apply venue_admin scoping to enforce IDOR protection
        if (req.user && req.user.role === 'venue_admin') {
            const ownedHalls = await Hall.find({ createdBy: req.user._id }).select('_id');
            const ownedHallIds = ownedHalls.map(h => h._id.toString());
            
            if (req.query.hall && mongoose.Types.ObjectId.isValid(req.query.hall)) {
                if (!ownedHallIds.includes(req.query.hall.toString())) {
                    return res.status(403).json({ success: false, message: 'Not authorized to view bookings for this hall' });
                }
                query.hall = req.query.hall;
            } else {
                query.hall = { $in: ownedHalls.map(h => h._id) };
            }
        } else {
            // Original logic for admins
            if (req.query.hall && mongoose.Types.ObjectId.isValid(req.query.hall)) {
                query.hall = req.query.hall;
            }
        }

        const bookings = await HallBooking.find(query)
            .populate('hall', 'name capacity hourlyRate')
            .populate('organizer', 'name email')
            .populate('event', 'title date')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await HallBooking.countDocuments(query);

        // Count by status for quick stats
        const statusCounts = await HallBooking.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                },
                statusCounts: statusCounts.reduce((acc, s) => {
                    acc[s._id] = s.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        logger.error('Get hall bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching hall bookings'
        });
    }
};

// @desc    Get organizer's own bookings
// @access  Private (organizer, admin)
exports.getMyBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const query = { organizer: req.user._id };

        // FIX C-01 — Validate status against enum allowlist to block NoSQL injection
        if (req.query.status && VALID_BOOKING_STATUSES.includes(req.query.status)) {
            query.status = req.query.status;
        }

        const bookings = await HallBooking.find(query)
            .populate('hall', 'name capacity hourlyRate images')
            .populate('event', 'title date')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await HallBooking.countDocuments(query);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        logger.error('Get my hall bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching your hall bookings'
        });
    }
};

// @desc    Create a hall booking request
// @access  Private (organizer, admin)
exports.createBooking = async (req, res) => {
    try {
        const { hall: hallId, startDate, endDate, notes, event: eventId } = req.body;

        // Verify hall exists and is active
        const hall = await Hall.findById(hallId);
        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Hall not found'
            });
        }

        if (hall.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Hall is currently ${hall.status} and cannot be booked`
            });
        }

        // Check for existing conflicts (even pending ones, to warn organizer)
        const existingBooking = await HallBooking.findOne({
            hall: hallId,
            status: { $in: ['approved', 'pending', 'maintenance'] },
            startDate: { $lt: new Date(endDate) },
            endDate: { $gt: new Date(startDate) }
        });

        if (existingBooking) {
            return res.status(409).json({
                success: false,
                message: existingBooking.status === 'maintenance'
                    ? 'Hall is scheduled for maintenance during the selected time period'
                    : 'Hall already has a booking (approved or pending) for the selected time period',
                conflictingBooking: {
                    startDate: existingBooking.startDate,
                    endDate: existingBooking.endDate,
                    status: existingBooking.status
                }
            });
        }

        // Calculate total cost
        const hours = Math.ceil(
            (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60)
        );
        const totalCost = hours * hall.hourlyRate;

        const booking = new HallBooking({
            hall: hallId,
            organizer: req.user._id,
            event: eventId || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalCost,
            notes
        });

        await booking.save();

        const populatedBooking = await HallBooking.findById(booking._id)
            .populate('hall', 'name capacity hourlyRate')
            .populate('organizer', 'name email');

        res.status(201).json({
            success: true,
            message: 'Hall booking request submitted successfully. Waiting for venue admin approval.',
            data: { booking: populatedBooking }
        });
    } catch (error) {
        logger.error('Create hall booking error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while creating hall booking'
        });
    }
};

// @desc    Schedule maintenance for a hall
// @access  Private (venue_admin, admin)
exports.scheduleMaintenance = async (req, res) => {
    try {
        const { hall: hallId, startDate, endDate, notes } = req.body;

        if (!hallId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Hall, start date, and end date are required' });
        }

        await assertHallOwnershipForVenueAdmin(req, hallId);

        // Check for existing conflicts (approved or maintenance)
        const existingBooking = await HallBooking.findOne({
            hall: hallId,
            status: { $in: ['approved', 'maintenance'] },
            startDate: { $lt: new Date(endDate) },
            endDate: { $gt: new Date(startDate) }
        });

        if (existingBooking) {
            return res.status(409).json({
                success: false,
                message: existingBooking.status === 'maintenance'
                    ? 'Hall is already scheduled for maintenance during this time'
                    : 'Hall already has an approved booking during this time. Cannot schedule maintenance.'
            });
        }

        const maintenanceBlock = new HallBooking({
            hall: hallId,
            organizer: req.user._id, // Venue admin acts as organizer for the block
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: 'maintenance',
            notes: notes || 'Scheduled maintenance',
            totalCost: 0
        });

        await maintenanceBlock.save();

        const populatedBlock = await HallBooking.findById(maintenanceBlock._id)
            .populate('hall', 'name capacity')
            .populate('organizer', 'name email');

        res.status(201).json({
            success: true,
            message: 'Maintenance scheduled successfully',
            data: { maintenance: populatedBlock }
        });
    } catch (error) {
        logger.error('Schedule maintenance error:', error);
        const status = error.status || 500;
        const message = error.status ? error.message : 'Server error while scheduling maintenance';
        res.status(status).json({ success: false, message });
    }
};

// @desc    Approve a hall booking
// @access  Private (venue_admin, admin)
// FIX H-05 — Wrapped in transaction to prevent race conditions on double approval
exports.approveBooking = async (req, res) => {
    let session;
    let useSession = false;

    try {
        session = await mongoose.startSession();
        const topologyType = mongoose.connection.client.topology.description?.type || '';
        useSession = topologyType.includes('ReplicaSet');
        
        if (useSession) {
            session.startTransaction();
        }

        const sessionOptions = useSession ? { session } : {};

        const booking = await HallBooking.findById(req.params.id, null, sessionOptions);

        if (!booking) {
            if (useSession) await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        await assertHallOwnershipForVenueAdmin(req, booking.hall);

        if (booking.status !== 'pending') {
            if (useSession) await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot approve a booking with status: ${booking.status}`
            });
        }

        // Explicitly check for conflicts within the transaction boundary
        const conflicting = await HallBooking.findOne({
            hall: booking.hall,
            _id: { $ne: booking._id },
            status: { $in: ['approved', 'maintenance'] },
            $or: [
                {
                    startDate: { $lt: booking.endDate },
                    endDate: { $gt: booking.startDate }
                }
            ]
        }, null, sessionOptions);

        if (conflicting) {
            const err = new Error('Hall is already booked or scheduled for maintenance during the selected time period');
            err.name = 'ConflictError';
            throw err;
        }

        booking.status = 'approved';
        booking.reviewedBy = req.user._id;
        booking.reviewedAt = new Date();

        await booking.save(useSession ? { session } : undefined);
        
        if (useSession) {
            await session.commitTransaction();
        }

        const populatedBooking = await HallBooking.findById(booking._id)
            .populate('hall', 'name capacity')
            .populate('organizer', 'name email')
            .populate('reviewedBy', 'name');

        // Notify organizer (non-blocking)
        notificationService.notify(booking.organizer, {
            title: 'Hall Booking Approved',
            message: `Your booking for hall "${populatedBooking.hall?.name}" has been approved.`,
            type: 'booking',
            metadata: { bookingId: booking._id, hallId: booking.hall },
        });

        res.json({
            success: true,
            message: 'Booking approved successfully',
            data: { booking: populatedBooking }
        });
    } catch (error) {
        if (useSession && session) {
            await session.abortTransaction().catch(() => {});
        }
        
        logger.error('Approve booking error:', error);

        if (error.name === 'ConflictError') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while approving booking'
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// @desc    Reject a hall booking
// @access  Private (venue_admin, admin)
exports.rejectBooking = async (req, res) => {
    try {
        const booking = await HallBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        await assertHallOwnershipForVenueAdmin(req, booking.hall);

        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject a booking with status: ${booking.status}`
            });
        }

        booking.status = 'rejected';
        booking.rejectionReason = req.body.reason || 'No reason provided';
        booking.reviewedBy = req.user._id;
        booking.reviewedAt = new Date();

        await booking.save();

        const populatedBooking = await HallBooking.findById(booking._id)
            .populate('hall', 'name')
            .populate('organizer', 'name email')
            .populate('reviewedBy', 'name');

        // Notify organizer (non-blocking)
        notificationService.notify(booking.organizer, {
            title: 'Hall Booking Rejected',
            message: `Your booking for hall "${populatedBooking.hall?.name}" was rejected. Reason: ${booking.rejectionReason}`,
            type: 'booking',
            metadata: { bookingId: booking._id, hallId: booking.hall, reason: booking.rejectionReason },
        });

        res.json({
            success: true,
            message: 'Booking rejected',
            data: { booking: populatedBooking }
        });
    } catch (error) {
        logger.error('Reject booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while rejecting booking'
        });
    }
};

// @desc    Cancel a hall booking
// @access  Private (organizer who owns it, or admin)
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await HallBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Organizer can cancel their own booking; venue_admin can cancel bookings
        // only for halls they own; admin can cancel anything.
        const isOwner = booking.organizer.toString() === req.user._id.toString();
        const isAdminOrVenueAdmin = ['admin', 'venue_admin'].includes(req.user.role);

        if (!isOwner && !isAdminOrVenueAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this booking'
            });
        }

        if (!isOwner && req.user.role === 'venue_admin') {
            await assertHallOwnershipForVenueAdmin(req, booking.hall);
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Booking is already cancelled'
            });
        }

        booking.status = 'cancelled';
        await booking.save();

        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });
    } catch (error) {
        logger.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cancelling booking'
        });
    }
};
