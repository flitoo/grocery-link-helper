jest.mock('../src/models/payments.model');

const request = require('supertest');
const app = require('../src/app');
const paymentsModel = require('../src/models/payments.model');

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
      .send({
        order_id: 42,
        transaction_ref: ' gateway-ref-123 ',
        amount: 0.01,
        payment_status: 'Verified',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('Pending');
    expect(paymentsModel.createPayment).toHaveBeenCalledWith({
      orderId: 42,
      transactionRef: 'gateway-ref-123',
    });
  });

  it('rejects invalid payloads without calling the model', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ order_id: -1, transaction_ref: ' ' });

    expect(res.status).toBe(400);
    expect(paymentsModel.createPayment).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    paymentsModel.createPayment.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/payments')
      .send({ order_id: 999, transaction_ref: 'gateway-ref-999' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when a payment already exists', async () => {
    const duplicateError = new Error('duplicate key');
    duplicateError.code = '23505';
    paymentsModel.createPayment.mockRejectedValue(duplicateError);

    const res = await request(app)
      .post('/api/payments')
      .send({ order_id: 42, transaction_ref: 'gateway-ref-123' });

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

    const res = await request(app).get('/api/payments/42');

    expect(res.status).toBe(200);
    expect(res.body.payment_id).toBe(7);
    expect(paymentsModel.getPaymentByOrderId).toHaveBeenCalledWith(42);
  });

  it('rejects an invalid order id', async () => {
    const res = await request(app).get('/api/payments/not-a-number');

    expect(res.status).toBe(400);
    expect(paymentsModel.getPaymentByOrderId).not.toHaveBeenCalled();
  });
});