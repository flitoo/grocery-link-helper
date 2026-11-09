jest.mock('../src/models/substitution-requests.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const substitutionRequestsModel = require('../src/models/substitution-requests.model');

function token(userId = 7) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/substitution-requests/orders/:orderId', () => {
  it('returns substitution requests for an authenticated order participant', async () => {
    substitutionRequestsModel.listOrderSubstitutionRequests.mockResolvedValue([
      { substitution_id: 5, order_id: 42, status: 'Pending' },
    ]);

    const res = await request(app)
      .get('/api/substitution-requests/orders/42')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(substitutionRequestsModel.listOrderSubstitutionRequests)
      .toHaveBeenCalledWith({ orderId: 42, userId: 7 });
  });
});

describe('POST /api/substitution-requests/orders/:orderId', () => {
  it('creates a substitution request using the authenticated helper id', async () => {
    substitutionRequestsModel.createSubstitutionRequest.mockResolvedValue({
      substitution_id: 5,
      order_id: 42,
      original_item_id: 10,
      suggested_item_name: 'Oat milk',
      price_difference: 0.5,
      status: 'Pending',
    });

    const res = await request(app)
      .post('/api/substitution-requests/orders/42')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        original_item_id: 10,
        suggested_item_name: '  Oat milk ',
        price_difference: 0.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(substitutionRequestsModel.createSubstitutionRequest).toHaveBeenCalledWith({
      orderId: 42,
      helperId: 7,
      originalItemId: 10,
      suggestedItemName: 'Oat milk',
      priceDifference: 0.5,
    });
  });

  it('rejects an invalid item id before calling the model', async () => {
    const res = await request(app)
      .post('/api/substitution-requests/orders/42')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        original_item_id: '0x10',
        suggested_item_name: 'Oat milk',
        price_difference: 0.5,
      });

    expect(res.status).toBe(400);
    expect(substitutionRequestsModel.createSubstitutionRequest).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/substitution-requests/orders/42')
      .send({
        original_item_id: 10,
        suggested_item_name: 'Oat milk',
        price_difference: 0.5,
      });

    expect(res.status).toBe(401);
    expect(substitutionRequestsModel.createSubstitutionRequest).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/substitution-requests/orders/:orderId/:substitutionId', () => {
  it('lets the authenticated customer decide a pending request', async () => {
    substitutionRequestsModel.respondToSubstitutionRequest.mockResolvedValue({
      substitution_id: 5,
      order_id: 42,
      status: 'Approved',
    });

    const res = await request(app)
      .patch('/api/substitution-requests/orders/42/5')
      .set('Authorization', `Bearer ${token(3)}`)
      .send({ status: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
    expect(substitutionRequestsModel.respondToSubstitutionRequest).toHaveBeenCalledWith({
      orderId: 42,
      substitutionId: 5,
      customerId: 3,
      status: 'Approved',
    });
  });

  it('rejects decisions other than Approved or Rejected', async () => {
    const res = await request(app)
      .patch('/api/substitution-requests/orders/42/5')
      .set('Authorization', `Bearer ${token(3)}`)
      .send({ status: 'Pending' });

    expect(res.status).toBe(400);
    expect(substitutionRequestsModel.respondToSubstitutionRequest).not.toHaveBeenCalled();
  });
});
