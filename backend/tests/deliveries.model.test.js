jest.mock('../src/config/db', () => ({
  pool: {},
  withTransaction: jest.fn(),
}));

const { withTransaction } = require('../src/config/db');
const deliveriesModel = require('../src/models/deliveries.model');

let client;

function queueResults(...results) {
  client = { query: jest.fn() };
  results.forEach((rows) => client.query.mockResolvedValueOnce({ rows }));
  withTransaction.mockImplementation((fn) => fn(client));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('deliveriesModel.claimDelivery', () => {
  it('rejects a helper who already has an active order', async () => {
    queueResults([{ user_id: 7 }], [{ order_id: 5 }]);

    await expect(
      deliveriesModel.claimDelivery({ orderId: 42, helperId: 7 })
    ).rejects.toMatchObject({ code: 'HELPER_HAS_ACTIVE_ORDER' });

    // Helper lookup and active-order check only: nothing was inserted or updated.
    expect(client.query).toHaveBeenCalledTimes(2);
    const [activeSql, activeParams] = client.query.mock.calls[1];
    expect(activeSql).toMatch(/helper_id = \$1 AND status = ANY\(\$2\)/);
    expect(activeParams).toEqual([7, ['Assigned', 'Shopping', 'Out_for_Delivery']]);
  });

  it('locks the helper row so concurrent claims are serialized', async () => {
    queueResults([]);

    await expect(
      deliveriesModel.claimDelivery({ orderId: 42, helperId: 7 })
    ).rejects.toMatchObject({ code: 'NOT_A_HELPER' });

    expect(client.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
  });

  it('claims the order when the helper has no active order', async () => {
    const delivery = { delivery_id: 11, order_id: 42, helper_id: 7 };
    queueResults(
      [{ user_id: 7 }],
      [],
      [{ order_id: 42, status: 'Paid', helper_id: null }],
      [delivery],
      []
    );

    await expect(
      deliveriesModel.claimDelivery({ orderId: 42, helperId: 7 })
    ).resolves.toEqual(delivery);
    expect(client.query).toHaveBeenCalledTimes(5);
  });
});
