jest.mock('../src/models/orders.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');

function token(userId = 3) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

function cancel(orderId, authToken = token()) {
  const req = request(app).post(`/api/orders/${orderId}/cancel`);
  if (authToken) req.set('Authorization', `Bearer ${authToken}`);
  return req.send();
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/orders/:id/cancel', () => {
  it('cancels the caller\'s own unpaid order', async () => {
    ordersModel.cancelOrder.mockResolvedValue({ order_id: 42, customer_id: 3, status: 'Cancelled' });

    const res = await cancel(42);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Cancelled');
    expect(ordersModel.cancelOrder).toHaveBeenCalledWith({ orderId: 42, customerId: 3 });
  });

  it('requires a login', async () => {
    const res = await cancel(42, null);

    expect(res.status).toBe(401);
    expect(ordersModel.cancelOrder).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '2147483648', '1e3'])('rejects order id %s', async (id) => {
    const res = await cancel(id);

    expect(res.status).toBe(400);
    expect(ordersModel.cancelOrder).not.toHaveBeenCalled();
  });

  it('answers 404 for a missing order or one that belongs to someone else', async () => {
    ordersModel.cancelOrder.mockResolvedValue(undefined);

    const res = await cancel(42);

    expect(res.status).toBe(404);
  });

  it('answers 409 when the order is no longer unpaid', async () => {
    const error = new Error('Only unpaid orders can be cancelled. This order is Paid.');
    error.code = 'ORDER_NOT_CANCELLABLE';
    ordersModel.cancelOrder.mockRejectedValue(error);

    const res = await cancel(42);

    expect(res.status).toBe(409);
    expect(res.body.errors).toEqual([error.message]);
  });

  it('hides unexpected errors', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    ordersModel.cancelOrder.mockRejectedValue(new Error('db down'));

    const res = await cancel(42);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/db down/);
    spy.mockRestore();
  });
});
