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
  jest.resetAllMocks();
});

describe('Substitution validation and failure cases', () => {
  const payload = { original_item_id: 10, suggested_item_name: 'Oat milk', price_difference: 0.5 };
  const endpoints = [
    ['get', '/orders/42', 'listOrderSubstitutionRequests'],
    ['post', '/orders/42', 'createSubstitutionRequest'],
    ['patch', '/orders/42/5', 'respondToSubstitutionRequest'],
  ];
  const call = (method, path, body = payload, authToken = token()) => {
    const req = request(app)[method](`/api/substitution-requests${path}`);
    if (authToken) req.set('Authorization', `Bearer ${authToken}`);
    return req.send(body);
  };
  it.each(endpoints)('%s requires login and rejects expired tokens', async (method, path, modelMethod) => {
    expect((await call(method, path, payload, null)).status).toBe(401);
    const expired = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: -1 });
    expect((await call(method, path, payload, expired)).status).toBe(401);
    expect(substitutionRequestsModel[modelMethod]).not.toHaveBeenCalled();
  });
  it.each(endpoints)('%s validates IDs before persistence', async (method, path, modelMethod) => {
    for (const id of ['0', '-1', '1e3', '1.5', '2147483648']) {
      expect((await call(method, path.replace('42', id))).status).toBe(400);
    }
    expect(substitutionRequestsModel[modelMethod]).not.toHaveBeenCalled();
  });
  it.each([null, 12, '', '  ', 'x'.repeat(151)])('rejects an invalid replacement name %j', async suggested_item_name => {
    expect((await call('post', '/orders/42', { ...payload, suggested_item_name })).status).toBe(400);
    expect(substitutionRequestsModel.createSubstitutionRequest).not.toHaveBeenCalled();
  });
  it.each([undefined, null, '0.50', true, 100000000, -100000000, 0.001])('rejects an invalid price difference %j', async price_difference => {
    expect((await call('post', '/orders/42', { ...payload, price_difference })).status).toBe(400);
    expect(substitutionRequestsModel.createSubstitutionRequest).not.toHaveBeenCalled();
  });
  it.each([-99999999.99, -0.29, 0, 0.29, 99999999.99])('accepts supported price difference %s', async price_difference => {
    substitutionRequestsModel.createSubstitutionRequest.mockResolvedValue({ substitution_id: 5, status: 'Pending' });
    const res = await call('post', '/orders/42', { ...payload, price_difference, helper_id: 999, status: 'Approved' });
    expect(res.status).toBe(201);
    expect(substitutionRequestsModel.createSubstitutionRequest).toHaveBeenCalledWith({
      orderId: 42, helperId: 7, originalItemId: 10, suggestedItemName: 'Oat milk', priceDifference: price_difference,
    });
  });
  it('returns an empty list for an accessible order without requests', async () => {
    substitutionRequestsModel.listOrderSubstitutionRequests.mockResolvedValue([]);
    const res = await call('get', '/orders/42');
    expect(res.status).toBe(200); expect(res.body).toEqual([]);
  });
  it.each(endpoints)('%s hides missing or inaccessible resources', async (method, path, modelMethod) => {
    substitutionRequestsModel[modelMethod].mockResolvedValue(undefined);
    expect((await call(method, path, method === 'patch' ? { status: 'Approved' } : payload)).status).toBe(404);
  });
  it('returns a conflict when a pending or approved replacement already exists', async () => {
    substitutionRequestsModel.createSubstitutionRequest.mockRejectedValue(Object.assign(new Error(), { code: 'SUBSTITUTION_EXISTS' }));
    const res = await call('post', '/orders/42');
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toContain('already has');
  });
  it('validates the substitution ID and does not trust a body owner override', async () => {
    expect((await call('patch', '/orders/42/0', { status: 'Rejected' })).status).toBe(400);
    substitutionRequestsModel.respondToSubstitutionRequest.mockResolvedValue({ status: 'Rejected' });
    expect((await call('patch', '/orders/42/5', { status: 'Rejected', customer_id: 999 })).status).toBe(200);
    expect(substitutionRequestsModel.respondToSubstitutionRequest).toHaveBeenCalledWith({
      orderId: 42, substitutionId: 5, customerId: 7, status: 'Rejected',
    });
  });
  it.each(endpoints)('%s returns a safe error when persistence fails', async (method, path, modelMethod) => {
    substitutionRequestsModel[modelMethod].mockRejectedValue(new Error('private database details'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await call(method, path, method === 'patch' ? { status: 'Approved' } : payload);
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain('private database details');
    } finally { spy.mockRestore(); }
  });
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
