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

// 2026-10-07T18:00Z is 2:00 PM Toronto, inside operating hours and the 7-day window.
const NOW = Date.parse('2026-10-06T12:00:00.000Z');

const base = {
  store_id: 1,
  delivery_slot: '2026-10-07T18:00:00.000Z',
  delivery_address: '123 Main St, Toronto, ON',
};

function auth(userId = 1) {
  return { Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` };
}

function postOrder(items) {
  return request(app).post('/api/orders').set(auth()).send({ ...base, items });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  pool.query.mockResolvedValue({ rows: [{ role: 'Customer' }] });
  ordersModel.findActiveStoreById.mockResolvedValue({ store_id: 1, is_active: true });
  ordersModel.createOrder.mockResolvedValue({ order_id: 50, status: 'Pending', items: [] });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/orders: catalog lines', () => {
  it('accepts a weight line and passes it to the model unchanged', async () => {
    const items = [{ catalog_item_id: 14, quantity: 1.5, allow_substitution: true }];

    const res = await postOrder(items);

    expect(res.status).toBe(201);
    expect(ordersModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({ items }));
  });

  it('accepts a catalog line without name or price', async () => {
    const res = await postOrder([{ catalog_item_id: 14, quantity: 2 }]);

    expect(res.status).toBe(201);
  });

  it('accepts a mix of catalog and custom lines', async () => {
    const res = await postOrder([
      { catalog_item_id: 14, quantity: 1.25 },
      { item_name: 'Birthday cake', quantity: 1, estimated_price: 24.99 },
    ]);

    expect(res.status).toBe(201);
  });

  it.each([
    ['a non-integer catalog_item_id', { catalog_item_id: 1.5, quantity: 1 }, 'catalog_item_id'],
    ['a zero catalog_item_id', { catalog_item_id: 0, quantity: 1 }, 'catalog_item_id'],
    ['a string catalog_item_id', { catalog_item_id: '14', quantity: 1 }, 'catalog_item_id'],
    ['quantity 0', { catalog_item_id: 14, quantity: 0 }, 'quantity'],
    ['a negative quantity', { catalog_item_id: 14, quantity: -1 }, 'quantity'],
    ['a string quantity', { catalog_item_id: 14, quantity: '1.5' }, 'quantity'],
    ['quantity over 100', { catalog_item_id: 14, quantity: 100.5 }, 'at most 100'],
    ['4 decimal places', { catalog_item_id: 14, quantity: 1.2345 }, '3 decimal'],
    ['a missing quantity', { catalog_item_id: 14 }, 'quantity'],
  ])('rejects %s with 400', async (_label, line, expected) => {
    const res = await postOrder([line]);

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain(expected);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('accepts exactly 3 decimal places and the maximum quantity', async () => {
    const res = await postOrder([
      { catalog_item_id: 14, quantity: 0.125 },
      { catalog_item_id: 15, quantity: 100 },
    ]);

    expect(res.status).toBe(201);
  });
});

describe('POST /api/orders: custom lines', () => {
  const custom = { item_name: 'Deli ham', quantity: 1, estimated_price: 12.99 };

  it('still accepts the legacy shape', async () => {
    const res = await postOrder([{ ...custom, quantity: 2, allow_substitution: true }]);

    expect(res.status).toBe(201);
  });

  it('accepts a weighted custom line', async () => {
    const res = await postOrder([{ ...custom, quantity: 0.5, unit: 'lb' }]);

    expect(res.status).toBe(201);
  });

  it.each([
    ['a decimal quantity without a weight unit', { quantity: 1.5 }, 'whole number'],
    ['a decimal quantity with unit each', { quantity: 1.5, unit: 'each' }, 'whole number'],
    ['an unknown unit', { unit: 'oz' }, 'unit must be one of'],
    ['a missing name', { item_name: '' }, 'item_name'],
    ['a name over 150 characters', { item_name: 'x'.repeat(151) }, '150 characters'],
    ['a negative price', { estimated_price: -1 }, 'estimated_price'],
    ['a price over the limit', { estimated_price: 100001 }, 'estimated_price'],
    ['a string price', { estimated_price: '12.99' }, 'estimated_price'],
    ['a missing price', { estimated_price: undefined }, 'estimated_price'],
  ])('rejects %s with 400', async (_label, override, expected) => {
    const res = await postOrder([{ ...custom, ...override }]);

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain(expected);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders: line list', () => {
  it('rejects a line that is not an object', async () => {
    const res = await postOrder(['milk']);

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain('items[0] must be an object');
  });

  it('rejects more than 100 lines', async () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ catalog_item_id: i + 1, quantity: 1 }));

    const res = await postOrder(items);

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain('at most 100');
  });

  it('reports the error for every bad line', async () => {
    const res = await postOrder([
      { catalog_item_id: 14, quantity: 0 },
      { item_name: 'Cake', quantity: 1, estimated_price: -5 },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(2);
    expect(res.body.errors[0]).toContain('items[0]');
    expect(res.body.errors[1]).toContain('items[1]');
  });
});

describe('POST /api/orders: pricing errors from the model', () => {
  it.each(['ITEM_NOT_IN_STORE', 'INVALID_QUANTITY'])('maps %s to 400 with its message', async (code) => {
    const err = new Error('That line cannot be ordered.');
    err.code = code;
    ordersModel.createOrder.mockRejectedValue(err);

    const res = await postOrder([{ catalog_item_id: 14, quantity: 1 }]);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(['That line cannot be ordered.']);
  });
});
