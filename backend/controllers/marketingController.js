const Campaign = require('../models/Campaign');
const logger = require('../utils/logger');
const Event = require('../models/Event');

const assertCampaignAccess = async (user, campaignId) => {
    const query = { _id: campaignId };
    if (user.role !== 'admin') {
        query.createdBy = user._id;
    }
    const campaign = await Campaign.findOne(query);
    if (!campaign) {
        const err = new Error('Campaign not found');
        err.status = 404;
        throw err;
    }
    return campaign;
};

const assertEventOwnershipIfProvided = async (user, eventId) => {
    if (!eventId) return;
    const event = await Event.findById(eventId).select('organizer');
    if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
    }
    if (user.role !== 'admin' && String(event.organizer) !== String(user._id)) {
        const err = new Error('Not authorized to manage campaigns for this event');
        err.status = 403;
        throw err;
    }
};

// @desc    Get marketing campaigns and stats
// @access  Private
exports.getCampaigns = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
        const campaigns = await Campaign.find(query)
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

        // Revenue tracking requires real payment integration — show 0 until implemented
        stats.revenue = 0;

        res.json({
            success: true,
            data: {
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
            }
        });
    } catch (error) {
        logger.error('Error fetching marketing campaigns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch marketing campaigns'
        });
    }
};

// @desc    Create new campaign
// @access  Private
exports.createCampaign = async (req, res) => {
    try {
        const { name, type, eventId, eventName, subject, content, targetAudience, scheduledAt } = req.body;

        await assertEventOwnershipIfProvided(req.user, eventId);

        const campaign = new Campaign({
            name,
            type,
            eventId,
            eventName,
            subject,
            content,
            targetAudience: targetAudience || 'all',
            scheduledAt,
            createdBy: req.user._id
        });

        await campaign.save();

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: {
                campaign: {
                    id: campaign._id,
                    name: campaign.name,
                    type: campaign.type,
                    status: campaign.status,
                    eventName: campaign.eventName,
                    createdAt: campaign.createdAt
                }
            }
        });
    } catch (error) {
        logger.error('Error creating campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign'
        });
    }
};

// @desc    Get specific campaign
// @access  Private
exports.getCampaignById = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') {
            query.createdBy = req.user._id;
        }
        const campaign = await Campaign.findOne(query).populate('eventId', 'title');

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.json({
            success: true,
            data: {
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
            }
        });
    } catch (error) {
        logger.error('Error fetching campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign'
        });
    }
};

// @desc    Update campaign
// @access  Private
exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await assertCampaignAccess(req.user, req.params.id);

        // Don't allow editing sent campaigns
        if (campaign.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit completed campaigns'
            });
        }

        const { name, subject, content, targetAudience, scheduledAt } = req.body;

        // FIX M-07 — Explicit validation for targetAudience and scheduledAt
        if (targetAudience && !['all', 'registered', 'potential', 'vip', 'custom'].includes(targetAudience)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid target audience'
            });
        }

        if (scheduledAt) {
            const parsedDate = new Date(scheduledAt);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid scheduled date'
                });
            }
        }

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
        logger.error('Error updating campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update campaign'
        });
    }
};

// @desc    Delete campaign
// @access  Private
exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await assertCampaignAccess(req.user, req.params.id);
        await campaign.deleteOne();

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete campaign'
        });
    }
};

// @desc    Launch campaign
// @access  Private
exports.launchCampaign = async (req, res) => {
    try {
        const campaign = await assertCampaignAccess(req.user, req.params.id);
        await assertEventOwnershipIfProvided(req.user, campaign.eventId);

        if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Campaign cannot be launched in current status'
            });
        }

        campaign.status = 'active';
        campaign.sentAt = new Date();
        // Note: real email delivery metrics require integration with an email service provider.
        // Metrics (sent, opened, clicked) will remain at 0 until that integration is built.

        await campaign.save();

        res.json({
            success: true,
            message: 'Campaign launched successfully'
        });
    } catch (error) {
        logger.error('Error launching campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to launch campaign'
        });
    }
};
