const express = require('express');
const rateLimit = require('express-rate-limit');
const { authLimiter, passwordResetLimiter, refreshTokenLimiter } = require('../middleware/rateLimiter');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { registerValidator, loginValidator, updateProfileValidator, changePasswordValidator } = require('../middleware/validators');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply authLimiter to all auth routes
router.use(authLimiter);

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully registered
 *       400:
 *         description: Validation error
 */
router.post('/register', registerValidator, authController.register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               twoFactorCode:
 *                 type: string
 *                 description: Required if 2FA is enabled
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginValidator, authController.login);
router.post('/refresh', refreshTokenLimiter, authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.put('/profile', authenticate, updateProfileValidator, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidator, authController.changePassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
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
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;