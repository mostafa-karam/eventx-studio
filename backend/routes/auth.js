const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/enable', authenticate, authController.enable2FA);
router.delete('/2fa', authenticate, authController.disable2FA);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.deleteSession);
router.delete('/sessions', authenticate, authController.deleteOtherSessions);
router.get('/users', authenticate, requireAdmin, authController.getAllUsers);
router.post('/role-upgrade', authenticate, authController.requestRoleUpgrade);
router.get('/role-upgrade-requests', authenticate, requireAdmin, authController.getRoleUpgradeRequests);
router.put('/role-upgrade-requests/:userId', authenticate, requireAdmin, authController.updateRoleUpgradeRequest);

module.exports = router;