const crypto = require('crypto');
const User = require('../models/User');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const {
  validatePasswordStrength,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  getDeviceInfo,
} = require('../utils/authUtils');

// ─── Routes ──────────────────────────────────────────────────────────

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const payload = req.validatedBody || req.body;
    const result = await authService.registerUser(payload, getDeviceInfo(req));

    await auditService.log({
      req,
      actor: result.user,
      action: 'user.create',
      resource: 'User',
      resourceId: result.user._id,
      details: { role: result.role },
    });

    res.status(201).json({
      success: true,
      message: 'Registered successfully. Please verify your email.',
      data: { user: result.user.toJSON(), emailVerificationRequired: true },
    });
  } catch (error) {
    logger.error('Registration error: ' + error.message);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.validatedBody || req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const result = await authService.loginUser(email, password, twoFactorCode, getDeviceInfo(req));

    if (result.twoFactorRequired) {
      return res.status(200).json({ success: true, twoFactorRequired: true, message: result.message });
    }

    await auditService.log({
      req,
      actor: result.user,
      action: 'auth.login',
      resource: 'Auth',
      resourceId: result.user._id,
      details: { sessionId: result.sessionId, device: getDeviceInfo(req).device },
    });

    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, { ...ACCESS_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE });
    }
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, { ...REFRESH_COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user.toJSON(),
        lastLogin: result.user.lastLogin,
        sessionInfo: getDeviceInfo(req),
      },
    });
  } catch (error) {
    logger.error('Login error: ' + error.message);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, lockTimeRemaining: error.lockTimeRemaining, attemptsRemaining: error.attemptsRemaining, emailVerificationRequired: error.emailVerificationRequired, email: error.email });
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// POST /api/auth/refresh — get new access token using refresh token
exports.refreshToken = async (req, res) => {
  try {
    const incomingRefresh = req.body.refreshToken || req.cookies?.refreshToken;
    if (!incomingRefresh) return res.status(400).json({ success: false, message: 'Refresh token required' });

    // Removed dynamic require
    const result = await authService.processRefreshToken(incomingRefresh, getDeviceInfo(req));

    if (result.newAccessToken) {
      res.cookie('accessToken', result.newAccessToken, { ...ACCESS_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE });
    }
    if (result.newRefreshToken) {
      res.cookie('refreshToken', result.newRefreshToken, { ...REFRESH_COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    res.json({ success: true, data: { message: 'Token refreshed' } });
  } catch (error) {
    logger.error('Refresh token error: ' + error.message);
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error check log' });
  }
};

// GET /api/auth/me
exports.getCurrentUser = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshToken activeSessions');
    if (user) {
      if (req.sessionId) {
        user.clearSessionRefreshToken(req.sessionId);
        user.removeSession(req.sessionId);
      } else {
        user.clearAllSessionRefreshTokens();
      }
      user.refreshToken = undefined;
      user.refreshTokenExpires = undefined;
      await user.save();
    }

    await auditService.log({
      req,
      actor: req.user,
      action: 'auth.logout',
      resource: 'Auth',
      resourceId: req.user._id,
      details: { sessionId: req.sessionId },
    });

    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    logger.error('Logout error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      age,
      gender,
      interests,
      location,
      avatar,
    } = req.validatedBody || req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (age !== undefined) user.age = age;
    if (gender) user.gender = gender;
    if (interests) user.interests = interests;
    if (avatar !== undefined) user.avatar = avatar;
    if (location) {
      const existing = user.location?.toObject?.() || user.location || {};
      user.location = { ...existing, ...location };
    }
    await user.save();
    res.json({ success: true, message: 'Profile updated successfully', data: { user: user.toJSON() } });
  } catch (error) {
    logger.error('Update profile error: ' + error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validatedBody || req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    const pwErrors = validatePasswordStrength(newPassword);
    if (pwErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'New password is too weak', errors: pwErrors });
    }

    const user = await User.findById(req.user._id).select('+password +activeSessions +refreshToken');
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const recentlyUsed = await user.isPasswordRecentlyUsed(newPassword);
    if (recentlyUsed) return res.status(400).json({ success: false, message: 'Cannot reuse a recently used password' });

    user.password = newPassword;
    
    // SECURITY (Phase 2.5): Invalidate sessions on password change
    // Keep only the current session active, invalidate all others 
    user.activeSessions = user.activeSessions.filter(s => s.sessionId === req.sessionId);
    user.clearAllSessionRefreshTokens();
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;

    await user.save();

    await auditService.log({
      req,
      actor: user,
      action: 'auth.password_changed',
      resource: 'User',
      resourceId: user._id,
      details: { sessionId: req.sessionId },
    });
    res.json({ success: true, message: 'Password changed successfully. Other devices have been logged out.' });
  } catch (error) {
    logger.error('Change password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpires: { $gt: Date.now() } });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    logger.error('Email verification error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.validatedBody || req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // SECURITY (Phase 2.4): Always return the same message to prevent enumeration
    if (user && !user.emailVerified) {
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();
      sendVerificationEmail(user.email, verificationToken);
    }

    res.json({ success: true, message: 'If the account exists and requires verification, a link has been sent to your email.' });
  } catch (error) {
    logger.error('Resend verification error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.validatedBody || req.body;
    // Always return success to prevent email enumeration
    if (!email) return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const resetToken = user.generatePasswordResetToken();
      await user.save();
      sendPasswordResetEmail(user.email, resetToken);
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.validatedBody || req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' });

    const pwErrors = validatePasswordStrength(password);
    if (pwErrors.length > 0) return res.status(400).json({ success: false, message: 'Password is too weak', errors: pwErrors });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } }).select('+password');

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    const recentlyUsed = await user.isPasswordRecentlyUsed(password);
    if (recentlyUsed) return res.status(400).json({ success: false, message: 'Cannot reuse a recently used password' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await auditService.log({
      req,
      actor: user,
      action: 'auth.password_reset',
      resource: 'Auth',
      resourceId: user._id,
    });
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

// ─── 2FA Routes ───────────────────────────────────────────────────────

// POST /api/auth/2fa/setup — generate secret + QR code URL
exports.setup2FA = async (req, res) => {
  try {
    // Dynamic requires prevent Jest ESM parsing errors on startup
    const { authenticator } = require('otplib');
    const qrcode = require('qrcode');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(req.user.email, 'EventX Studio', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Store secret temporarily (not enabled yet until verified)
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    user.setTwoFactorSecret(secret);
    await user.save();

    // Only return the QR code — never expose the raw TOTP secret in API responses
    res.json({ success: true, data: { qrCodeDataUrl } });
  } catch (error) {
    logger.error('2FA setup error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to set up 2FA' });
  }
};

// POST /api/auth/2fa/enable — verify code then enable 2FA
exports.enable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '2FA code is required' });

    // Dynamic require prevents Jest ESM parsing errors
    const { authenticator } = require('otplib');
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: 'Please call /2fa/setup first' });

    const plainSecret = user.getTwoFactorSecret();
    const isValid = authenticator.check(code, plainSecret);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid 2FA code' });

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('2FA enable error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
};

// DELETE /api/auth/2fa — disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(400).json({ success: false, message: 'Password is incorrect' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ success: true, message: '2FA disabled' });
  } catch (error) {
    logger.error('2FA disable error: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

// ─── Session Routes ───────────────────────────────────────────────────

exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activeSessions');
    const sessions = user.activeSessions.map(s => ({
      sessionId: s.sessionId,
      deviceInfo: s.deviceInfo,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt,
      isCurrent: s.sessionId === req.sessionId,
    }));
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const sessionExists = user.activeSessions?.some(s => s.sessionId === req.params.sessionId);
    if (!sessionExists) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (req.params.sessionId === req.sessionId) {
      return res.status(400).json({ success: false, message: 'Cannot delete current session. Use logout instead.' });
    }
    user.removeSession(req.params.sessionId);
    await user.save();
    res.json({ success: true, message: 'Session removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteOtherSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.activeSessions = user.activeSessions.filter(s => s.sessionId === req.sessionId);
    await user.save();
    res.json({ success: true, message: 'All other sessions removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const query = { deletedAt: { $exists: false } };
    const users = await User.find(query)
      .select('name email role isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { users, pagination: { current: page, pages: Math.ceil(total / limit), total } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Role Upgrade Request ─────────────────────────────────────────────

// POST /api/auth/role-upgrade — user requests organizer role
exports.requestRoleUpgrade = async (req, res) => {
  try {
    const { reason, organizationName } = req.validatedBody || req.body;
    if (req.user.role !== 'user') {
      return res.status(400).json({ success: false, message: 'Only regular users can request role upgrades' });
    }
    // Store upgrade request in user document
    await User.findByIdAndUpdate(req.user._id, {
      roleUpgradeRequest: { reason, organizationName, requestedAt: new Date(), status: 'pending' },
    });
    res.json({ success: true, message: 'Role upgrade request submitted. An admin will review it shortly.' });
  } catch (error) {
    logger.error('Role upgrade request error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/role-upgrade-requests (Admin)
exports.getRoleUpgradeRequests = async (req, res) => {
  try {
    const users = await User.find({ 'roleUpgradeRequest.status': 'pending' }).select('name email roleUpgradeRequest createdAt');
    res.json({ success: true, data: { requests: users } });
  } catch (error) {
    logger.error('Get role upgrade requests error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/auth/role-upgrade-requests/:userId (Admin approve/deny)
exports.updateRoleUpgradeRequest = async (req, res) => {
  try {
    const { action } = req.validatedBody || req.body;
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "deny"' });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (action === 'approve') {
      const previousRole = user.role;
      user.role = 'organizer';
      user.roleUpgradeRequest.status = 'approved';
      await auditService.log({
        req,
        actor: req.user,
        action: 'auth.role_upgrade_approve',
        resource: 'User',
        resourceId: user._id,
        details: { previousRole, newRole: 'organizer' },
      });
    } else {
      user.roleUpgradeRequest.status = 'denied';
    }
    await user.save();
    res.json({ success: true, message: `Request ${action}d successfully` });
  } catch (error) {
    logger.error('Update role upgrade request error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Account Deletion (GDPR) ─────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.validatedBody || req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password confirmation is required to delete your account' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Anonymize instead of hard-delete to preserve audit trails and referential integrity
    const anonymisedName = `Deleted User ${Date.now()}`;
    user.name = anonymisedName;
    user.email = `deleted_${Date.now()}@removed.invalid`;
    user.phone = '';
    user.avatar = '';
    user.isActive = false;
    user.refreshToken = undefined;
    user.activeSessions = [];
    user.twoFactorSecret = undefined;
    user.twoFactorEnabled = false;
    user.deletedAt = new Date();
    await user.save();

    // Log the deletion
    await auditService.log({
      req,
      actor: req.user,
      action: 'auth.account_deleted',
      resource: 'User',
      resourceId: req.user._id,
      details: { anonymisedAs: anonymisedName },
    });

    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

    res.json({ success: true, message: 'Your account has been deleted. We\'re sorry to see you go.' });
  } catch (error) {
    logger.error('Delete account error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
