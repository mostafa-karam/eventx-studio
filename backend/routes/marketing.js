const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getCampaigns,
  createCampaign,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  launchCampaign
} = require('../controllers/marketingController');

// Get marketing campaigns and stats
router.get('/campaigns', authenticate, asyncHandler(getCampaigns);

// Create new campaign
router.post('/campaigns', authenticate, asyncHandler(createCampaign);

// Get specific campaign
router.get('/campaigns/:id', authenticate, asyncHandler(getCampaignById);

// Update campaign
router.put('/campaigns/:id', authenticate, asyncHandler(updateCampaign);

// Delete campaign
router.delete('/campaigns/:id', authenticate, asyncHandler(deleteCampaign);

// Launch campaign
router.post('/campaigns/:id/launch', authenticate, asyncHandler(launchCampaign);

module.exports = router;
