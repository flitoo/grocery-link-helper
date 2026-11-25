const { generateDelayNotifications } = require('../models/notifications.model');
const { startPeriodicTask } = require('./periodic-task.service');

function startDelayNotifications({ scan = generateDelayNotifications, intervalMs = 60000, logger = console } = {}) {
  return startPeriodicTask({ task: scan, intervalMs, logger, errorMessage: 'Delay notification scan failed:' });
}

module.exports = { startDelayNotifications };
