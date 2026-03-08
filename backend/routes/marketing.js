const express = require('express');
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
router.get('/campaigns', authenticate, getCampaigns);

// Create new campaign
router.post('/campaigns', authenticate, createCampaign);

// Get specific campaign
router.get('/campaigns/:id', authenticate, getCampaignById);

// Update campaign
router.put('/campaigns/:id', authenticate, updateCampaign);

// Delete campaign
router.delete('/campaigns/:id', authenticate, deleteCampaign);

// Launch campaign
router.post('/campaigns/:id/launch', authenticate, launchCampaign);

module.exports = router;
