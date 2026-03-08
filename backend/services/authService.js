const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const DISPOSABLE_DOMAINS = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org',
];

const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000;

class AuthService {
    isDisposableEmail(email) {
        return DISPOSABLE_DOMAINS.includes(email.split('@')[1]);
    }

    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('At least one number');
        if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character');
        return errors;
    }

    generateAccessToken(userId, sessionId = null) {
        const payload = { id: userId };
        if (sessionId) payload.sessionId = sessionId;
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || '7d',
        });
    }

    generateRefreshToken(userId) {
        return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
            expiresIn: '30d',
        });
    }

    async registerUser(data, deviceInfo) {
        const { name, email, password, role, phone, age, gender, interests, location } = data;

        if (this.isDisposableEmail(email)) {
            throw Object.assign(new Error('Disposable email addresses are not allowed'), { status: 400 });
        }

        const pwErrors = this.validatePasswordStrength(password);
        if (pwErrors.length > 0) {
            throw Object.assign(new Error('Password is too weak: ' + pwErrors.join(', ')), { status: 400 });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw Object.assign(new Error('User with this email already exists'), { status: 400 });
        }

        const allowedRoles = ['user', 'organizer'];
        const safeRole = allowedRoles.includes(role) ? role : 'user';

        const user = new User({
            name,
            email: email.toLowerCase(),
            password,
            role: safeRole,
            phone,
            age,
            gender,
            interests: interests || [],
            location: { ...location, timezone: location?.timezone || 'UTC' },
        });

        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        sendVerificationEmail(user.email, verificationToken);

        const sessionId = crypto.randomUUID();
        const accessToken = this.generateAccessToken(user._id, sessionId);
        const refreshToken = this.generateRefreshToken(user._id);

        user.addSession(sessionId, deviceInfo);
        user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
        await user.save();

        return { user, accessToken, refreshToken, role: safeRole };
    }

    async loginUser(email, password, twoFactorCode, deviceInfo) {
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password +twoFactorSecret');

        if (!user) {
            throw Object.assign(new Error('Invalid credentials'), { status: 401 });
        }

        if (user.isLocked) {
            const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
            throw Object.assign(new Error(`Account locked. Try again in ${lockTimeRemaining} minutes.`), { status: 423, lockTimeRemaining });
        }

        if (!user.isActive) {
            throw Object.assign(new Error('Account is deactivated. Please contact support.'), { status: 401 });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.incLoginAttempts();
            const attemptsRemaining = Math.max(0, 5 - (user.loginAttempts + 1));
            throw Object.assign(new Error('Invalid credentials'), { status: 401, attemptsRemaining });
        }

        if (!user.emailVerified) {
            throw Object.assign(new Error('Please verify your email before logging in.'), { status: 403, emailVerificationRequired: true, email: user.email });
        }

        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                return { twoFactorRequired: true, message: 'Please provide your 2FA code.' };
            }
            const { authenticator } = require('otplib');
            const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret);
            if (!isValid) throw Object.assign(new Error('Invalid 2FA code.'), { status: 401 });
        }

        if (user.loginAttempts > 0) await user.resetLoginAttempts();

        user.lastLogin = new Date();
        const sessionId = crypto.randomUUID();
        const accessToken = this.generateAccessToken(user._id, sessionId);
        const refreshToken = this.generateRefreshToken(user._id);

        user.addSession(sessionId, deviceInfo);
        user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
        await user.save();

        return { user, accessToken, refreshToken, sessionId };
    }

    async processRefreshToken(incomingRefresh, deviceInfo) {
        let decoded;
        try {
            decoded = jwt.verify(incomingRefresh, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
        } catch {
            throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
        }

        if (decoded.type !== 'refresh') throw Object.assign(new Error('Invalid token type'), { status: 401 });

        const hashedToken = crypto.createHash('sha256').update(incomingRefresh).digest('hex');
        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || !user.isActive) throw Object.assign(new Error('User not found or inactive'), { status: 401 });

        if (user.refreshToken !== hashedToken) {
            user.refreshToken = undefined;
            user.refreshTokenExpires = undefined;
            user.activeSessions = [];
            await user.save();
            throw Object.assign(new Error('Security alert: Invalid refresh token reused. Please log in again.'), { status: 401 });
        }

        if (user.refreshTokenExpires < Date.now()) throw Object.assign(new Error('Refresh token has expired'), { status: 401 });

        const sessionId = crypto.randomUUID();
        const newAccessToken = this.generateAccessToken(user._id, sessionId);
        const newRefreshToken = this.generateRefreshToken(user._id);

        user.addSession(sessionId, deviceInfo);
        user.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAge);
        await user.save();

        return { newAccessToken, newRefreshToken };
    }
}

module.exports = new AuthService();
