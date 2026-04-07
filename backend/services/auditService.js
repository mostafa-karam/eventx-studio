const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const normalizeActor = (actor) => {
  if (!actor) {
    return {
      userId: undefined,
      actorName: 'System',
      actorRole: 'system',
    };
  }

  if (typeof actor === 'string') {
    return {
      userId: actor,
      actorName: 'System',
      actorRole: 'system',
    };
  }

  return {
    userId: actor._id || actor.id,
    actorName: actor.name || 'System',
    actorRole: actor.role || 'system',
  };
};

const buildEntry = ({ req, actor, action, resource, resourceId, details = {} }) => {
  const normalizedActor = normalizeActor(actor);

  return {
    ...normalizedActor,
    action,
    resource,
    resourceId,
    details,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
    requestMethod: req?.method || 'unknown',
    requestPath: req?.originalUrl || req?.url || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    requestId: req?.id,
    timestamp: new Date(),
  };
};

exports.log = async ({ req, actor, action, resource, resourceId, details = {} }) => {
  try {
    const entry = buildEntry({ req, actor, action, resource, resourceId, details });
    await AuditLog.create(entry);

    logger.info('audit.log.created', {
      audit: entry,
    });
  } catch (error) {
    logger.error(`AuditService error: ${error.message}`);
  }
};

exports.query = async ({
  page = 1,
  limit = 50,
  action,
  resource,
  actor,
  startDate,
  endDate,
} = {}) => {
  const numericPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const filter = {};

  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (actor) filter.userId = actor;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const [rawLogs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const logs = rawLogs.map((log) => ({
    ...log,
    ip: log.ip || log.ipAddress || log.ip_address,
    createdAt: log.createdAt || log.timestamp,
  }));

  return {
    logs,
    pagination: {
      current: numericPage,
      pages: Math.ceil(total / numericLimit),
      total,
    },
  };
};
