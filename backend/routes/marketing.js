const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { createCampaignValidator } = require('../middleware/validators');
const {
  getCampaigns,
  createCampaign,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  launchCampaign
} = require('../controllers/marketingController');

// Get marketing campaigns and stats
router.get('/campaigns', authenticate, requireRole(['organizer', 'admin']), asyncHandler(getCampaigns));

// Create new campaign
router.post('/campaigns', authenticate, requireRole(['organizer', 'admin']), createCampaignValidator, asyncHandler(createCampaign));

// Get specific campaign
router.get('/campaigns/:id', authenticate, requireRole(['organizer', 'admin']), asyncHandler(getCampaignById));

// Update campaign
router.put('/campaigns/:id', authenticate, requireRole(['organizer', 'admin']), asyncHandler(updateCampaign));

// Delete campaign
router.delete('/campaigns/:id', authenticate, requireRole(['organizer', 'admin']), asyncHandler(deleteCampaign));

// Launch campaign
router.post('/campaigns/:id/launch', authenticate, requireRole(['organizer', 'admin']), asyncHandler(launchCampaign));

module.exports = router;
