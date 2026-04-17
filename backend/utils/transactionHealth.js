const mongoose = require('mongoose');
const logger = require('./logger');

let transactionsHealthy = true;
let lastTransactionProbeAt = null;

const isTransactionsHealthy = () => transactionsHealthy;

const probeTransactionCapability = async () => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await session.abortTransaction().catch(() => {});
    transactionsHealthy = true;
    lastTransactionProbeAt = new Date();
    return true;
  } catch (err) {
    transactionsHealthy = false;
    lastTransactionProbeAt = new Date();
    logger.error(`MongoDB transaction capability probe failed: ${err.message}`);
    return false;
  } finally {
    session.endSession();
  }
};

const getTransactionHealthState = () => ({
  healthy: transactionsHealthy,
  lastProbeAt: lastTransactionProbeAt,
});

module.exports = {
  isTransactionsHealthy,
  probeTransactionCapability,
  getTransactionHealthState,
};
