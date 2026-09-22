jest.mock('../src/models/orders.model');

const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');

const validPayload = {
  customer_id: 1,
  store_id: 1,
  delivery_slot: '2026-09-25T18:00:00.000Z',
  delivery_address: '123 Main St, Toronto, ON',
  items: [
    { item_name: 'Milk', quantity: 2, estimated_price: 4.5, allow_substitution: true },
    { item_name: 'Bread', quantity: 1, estimated_price: 3.0 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
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

    const res = await request(app).post('/api/orders').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order_id).toBe(42);
    expect(res.body.status).toBe('Pending');
    expect(ordersModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 1, customerId: 1 })
    );
  });

  it('rejects an empty grocery list with 400 and does not hit the database', async () => {
    const res = await request(app)
      .post('/api/orders')
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

    const res = await request(app).post('/api/orders').send(withoutStore);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('store_id')])
    );
  });

  it('rejects an order for an inactive/unknown store with 400', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue(undefined);

    const res = await request(app).post('/api/orders').send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('active store')])
    );
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('translates a foreign key violation (bad customer_id) into a 400', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    const fkError = new Error('violates foreign key constraint');
    fkError.code = '23503';
    ordersModel.createOrder.mockRejectedValue(fkError);

    const res = await request(app).post('/api/orders').send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('customer_id')])
    );
  });

  it('returns 500 for an unexpected database error', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
    ordersModel.createOrder.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).post('/api/orders').send(validPayload);

    expect(res.status).toBe(500);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns the order with its items when found', async () => {
    ordersModel.getOrderById.mockResolvedValue({
      order_id: 42,
      status: 'Pending',
      items: validPayload.items,
    });

    const res = await request(app).get('/api/orders/42');

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(42);
    expect(ordersModel.getOrderById).toHaveBeenCalledWith(42);
  });

  it('returns 404 when the order does not exist', async () => {
    ordersModel.getOrderById.mockResolvedValue(undefined);

    const res = await request(app).get('/api/orders/999');

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/orders/not-a-number');

    expect(res.status).toBe(400);
    expect(ordersModel.getOrderById).not.toHaveBeenCalled();
  });
});
