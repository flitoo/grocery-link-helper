const app = require('./app');
const config = require('./config');
const { startDelayNotifications } = require('./services/delay-notifications.service');
const { startExpiringUnpaidOrders } = require('./services/expire-orders.service');

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  const stopDelayScan = startDelayNotifications();
  const stopExpiry = startExpiringUnpaidOrders();
  server.once('close', () => {
    stopDelayScan();
    stopExpiry();
  });
});
