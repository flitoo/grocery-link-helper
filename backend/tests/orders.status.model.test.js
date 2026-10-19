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
  withTransaction.mockImplementation((fn) => fn(client));
}

function update(nextStatus, helperId = 7) {
  return ordersModel.updateDeliveryStatus({ orderId: 42, helperId, nextStatus });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ordersModel.updateDeliveryStatus', () => {
  it('locks the order row before checking it', async () => {
    queueResults([]);

    await expect(update('Shopping')).resolves.toBeUndefined();

    expect(client.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
  });

  it('rejects a helper who is not assigned to the order', async () => {
    queueResults([{ order_id: 42, helper_id: 8, status: 'Assigned' }]);

    await expect(update('Shopping')).rejects.toMatchObject({ code: 'NOT_ASSIGNED_HELPER' });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects any helper on an unassigned order', async () => {
    queueResults([{ order_id: 42, helper_id: null, status: 'Paid' }]);

    await expect(update('Shopping')).rejects.toMatchObject({ code: 'NOT_ASSIGNED_HELPER' });
  });

  it.each([
    ['Assigned', 'Out_for_Delivery'],
    ['Assigned', 'Delivered'],
    ['Shopping', 'Delivered'],
    ['Shopping', 'Shopping'],
    ['Out_for_Delivery', 'Shopping'],
    ['Delivered', 'Delivered'],
    ['Paid', 'Shopping'],
    ['Cancelled', 'Shopping'],
  ])('rejects %s -> %s', async (current, next) => {
    queueResults([{ order_id: 42, helper_id: 7, status: current }]);

    await expect(update(next)).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Assigned', 'Shopping'],
    ['Shopping', 'Out_for_Delivery'],
  ])('allows %s -> %s without touching deliveries', async (current, next) => {
    queueResults(
      [{ order_id: 42, helper_id: 7, status: current }],
      [{ order_id: 42, helper_id: 7, status: next }]
    );

    await expect(update(next)).resolves.toEqual({ order_id: 42, helper_id: 7, status: next });
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('completes the delivery record when the order is delivered', async () => {
    queueResults(
      [{ order_id: 42, helper_id: 7, status: 'Out_for_Delivery' }],
      [{ order_id: 42, helper_id: 7, status: 'Delivered' }],
      []
    );

    await expect(update('Delivered')).resolves.toMatchObject({ status: 'Delivered' });

    const [sql, params] = client.query.mock.calls[2];
    expect(sql).toMatch(/UPDATE deliveries SET delivery_status = 'Completed'/);
    expect(params).toEqual([42, 7]);
  });
});
