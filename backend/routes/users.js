const express = require('express');

const { authenticate, requireAdmin } = require('../middleware/auth');
const usersController = require('../controllers/usersController');
const authController = require('../controllers/authController');
const {
  adminUserUpdateValidator,
  updateProfileValidator,
  userStatusValidator,
} = require('../middleware/validators');

const router = express.Router();

// Static routes MUST come before parameterized /:id routes
router.get('/profile/me', authenticate, authController.getCurrentUser);
router.put('/profile/me', authenticate, updateProfileValidator, authController.updateProfile);
router.get('/organizer/:id', usersController.getOrganizerProfile);

router.get('/', authenticate, requireAdmin, usersController.getUsers);
router.get('/:id', authenticate, requireAdmin, usersController.getUserById);
router.put('/:id', authenticate, requireAdmin, adminUserUpdateValidator, usersController.updateUser);
router.put('/:id/status', authenticate, requireAdmin, userStatusValidator, usersController.updateUserStatus);
router.delete('/:id', authenticate, requireAdmin, usersController.deleteUser);

module.exports = router;
