const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { authenticate } = require('../middleware/auth');

// Get marketing campaigns and stats
router.get('/campaigns', authenticate, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id })
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });

    // Calculate overall stats
    const stats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalRecipients: campaigns.reduce((sum, c) => sum + c.metrics.sent, 0),
      avgOpenRate: 0,
      avgClickRate: 0,
      avgConversionRate: 0,
      totalConversions: campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0),
      revenue: 0
    };

    // Calculate average rates
    const sentCampaigns = campaigns.filter(c => c.metrics.sent > 0);
    if (sentCampaigns.length > 0) {
      stats.avgOpenRate = Math.round(
        sentCampaigns.reduce((sum, c) => sum + (c.metrics.opened / c.metrics.sent * 100), 0) / sentCampaigns.length
      );
      stats.avgClickRate = Math.round(
        sentCampaigns.reduce((sum, c) => sum + (c.metrics.clicked / c.metrics.sent * 100), 0) / sentCampaigns.length
      );
      stats.avgConversionRate = Math.round(
        sentCampaigns.reduce((sum, c) => sum + (c.metrics.conversions / c.metrics.sent * 100), 0) / sentCampaigns.length
      );
    }

    // Estimate revenue (placeholder calculation)
    stats.revenue = stats.totalConversions * 50; // Assume $50 average per conversion

    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        eventName: campaign.eventName || (campaign.eventId ? campaign.eventId.title : 'General'),
        subject: campaign.subject,
        content: campaign.content,
        targetAudience: campaign.targetAudience,
        createdAt: campaign.createdAt,
        scheduledAt: campaign.scheduledAt,
        sentAt: campaign.sentAt,
        sent: campaign.metrics.sent,
        opened: campaign.metrics.opened,
        clicked: campaign.metrics.clicked,
        conversions: campaign.metrics.conversions
      })),
      stats
    });
  } catch (error) {
    console.error('Error fetching marketing campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketing campaigns'
    });
  }
});

// Create new campaign
router.post('/campaigns', authenticate, async (req, res) => {
  try {
    const { name, type, eventId, eventName, subject, content, targetAudience, scheduledAt } = req.body;

    const campaign = new Campaign({
      name,
      type,
      eventId,
      eventName,
      subject,
      content,
      targetAudience: targetAudience || 'all',
      scheduledAt,
      createdBy: req.user.id
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: {
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        eventName: campaign.eventName,
        createdAt: campaign.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign'
    });
  }
});

// Get specific campaign
router.get('/campaigns/:id', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    }).populate('eventId', 'title');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        eventName: campaign.eventName || (campaign.eventId ? campaign.eventId.title : 'General'),
        subject: campaign.subject,
        content: campaign.content,
        targetAudience: campaign.targetAudience,
        createdAt: campaign.createdAt,
        scheduledAt: campaign.scheduledAt,
        sentAt: campaign.sentAt,
        metrics: campaign.metrics,
        settings: campaign.settings
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign'
    });
  }
});

// Update campaign
router.put('/campaigns/:id', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow editing sent campaigns
    if (campaign.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit completed campaigns'
      });
    }

    const { name, subject, content, targetAudience, scheduledAt } = req.body;

    campaign.name = name || campaign.name;
    campaign.subject = subject || campaign.subject;
    campaign.content = content || campaign.content;
    campaign.targetAudience = targetAudience || campaign.targetAudience;
    campaign.scheduledAt = scheduledAt || campaign.scheduledAt;

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign'
    });
  }
});

// Delete campaign
router.delete('/campaigns/:id', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign'
    });
  }
});

// Launch campaign
router.post('/campaigns/:id/launch', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot be launched in current status'
      });
    }

    campaign.status = 'active';
    campaign.sentAt = new Date();
    
    // Simulate sending metrics (in real app, this would integrate with email service)
    const baseRecipients = Math.floor(Math.random() * 1000) + 100;
    campaign.metrics.sent = baseRecipients;
    campaign.metrics.delivered = Math.floor(baseRecipients * 0.95);
    campaign.metrics.opened = Math.floor(baseRecipients * 0.25);
    campaign.metrics.clicked = Math.floor(baseRecipients * 0.05);
    campaign.metrics.conversions = Math.floor(baseRecipients * 0.02);

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign launched successfully'
    });
  } catch (error) {
    console.error('Error launching campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to launch campaign'
    });
  }
});

module.exports = router;
