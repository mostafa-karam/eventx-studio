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
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const [campaigns, totalCampaigns, allMetrics] = await Promise.all([
            Campaign.find(query)
                .populate('eventId', 'title')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Campaign.countDocuments(query),
            Campaign.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalCampaigns: { $sum: 1 },
                        activeCampaigns: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        totalRecipients: { $sum: '$metrics.sent' },
                        totalOpened: { $sum: '$metrics.opened' },
                        totalClicked: { $sum: '$metrics.clicked' },
                        totalConversions: { $sum: '$metrics.conversions' }
                    }
                }
            ])
        ]);

        // Calculate overall stats
        const metrics = allMetrics[0] || {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalRecipients: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalConversions: 0
        };
        const stats = {
            totalCampaigns: metrics.totalCampaigns,
            activeCampaigns: metrics.activeCampaigns,
            totalRecipients: metrics.totalRecipients,
            avgOpenRate: metrics.totalRecipients > 0
                ? Math.round((metrics.totalOpened / metrics.totalRecipients) * 100)
                : 0,
            avgClickRate: metrics.totalRecipients > 0
                ? Math.round((metrics.totalClicked / metrics.totalRecipients) * 100)
                : 0,
            avgConversionRate: metrics.totalRecipients > 0
                ? Math.round((metrics.totalConversions / metrics.totalRecipients) * 100)
                : 0,
            totalConversions: metrics.totalConversions,
            revenue: 0
        };

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
                stats,
                pagination: {
                    current: page,
                    pages: Math.max(1, Math.ceil(totalCampaigns / limit)),
                    total: totalCampaigns,
                    limit
                }
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

        if (name !== undefined) campaign.name = name;
        if (subject !== undefined) campaign.subject = subject;
        if (content !== undefined) campaign.content = content;
        if (targetAudience !== undefined) campaign.targetAudience = targetAudience;
        if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt;

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
