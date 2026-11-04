jest.mock('../src/models/orders.model');
jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
  withTransaction: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');
const { pool } = require('../src/config/db');

function token(userId = 7) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

function getAvailable(authToken = token()) {
  const req = request(app).get('/api/orders/available');
  if (authToken) {
    req.set('Authorization', `Bearer ${authToken}`);
  }
  return req;
}

function mockRole(role) {
  pool.query.mockResolvedValue({ rows: role ? [{ role }] : [] });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/orders/available', () => {
  it('returns paid, unclaimed orders to a helper', async () => {
    mockRole('Helper');
    const orders = [{ order_id: 5, status: 'Paid', helper_id: null, store_name: 'No Frills' }];
    ordersModel.getAvailableOrders.mockResolvedValue(orders);

    const res = await getAvailable();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orders });
  });

  it('returns 401 without a token', async () => {
    const res = await getAvailable(null);

    expect(res.status).toBe(401);
    expect(ordersModel.getAvailableOrders).not.toHaveBeenCalled();
  });

  it('returns 403 for a customer', async () => {
    mockRole('Customer');

    const res = await getAvailable();

    expect(res.status).toBe(403);
    expect(ordersModel.getAvailableOrders).not.toHaveBeenCalled();
  });

  it('is not swallowed by the /:id route', async () => {
    mockRole('Helper');
    ordersModel.getAvailableOrders.mockResolvedValue([]);

    const res = await getAvailable();

    expect(res.status).toBe(200);
    expect(ordersModel.getOrderById).not.toHaveBeenCalled();
  });

  it('returns 500 when the query fails', async () => {
    mockRole('Helper');
    ordersModel.getAvailableOrders.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await getAvailable();

    expect(res.status).toBe(500);
    console.error.mockRestore();
  });
});
