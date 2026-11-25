jest.mock('../src/config/db', () => ({
  pool: {},
  withTransaction: jest.fn(),
}));

const { withTransaction } = require('../src/config/db');
const ordersModel = require('../src/models/orders.model');

let client;

function queueResults(...results) {
  client = { query: jest.fn() };
  results.forEach((rows) => client.query.mockResolvedValueOnce({ rows }));
  client.query.mockResolvedValue({ rows: [] });
  withTransaction.mockImplementation((fn) => fn(client));
}

beforeEach(() => jest.clearAllMocks());

describe('ordersModel.cancelOrder', () => {
  it('locks the row, cancels it and rejects an unconfirmed payment', async () => {
    queueResults(
      [{ order_id: 42, customer_id: 3, status: 'Pending' }],
      [{ order_id: 42, customer_id: 3, status: 'Cancelled' }]
    );

    const order = await ordersModel.cancelOrder({ orderId: 42, customerId: 3 });

    expect(order).toEqual({ order_id: 42, customer_id: 3, status: 'Cancelled' });
    expect(client.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
    expect(client.query.mock.calls[1][0]).toMatch(/SET status = 'Cancelled'/);
    expect(client.query.mock.calls[2][0]).toMatch(/payment_status = 'Rejected'/);
  });

  it('returns undefined for a missing order', async () => {
    queueResults([]);

    await expect(ordersModel.cancelOrder({ orderId: 42, customerId: 3 })).resolves.toBeUndefined();
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('returns undefined, without changing anything, for another customer\'s order', async () => {
    queueResults([{ order_id: 42, customer_id: 9, status: 'Pending' }]);

    await expect(ordersModel.cancelOrder({ orderId: 42, customerId: 3 })).resolves.toBeUndefined();
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it.each(['Paid', 'Assigned', 'Shopping', 'Out_for_Delivery', 'Delivered', 'Cancelled'])(
    'refuses to cancel an order that is %s',
    async (status) => {
      queueResults([{ order_id: 42, customer_id: 3, status }]);

      await expect(ordersModel.cancelOrder({ orderId: 42, customerId: 3 }))
        .rejects.toMatchObject({ code: 'ORDER_NOT_CANCELLABLE' });
      expect(client.query).toHaveBeenCalledTimes(1);
    }
  );
});

describe('ordersModel.expireUnpaidOrders', () => {
  it('cancels the stale orders it finds', async () => {
    queueResults(
      [{ order_id: 5 }, { order_id: 6 }],
      [{ order_id: 5 }, { order_id: 6 }]
    );

    const count = await ordersModel.expireUnpaidOrders({ timeoutMinutes: 30, at: new Date('2026-12-01T12:00:00Z') });

    expect(count).toBe(2);
    expect(client.query.mock.calls[0][0]).toMatch(/SKIP LOCKED/);
    expect(client.query.mock.calls[0][1]).toEqual([new Date('2026-12-01T12:00:00Z'), 30]);
    expect(client.query.mock.calls[1][1]).toEqual([[5, 6]]);
  });

  it('does nothing when no order is stale', async () => {
    queueResults([]);

    await expect(ordersModel.expireUnpaidOrders({ timeoutMinutes: 30 })).resolves.toBe(0);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
