jest.mock('../src/models/deliveries.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const deliveriesModel = require('../src/models/deliveries.model');

function helperToken(userId = 7) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/deliveries/:orderId/claim', () => {
  it('claims an available order for the authenticated helper', async () => {
    deliveriesModel.claimDelivery.mockResolvedValue({
      delivery_id: 11,
      order_id: 42,
      helper_id: 7,
      delivery_status: 'In_Transit',
    });

    const res = await request(app)
      .post('/api/deliveries/42/claim')
      .set('Authorization', `Bearer ${helperToken()}`);

    expect(res.status).toBe(201);
    expect(res.body.delivery_id).toBe(11);
    expect(deliveriesModel.claimDelivery).toHaveBeenCalledWith({
      orderId: 42,
      helperId: 7,
    });
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/deliveries/42/claim');

    expect(res.status).toBe(401);
    expect(deliveriesModel.claimDelivery).not.toHaveBeenCalled();
  });

  it('rejects an invalid order id', async () => {
    const res = await request(app)
      .post('/api/deliveries/nope/claim')
      .set('Authorization', `Bearer ${helperToken()}`);

    expect(res.status).toBe(400);
    expect(deliveriesModel.claimDelivery).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    deliveriesModel.claimDelivery.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/deliveries/999/claim')
      .set('Authorization', `Bearer ${helperToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when the helper already has an active order', async () => {
    const error = new Error('Helper already has an active order.');
    error.code = 'HELPER_HAS_ACTIVE_ORDER';
    deliveriesModel.claimDelivery.mockRejectedValue(error);

    const res = await request(app)
      .post('/api/deliveries/42/claim')
      .set('Authorization', `Bearer ${helperToken()}`);

    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toMatch(/active order/i);
  });

  it('returns 409 when the order is already claimed or not paid', async () => {
    const error = new Error('Order is not available to claim.');
    error.code = 'ORDER_NOT_AVAILABLE';
    deliveriesModel.claimDelivery.mockRejectedValue(error);

    const res = await request(app)
      .post('/api/deliveries/42/claim')
      .set('Authorization', `Bearer ${helperToken()}`);

    expect(res.status).toBe(409);
  });
});
