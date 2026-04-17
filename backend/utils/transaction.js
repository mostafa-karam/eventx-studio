const mongoose = require('mongoose');
const logger = require('./logger');

const MAX_RETRIES = 3;
const TRANSIENT_ERROR_LABELS = ['TransientTransactionError', 'UnknownTransactionCommitResult'];

const isTransientTransactionError = (error) => {
  if (!error) return false;
  if (typeof error.hasErrorLabel === 'function') {
    return TRANSIENT_ERROR_LABELS.some((label) => error.hasErrorLabel(label));
  }
  return false;
};

const isTransactionUnsupportedError = (error) => {
  if (!error) return false;
  return error.code === 20 || /Transaction numbers are only allowed/i.test(error.message || '');
};

const withTransactionRetry = async (handler, options = {}) => {
  const retries = Number.isInteger(options.retries) ? options.retries : MAX_RETRIES;
  const allowFallback = options.allowFallback === true;
  let attempt = 0;

  while (attempt < retries) {
    attempt += 1;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await handler(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction().catch(() => {});

      if (allowFallback && isTransactionUnsupportedError(error)) {
        logger.warn('MongoDB transactions unsupported, falling back to non-transactional execution');
        return handler(null);
      }

      if (attempt < retries && isTransientTransactionError(error)) {
        logger.warn('Retrying transient MongoDB transaction failure', {
          attempt,
          maxAttempts: retries,
          message: error.message,
        });
        continue;
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  throw new Error('Transaction failed after maximum retry attempts');
};

module.exports = {
  withTransactionRetry,
  isTransientTransactionError,
};
