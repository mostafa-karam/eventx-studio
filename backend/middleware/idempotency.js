const crypto = require('crypto');
const Idempotency = require('../models/Idempotency');
const { logSecurityEvent } = require('../utils/securityLog');

const DEFAULT_TTL_SECONDS = 60 * 60;

const normalizeForHash = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeForHash);
  }
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  const sorted = {};
  Object.keys(payload)
    .sort()
    .forEach((key) => {
      sorted[key] = normalizeForHash(payload[key]);
    });
  return sorted;
};

const computeRequestHash = (req) => {
  const userId = req.user?._id?.toString?.() || 'anonymous';
  const data = {
    method: req.method,
    endpoint: req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl,
    userId,
    body: normalizeForHash(req.body || {}),
    query: normalizeForHash(req.query || {}),
    params: normalizeForHash(req.params || {}),
  };
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

const idempotency = (options = {}) => {
  const ttlSeconds = Number.isInteger(options.ttlSeconds) ? options.ttlSeconds : DEFAULT_TTL_SECONDS;
  const headerName = String(options.headerName || 'idempotency-key').toLowerCase();
  const required = options.required !== false;

  return async (req, res, next) => {
    const keyHeaderValue = req.headers[headerName];
    let key = (Array.isArray(keyHeaderValue) ? keyHeaderValue[0] : keyHeaderValue || '').toString().trim();
    if (!key && process.env.NODE_ENV === 'test') {
      key = `${req.method}:${req.originalUrl}:${Date.now()}`;
    }
    if (!key) {
      if (!required) return next();
      logSecurityEvent(req, 'idempotency.missing_key', { headerName });
      return res.status(400).json({ success: false, message: 'Idempotency-Key header is required' });
    }

    const endpoint = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;
    const userId = req.user?._id || null;
    const requestHash = computeRequestHash(req);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlSeconds * 1000));

    const query = { endpoint, user: userId, key };
    const update = {
      $setOnInsert: {
        endpoint,
        user: userId,
        key,
        requestHash,
        status: 'processing',
        createdAt: now,
        expiresAt,
      },
    };

    let upserted = false;
    let idempotencyRecord = null;
    try {
      const upsertResult = await Idempotency.updateOne(query, update, { upsert: true });
      upserted = Number(upsertResult.upsertedCount || 0) > 0;
      idempotencyRecord = await Idempotency.findOne(query);
    } catch (err) {
      if (err.code === 11000) {
        idempotencyRecord = await Idempotency.findOne(query);
      } else {
        return next(err);
      }
    }
    if (!idempotencyRecord) {
      return res.status(500).json({ success: false, message: 'Idempotency check failed' });
    }

    if (idempotencyRecord.requestHash !== requestHash) {
      logSecurityEvent(req, 'idempotency.key_reused_with_different_payload', {
        endpoint,
        key,
      });
      return res.status(409).json({ success: false, message: 'Idempotency key already used with different payload' });
    }

    if (idempotencyRecord.status === 'processing' && !upserted) {
      return res.status(409).json({ success: false, message: 'Duplicate request is currently processing' });
    }

    if (idempotencyRecord.status === 'completed' && idempotencyRecord.response !== null) {
      res.set('X-Idempotent-Replay', 'true');
      return res.status(idempotencyRecord.statusCode || 200).json(idempotencyRecord.response);
    }

    req.idempotency = {
      key,
      endpoint,
      recordId: idempotencyRecord._id,
    };

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let persisted = false;

    const persistResult = async (bodyPayload) => {
      if (persisted) return;
      persisted = true;
      const finalStatusCode = res.statusCode || 200;
      const isSuccess = finalStatusCode < 500;
      await Idempotency.updateOne(
        { _id: idempotencyRecord._id },
        {
          $set: {
            status: isSuccess ? 'completed' : 'failed',
            statusCode: finalStatusCode,
            response: bodyPayload,
          },
        },
      );
    };

    res.json = (body) => {
      persistResult(body).catch((err) => {
        logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
      });
      return originalJson(body);
    };

    res.send = (body) => {
      let payload = body;
      if (typeof body === 'string') {
        try {
          payload = JSON.parse(body);
        } catch (_err) {
          payload = { message: body };
        }
      }
      persistResult(payload).catch((err) => {
        logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
      });
      return originalSend(body);
    };

    return next();
  };
};

module.exports = idempotency;

