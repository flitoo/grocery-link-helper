jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
  withTransaction: jest.fn(),
}));

const { pool, withTransaction } = require('../src/config/db');
const ordersModel = require('../src/models/orders.model');
const paymentsModel = require('../src/models/payments.model');

beforeEach(() => {
  jest.resetAllMocks();
});

// getOrderById runs two queries (the order, then its items); a role lookup
// follows only when the caller is neither the customer nor the helper.
function queueOrder(order, role) {
  pool.query.mockResolvedValueOnce({ rows: order ? [order] : [] });
  if (order) {
    pool.query.mockResolvedValueOnce({ rows: [] });
  }
  if (role !== undefined) {
    pool.query.mockResolvedValueOnce({ rows: role ? [{ role }] : [] });
  }
}

describe('ordersModel.getOrderForViewer', () => {
  it('returns undefined for a missing order', async () => {
    queueOrder(undefined);

    await expect(ordersModel.getOrderForViewer(42, 1)).resolves.toBeUndefined();
  });

  it('returns the order to its customer', async () => {
    queueOrder({ order_id: 42, customer_id: 1, helper_id: null, status: 'Pending' });

    const order = await ordersModel.getOrderForViewer(42, 1);

    expect(order.order_id).toBe(42);
  });

  it('returns the order to its assigned helper', async () => {
    queueOrder({ order_id: 42, customer_id: 1, helper_id: 7, status: 'Shopping' });

    await expect(ordersModel.getOrderForViewer(42, 7)).resolves.toMatchObject({ order_id: 42 });
  });

  it('lets any helper preview a Paid, unclaimed order', async () => {
    queueOrder({ order_id: 42, customer_id: 1, helper_id: null, status: 'Paid' }, 'Helper');

    await expect(ordersModel.getOrderForViewer(42, 9)).resolves.toMatchObject({ order_id: 42 });
  });

  it('hides a Paid, unclaimed order from another customer', async () => {
    queueOrder({ order_id: 42, customer_id: 1, helper_id: null, status: 'Paid' }, 'Customer');

    await expect(ordersModel.getOrderForViewer(42, 2)).resolves.toBeUndefined();
  });

  it.each([
    ['Pending', null],
    ['Assigned', 7],
    ['Delivered', 7],
  ])('hides a %s order (helper %s) from a stranger without a role lookup', async (status, helperId) => {
    queueOrder({ order_id: 42, customer_id: 1, helper_id: helperId, status });

    await expect(ordersModel.getOrderForViewer(42, 9)).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

describe('paymentsModel ownership', () => {
  let client;

  function queueTransaction(...results) {
    client = { query: jest.fn() };
    results.forEach((rows) => client.query.mockResolvedValueOnce({ rows }));
    withTransaction.mockImplementation((fn) => fn(client));
  }

  it('createPayment rejects a customer who does not own the order', async () => {
    queueTransaction([{ total_amount: '12.00', status: 'Pending', customer_id: 1 }]);

    await expect(
      paymentsModel.createPayment({
        orderId: 42,
        customerId: 2,
        transactionRef: 'ref',
        paymentMethod: 'credit',
      })
    ).rejects.toMatchObject({ code: 'NOT_ORDER_OWNER' });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('createPayment inserts for the owner', async () => {
    queueTransaction(
      [{ total_amount: '12.00', status: 'Pending', customer_id: 1 }],
      [{ payment_id: 7, order_id: 42 }]
    );

    await expect(
      paymentsModel.createPayment({
        orderId: 42,
        customerId: 1,
        transactionRef: 'ref',
        paymentMethod: 'credit',
      })
    ).resolves.toMatchObject({ payment_id: 7 });
  });

  it('confirmDemoPayment rejects a user who does not own the order', async () => {
    queueTransaction([{ order_id: 42, status: 'Pending', customer_id: 1 }]);

    await expect(paymentsModel.confirmDemoPayment(42, 2)).rejects.toMatchObject({
      code: 'NOT_ORDER_OWNER',
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it("getPaymentByOrderId limits the query to the order's customer or helper", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(paymentsModel.getPaymentByOrderId(42, 9)).resolves.toBeUndefined();

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/customer_id = \$2 OR o\.helper_id = \$2/);
    expect(params).toEqual([42, 9]);
  });
});
