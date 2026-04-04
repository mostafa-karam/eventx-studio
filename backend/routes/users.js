const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

const router = express.Router();

// Static routes MUST come before parameterized /:id routes
router.get('/profile/me', authenticate, usersController.getProfile);
router.put('/profile/me', authenticate, usersController.updateProfile);
router.get('/organizer/:id', usersController.getOrganizerProfile);

router.get('/', authenticate, requireAdmin, usersController.getUsers);
router.get('/:id', authenticate, requireAdmin, usersController.getUserById);
router.put('/:id', authenticate, requireAdmin, usersController.updateUser);
router.put('/:id/status', authenticate, requireAdmin, usersController.updateUserStatus);
router.delete('/:id', authenticate, requireAdmin, usersController.deleteUser);

module.exports = router;
