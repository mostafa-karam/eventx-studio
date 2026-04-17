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
  const endpointPath = `${req.baseUrl || ''}${req.path || ''}`;
  const data = {
    method: req.method,
    endpoint: endpointPath,
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
  const awaitPersist = options.awaitPersist === true;
  const processingTimeoutMs = Number.isFinite(Number(options.processingTimeoutMs))
    ? Number(options.processingTimeoutMs)
    : 2 * 60 * 1000;

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

    const endpoint = `${req.baseUrl || ''}${req.path || ''}`;
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
      const staleCutoff = new Date(now.getTime() - processingTimeoutMs);
      const isStale = idempotencyRecord.createdAt && idempotencyRecord.createdAt <= staleCutoff;
      if (!isStale) {
        return res.status(409).json({ success: false, message: 'Duplicate request is currently processing' });
      }

      // Mark stale processing records as failed, then safely re-acquire processing state.
      await Idempotency.updateOne(
        { _id: idempotencyRecord._id, status: 'processing', createdAt: idempotencyRecord.createdAt },
        {
          $set: {
            status: 'failed',
            statusCode: 409,
            response: { success: false, message: 'Previous request timed out while processing' },
          },
        },
      );
      const reclaimed = await Idempotency.findOneAndUpdate(
        { _id: idempotencyRecord._id, status: 'failed', requestHash },
        {
          $set: {
            status: 'processing',
            createdAt: now,
            expiresAt,
            response: null,
            statusCode: null,
          },
        },
        { new: true },
      );
      if (!reclaimed) {
        return res.status(409).json({ success: false, message: 'Duplicate request is currently processing' });
      }
      idempotencyRecord = reclaimed;
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
      if (!awaitPersist) {
        persistResult(body).catch((err) => {
          logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
        });
        return originalJson(body);
      }

      persistResult(body)
        .then(() => originalJson(body))
        .catch((err) => {
          logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
          if (!res.headersSent) {
            res.status(503);
            originalJson({ success: false, message: 'Request result could not be persisted safely' });
          }
        });
      return res;
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
      if (!awaitPersist) {
        persistResult(payload).catch((err) => {
          logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
        });
        return originalSend(body);
      }

      persistResult(payload)
        .then(() => originalSend(body))
        .catch((err) => {
          logSecurityEvent(req, 'idempotency.persist_failed', { reason: err.message });
          if (!res.headersSent) {
            res.status(503);
            originalJson({ success: false, message: 'Request result could not be persisted safely' });
          }
        });
      return res;
    };

    return next();
  };
};

module.exports = idempotency;

