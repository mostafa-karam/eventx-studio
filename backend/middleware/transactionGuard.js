const config = require('../config');
const { isTransactionsHealthy } = require('../utils/transactionHealth');

const requireHealthyTransactions = (_req, res, next) => {
  if (!config.security.db?.requireTransactions) return next();
  if (isTransactionsHealthy()) return next();
  return res.status(503).json({
    success: false,
    message: 'Critical write paths are temporarily unavailable. Please retry shortly.',
  });
};

module.exports = {
  requireHealthyTransactions,
};
