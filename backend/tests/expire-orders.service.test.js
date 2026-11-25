jest.mock('../src/models/orders.model');
const { startExpiringUnpaidOrders } = require('../src/services/expire-orders.service');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('expires on startup and every minute with the configured timeout, then stops', async () => {
  const expire = jest.fn().mockResolvedValue(0);
  const stop = startExpiringUnpaidOrders({ expire, timeoutMinutes: 45 });

  expect(expire).toHaveBeenCalledWith({ timeoutMinutes: 45 });
  await jest.advanceTimersByTimeAsync(60000);
  expect(expire).toHaveBeenCalledTimes(2);
  stop();
  await jest.advanceTimersByTimeAsync(120000);
  expect(expire).toHaveBeenCalledTimes(2);
});

it('logs how many orders were cancelled', async () => {
  const logger = { log: jest.fn(), error: jest.fn() };
  const stop = startExpiringUnpaidOrders({ expire: jest.fn().mockResolvedValue(3), timeoutMinutes: 30, logger });

  await jest.advanceTimersByTimeAsync(0);

  expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('3 unpaid order'));
  stop();
});

it('keeps running after a database failure', async () => {
  const expire = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(0);
  const logger = { log: jest.fn(), error: jest.fn() };
  const stop = startExpiringUnpaidOrders({ expire, timeoutMinutes: 30, logger });

  await jest.advanceTimersByTimeAsync(60000);

  expect(logger.error).toHaveBeenCalledTimes(1);
  expect(expire).toHaveBeenCalledTimes(2);
  stop();
});
