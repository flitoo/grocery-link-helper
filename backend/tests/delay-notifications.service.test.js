jest.mock('../src/models/notifications.model');
const { startDelayNotifications } = require('../src/services/delay-notifications.service');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('scans on startup, then every minute, and stops cleanly', async () => {
  const scan = jest.fn().mockResolvedValue(1);
  const stop = startDelayNotifications({ scan });
  expect(scan).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(59999);
  expect(scan).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(scan).toHaveBeenCalledTimes(2);
  stop();
  await jest.advanceTimersByTimeAsync(120000);
  expect(scan).toHaveBeenCalledTimes(2);
});
it('does not overlap scans and does not restart after stopping an in-flight scan', async () => {
  let finish;
  const scan = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const stop = startDelayNotifications({ scan });
  await jest.advanceTimersByTimeAsync(180000);
  expect(scan).toHaveBeenCalledTimes(1);
  stop(); finish(0);
  await jest.advanceTimersByTimeAsync(120000);
  expect(scan).toHaveBeenCalledTimes(1);
});
it('recovers from a database failure on the next scheduled scan', async () => {
  const scan = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(0);
  const logger = { error: jest.fn() };
  const stop = startDelayNotifications({ scan, logger });
  await jest.advanceTimersByTimeAsync(60000);
  expect(logger.error).toHaveBeenCalledTimes(1);
  expect(scan).toHaveBeenCalledTimes(2);
  stop();
});
