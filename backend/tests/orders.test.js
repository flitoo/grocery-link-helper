jest.mock('../src/models/orders.model');
jest.mock('../src/config/db', () => ({ pool: { query: jest.fn() } }));
process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const authorization = `Bearer ${jwt.sign({ userId: 1 }, process.env.JWT_SECRET)}`;

const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');

// Fixed "now" so slot validation is deterministic. 2026-10-07T18:00Z is
// 2:00 PM Toronto time, inside operating hours and within the 7-day window.
const NOW = Date.parse('2026-10-06T12:00:00.000Z');

const validPayload = {
  customer_id: 1,
  store_id: 1,
  delivery_slot: '2026-10-07T18:00:00.000Z',
  delivery_address: '123 Main St, Toronto, ON',
  items: [
    { item_name: 'Milk', quantity: 2, estimated_price: 4.5, allow_substitution: true },
    { item_name: 'Bread', quantity: 1, estimated_price: 3.0 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/orders', () => {
  it('creates an order when the payload is valid and the store is active', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    ordersModel.createOrder.mockResolvedValue({
      order_id: 42,
      customer_id: 1,
      store_id: 1,
      status: 'Pending',
      total_amount: '12.00',
      items: validPayload.items,
    });

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order_id).toBe(42);
    expect(res.body.status).toBe('Pending');
    expect(ordersModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 1, customerId: 1 })
    );
  });

  it('rejects an empty grocery list with 400 and does not hit the database', async () => {
    const res = await request(app)
      .post('/api/orders').set('Authorization', authorization)
      .send({ ...validPayload, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('items must be a non-empty array')])
    );
    expect(ordersModel.findActiveStoreById).not.toHaveBeenCalled();
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('rejects a request missing store_id with 400', async () => {
    const { store_id, ...withoutStore } = validPayload;

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(withoutStore);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('store_id')])
    );
  });

  it('rejects an order for an inactive/unknown store with 400', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue(undefined);

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('active store')])
    );
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['in the past', '2026-10-05T18:00:00.000Z'],
    ['not on the hour', '2026-10-07T18:30:00.000Z'],
    ['outside operating hours (3:00 AM Toronto)', '2026-10-07T07:00:00.000Z'],
    ['more than 7 days ahead', '2026-10-20T18:00:00.000Z'],
  ])('rejects a delivery slot that is %s with 400', async (_label, slot) => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });

    const res = await request(app)
      .post('/api/orders').set('Authorization', authorization)
      .send({ ...validPayload, delivery_slot: slot });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('delivery_slot')])
    );
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('returns 409 when the delivery slot is full', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    const fullError = new Error('Delivery slot is full.');
    fullError.code = 'SLOT_FULL';
    ordersModel.createOrder.mockRejectedValue(fullError);

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('slot is full')])
    );
  });

  it('translates a foreign key violation (bad customer_id) into a 400', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    const fkError = new Error('violates foreign key constraint');
    fkError.code = '23503';
    ordersModel.createOrder.mockRejectedValue(fkError);

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('customer_id')])
    );
  });

  it('returns 500 for an unexpected database error', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    ordersModel.createOrder.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).post('/api/orders').set('Authorization', authorization).send(validPayload);

    expect(res.status).toBe(500);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns the order with its items when found', async () => {
    ordersModel.getOrderById.mockResolvedValue({
      order_id: 42,
      customer_id: 1,
      status: 'Pending',
      items: validPayload.items,
    });

    const res = await request(app).get('/api/orders/42').set('Authorization', authorization);

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(42);
    expect(ordersModel.getOrderById).toHaveBeenCalledWith(42);
  });

  it('returns 404 when the order does not exist', async () => {
    ordersModel.getOrderById.mockResolvedValue(undefined);

    const res = await request(app).get('/api/orders/999').set('Authorization', authorization);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/orders/not-a-number').set('Authorization', authorization);

    expect(res.status).toBe(400);
    expect(ordersModel.getOrderById).not.toHaveBeenCalled();
  });
});


describe('Order authentication and ownership', () => {
  it('returns 400 for a null line item instead of crashing', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', authorization)
      .send({ ...validPayload, items: [null] });
    expect(res.status).toBe(400);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });
  it.each(['get', 'post'])('requires login for %s /api/orders', async method => {
    const res = await request(app)[method]('/api/orders').send(validPayload);
    expect(res.status).toBe(401);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });
  it('requires login for details', async () => {
    expect((await request(app).get('/api/orders/42')).status).toBe(401);
    expect(ordersModel.getOrderById).not.toHaveBeenCalled();
  });
  it('uses the token customer instead of a supplied id', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1 });
    ordersModel.createOrder.mockResolvedValue({ order_id: 42 });
    const res = await request(app).post('/api/orders').set('Authorization', authorization)
      .send({ ...validPayload, customer_id: 999 });
    expect(res.status).toBe(201);
    expect(ordersModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({ customerId: 1 }));
  });
  it('denies details to an unrelated customer', async () => {
    ordersModel.getOrderById.mockResolvedValue({ order_id: 42, customer_id: 2, helper_id: 3 });
    expect((await request(app).get('/api/orders/42').set('Authorization', authorization)).status).toBe(403);
  });
  it('allows the assigned helper to view details', async () => {
    ordersModel.getOrderById.mockResolvedValue({ order_id: 42, customer_id: 2, helper_id: 1 });
    expect((await request(app).get('/api/orders/42').set('Authorization', authorization)).status).toBe(200);
  });
  it('allows helpers to inspect paid, unclaimed orders', async () => {
    require('../src/config/db').pool.query.mockResolvedValue({ rows: [{ role: 'Helper' }] });
    ordersModel.getOrderById.mockResolvedValue({ order_id: 42, customer_id: 2, helper_id: null, status: 'Paid' });
    expect((await request(app).get('/api/orders/42').set('Authorization', authorization)).status).toBe(200);
  });
});
