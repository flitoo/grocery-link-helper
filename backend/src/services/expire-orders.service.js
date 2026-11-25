const config = require('../config');
const { expireUnpaidOrders } = require('../models/orders.model');
const { startPeriodicTask } = require('./periodic-task.service');

/** Cancels orders left unpaid past the timeout so they stop holding delivery slots. */
function startExpiringUnpaidOrders({
  expire = expireUnpaidOrders,
  timeoutMinutes = config.orders.paymentTimeoutMinutes,
  intervalMs = 60000,
  logger = console,
} = {}) {
  return startPeriodicTask({
    task: async () => {
      const count = await expire({ timeoutMinutes });
      if (count > 0) logger.log?.(`Cancelled ${count} unpaid order(s) older than ${timeoutMinutes} minutes.`);
    },
    intervalMs,
    logger,
    errorMessage: 'Unpaid order expiry failed:',
  });
}

module.exports = { startExpiringUnpaidOrders };
