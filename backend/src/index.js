const app = require('./app');
const config = require('./config');
const { startDelayNotifications } = require('./services/delay-notifications.service');

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  const stop = startDelayNotifications();
  server.once('close', stop);
});
