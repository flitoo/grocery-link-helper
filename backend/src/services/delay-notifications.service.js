const { generateDelayNotifications } = require('../models/notifications.model');

function startDelayNotifications({ scan = generateDelayNotifications, intervalMs = 60000, logger = console } = {}) {
  let stopped = false;
  let timer;
  async function tick() {
    try { await scan(); }
    catch (error) { logger.error('Delay notification scan failed:', error); }
    finally {
      // Schedule after completion; slow scans never overlap.
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
        timer.unref?.();
      }
    }
  }
  void tick();
  return () => { stopped = true; clearTimeout(timer); };
}

module.exports = { startDelayNotifications };
