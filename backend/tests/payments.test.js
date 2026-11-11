jest.mock('../src/models/payments.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const paymentsModel = require('../src/models/payments.model');

// Logged-in user id 3 unless another id is passed.
function auth(userId = 3) {
  return { Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/payments', () => {
  it('creates a pending payment for a valid order', async () => {
    paymentsModel.createPayment.mockResolvedValue({
      payment_id: 7,
      order_id: 42,
      transaction_ref: 'gateway-ref-123',
      amount: '12.00',
      payment_status: 'Pending',
      verified_at: null,
    });

    const res = await request(app)
      .post('/api/payments')
      .set(auth())
      .send({
        order_id: 42,
        transaction_ref: ' gateway-ref-123 ',
        payment_method: 'credit',
        amount: 0.01,
        payment_status: 'Verified',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('Pending');
    expect(paymentsModel.createPayment).toHaveBeenCalledWith({
      orderId: 42,
      customerId: 3,
      transactionRef: 'gateway-ref-123',
      paymentMethod: 'credit',
    });
  });

  it('rejects invalid payloads without calling the model', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set(auth())
      .send({ order_id: -1, transaction_ref: ' ' });

    expect(res.status).toBe(400);
    expect(paymentsModel.createPayment).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    paymentsModel.createPayment.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/payments')
      .set(auth())
      .send({ order_id: 999, transaction_ref: 'gateway-ref-999', payment_method: 'credit' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when a payment already exists', async () => {
    const duplicateError = new Error('duplicate key');
    duplicateError.code = '23505';
    paymentsModel.createPayment.mockRejectedValue(duplicateError);

    const res = await request(app)
      .post('/api/payments')
      .set(auth())
      .send({ order_id: 42, transaction_ref: 'gateway-ref-123', payment_method: 'credit' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/payments/:orderId', () => {
  it('returns a payment by order id', async () => {
    paymentsModel.getPaymentByOrderId.mockResolvedValue({
      payment_id: 7,
      order_id: 42,
      payment_status: 'Pending',
    });

    const res = await request(app).get('/api/payments/42').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.payment_id).toBe(7);
    expect(paymentsModel.getPaymentByOrderId).toHaveBeenCalledWith(42, 3);
  });

  it('rejects an invalid order id', async () => {
    const res = await request(app).get('/api/payments/not-a-number').set(auth());

    expect(res.status).toBe(400);
    expect(paymentsModel.getPaymentByOrderId).not.toHaveBeenCalled();
  });
});

describe('payment endpoints require a login', () => {
  it.each([
    ['post', '/api/payments'],
    ['get', '/api/payments/42'],
    ['post', '/api/payments/42/confirm-demo'],
  ])('%s %s returns 401 without a token', async (method, url) => {
    const res = await request(app)[method](url).send({
      order_id: 42,
      transaction_ref: 'ref',
      payment_method: 'credit',
    });

    expect(res.status).toBe(401);
    expect(paymentsModel.createPayment).not.toHaveBeenCalled();
    expect(paymentsModel.getPaymentByOrderId).not.toHaveBeenCalled();
    expect(paymentsModel.confirmDemoPayment).not.toHaveBeenCalled();
  });
});

describe('payments only for the order owner', () => {
  function ownerError() {
    const error = new Error('Only the customer who placed this order can pay for it.');
    error.code = 'NOT_ORDER_OWNER';
    return error;
  }

  it("returns 403 when paying for someone else's order", async () => {
    paymentsModel.createPayment.mockRejectedValue(ownerError());

    const res = await request(app)
      .post('/api/payments')
      .set(auth(8))
      .send({ order_id: 42, transaction_ref: 'gateway-ref-123', payment_method: 'credit' });

    expect(res.status).toBe(403);
  });

  it("returns 404 when the payment belongs to another user's order", async () => {
    paymentsModel.getPaymentByOrderId.mockResolvedValue(undefined);

    const res = await request(app).get('/api/payments/42').set(auth(8));

    expect(res.status).toBe(404);
    expect(paymentsModel.getPaymentByOrderId).toHaveBeenCalledWith(42, 8);
  });

  describe('POST /api/payments/:orderId/confirm-demo', () => {
    beforeEach(() => {
      process.env.ENABLE_DEMO_PAYMENTS = 'true';
    });

    afterEach(() => {
      delete process.env.ENABLE_DEMO_PAYMENTS;
    });

    it('confirms for the order owner', async () => {
      paymentsModel.confirmDemoPayment.mockResolvedValue({
        order_id: 42,
        order_status: 'Paid',
        payment_status: 'Verified',
      });

      const res = await request(app).post('/api/payments/42/confirm-demo').set(auth());

      expect(res.status).toBe(200);
      expect(paymentsModel.confirmDemoPayment).toHaveBeenCalledWith(42, 3);
    });

    it("returns 403 for someone else's order", async () => {
      paymentsModel.confirmDemoPayment.mockRejectedValue(ownerError());

      const res = await request(app).post('/api/payments/42/confirm-demo').set(auth(8));

      expect(res.status).toBe(403);
    });
  });
});
