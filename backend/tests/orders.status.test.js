jest.mock('../src/models/orders.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');

function token(userId = 7) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

function patchStatus(orderId, body, authToken = token()) {
  const req = request(app).patch(`/api/orders/${orderId}/status`);
  if (authToken) {
    req.set('Authorization', `Bearer ${authToken}`);
  }
  return req.send(body);
}

function modelError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PATCH /api/orders/:id/status', () => {
  it('advances the order for the authenticated helper', async () => {
    ordersModel.updateDeliveryStatus.mockResolvedValue({
      order_id: 42,
      helper_id: 7,
      status: 'Shopping',
    });

    const res = await patchStatus(42, { status: 'Shopping' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Shopping');
    expect(ordersModel.updateDeliveryStatus).toHaveBeenCalledWith({
      orderId: 42,
      helperId: 7,
      nextStatus: 'Shopping',
    });
  });

  it('requires authentication', async () => {
    const res = await patchStatus(42, { status: 'Shopping' }, null);

    expect(res.status).toBe(401);
    expect(ordersModel.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it.each([
    ['a non-numeric order id', 'nope', { status: 'Shopping' }],
    ['a zero order id', 0, { status: 'Shopping' }],
    ['a missing status', 42, {}],
    ['an unknown status', 42, { status: 'Teleported' }],
    ['a status helpers cannot set', 42, { status: 'Cancelled' }],
    ['a status that is not a string', 42, { status: ['Shopping'] }],
  ])('rejects %s with 400', async (_label, orderId, body) => {
    const res = await patchStatus(orderId, body);

    expect(res.status).toBe(400);
    expect(ordersModel.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    ordersModel.updateDeliveryStatus.mockResolvedValue(undefined);

    const res = await patchStatus(999, { status: 'Shopping' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when the caller is not the assigned helper', async () => {
    ordersModel.updateDeliveryStatus.mockRejectedValue(
      modelError('NOT_ASSIGNED_HELPER', 'Only the assigned helper may update this order.')
    );

    const res = await patchStatus(42, { status: 'Shopping' });

    expect(res.status).toBe(403);
  });

  it('returns 409 for a skipped or repeated transition', async () => {
    ordersModel.updateDeliveryStatus.mockRejectedValue(
      modelError('INVALID_STATUS_TRANSITION', 'Invalid status transition.')
    );

    const res = await patchStatus(42, { status: 'Delivered' });

    expect(res.status).toBe(409);
  });

  it('returns 500 on an unexpected failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    ordersModel.updateDeliveryStatus.mockRejectedValue(new Error('db down'));

    const res = await patchStatus(42, { status: 'Shopping' });

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
