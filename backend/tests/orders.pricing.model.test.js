jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
  withTransaction: jest.fn(),
}));
jest.mock('../src/models/slots.model');

const { pool, withTransaction } = require('../src/config/db');
const slotsModel = require('../src/models/slots.model');
const ordersModel = require('../src/models/orders.model');

const SLOT = '2026-10-07T18:00:00.000Z';

let client;

/** Fake transaction client that answers by looking at the SQL text. */
function setupClient({ catalogRows = [] } = {}) {
  client = {
    query: jest.fn(async (sql, params) => {
      if (/FROM items/.test(sql)) return { rows: catalogRows };
      if (/INSERT INTO orders/.test(sql)) {
        return { rows: [{ order_id: 77, customer_id: params[0], store_id: params[1], total_amount: params[4] }] };
      }
      if (/INSERT INTO order_items/.test(sql)) {
        return {
          rows: [
            {
              item_id: 500 + client.query.mock.calls.length,
              catalog_item_id: params[1],
              item_name: params[2],
              quantity: Number(params[3]),
              unit: params[4],
              estimated_price: params[5],
              allow_substitution: params[6],
            },
          ],
        };
      }
      return { rows: [] };
    }),
  };
  withTransaction.mockImplementation((fn) => fn(client));
}

function callsMatching(re) {
  return client.query.mock.calls.filter(([sql]) => re.test(sql));
}

function create(items) {
  return ordersModel.createOrder({
    customerId: 3,
    storeId: 2,
    deliverySlot: SLOT,
    deliveryAddress: '123 Main St',
    items,
  });
}

const salmon = { item_id: 14, name: 'Atlantic Salmon Fillet', brand: 'No Name', unit: 'lb', unit_price: 10.99 };
const milk = { item_id: 11, name: '2% Milk, 4 L', brand: 'Neilson', unit: 'each', unit_price: 6.29 };

beforeEach(() => {
  jest.resetAllMocks();
  slotsModel.assertSlotHasCapacity.mockResolvedValue(undefined);
});

describe('ordersModel.createOrder pricing', () => {
  it('looks up catalog items limited to the order store and active items', async () => {
    setupClient({ catalogRows: [salmon] });

    await create([{ catalog_item_id: 14, quantity: 1.5 }]);

    const [lookup] = callsMatching(/FROM items/);
    expect(lookup[0]).toMatch(/store_id = \$2 AND is_active = TRUE/);
    expect(lookup[1]).toEqual([[14], 2]);
  });

  it('does not query the catalog for custom-only orders', async () => {
    setupClient();

    await create([{ item_name: 'Milk', quantity: 2, estimated_price: 4.5 }]);

    expect(callsMatching(/FROM items/)).toHaveLength(0);
  });

  it('stores the server-computed total, not anything the client sent', async () => {
    setupClient({ catalogRows: [salmon, milk] });

    const order = await create([
      { catalog_item_id: 14, quantity: 1.5, estimated_price: 0.01 },
      { catalog_item_id: 11, quantity: 2 },
    ]);

    const [orderInsert] = callsMatching(/INSERT INTO orders/);
    expect(orderInsert[1][4]).toBe('29.07'); // 16.49 + 12.58
    expect(order.total_amount).toBe('29.07');
  });

  it('inserts each line with catalog link, unit, decimal quantity and per-unit price', async () => {
    setupClient({ catalogRows: [salmon] });

    const order = await create([{ catalog_item_id: 14, quantity: 1.5, allow_substitution: true }]);

    const [itemInsert] = callsMatching(/INSERT INTO order_items/);
    expect(itemInsert[1]).toEqual([77, 14, 'No Name Atlantic Salmon Fillet', '1.500', 'lb', '10.99', true]);
    expect(order.items[0]).toMatchObject({ catalog_item_id: 14, quantity: 1.5, unit: 'lb' });
  });

  it('returns quantity as a number, not a numeric string', async () => {
    setupClient();

    await create([{ item_name: 'Milk', quantity: 2, estimated_price: 4.5 }]);

    const [itemInsert] = callsMatching(/INSERT INTO order_items/);
    expect(itemInsert[0]).toContain('quantity::float8 AS quantity');
  });

  it('fails before writing anything when a catalog item is not at the store', async () => {
    setupClient({ catalogRows: [] });

    await expect(create([{ catalog_item_id: 14, quantity: 1 }])).rejects.toMatchObject({
      code: 'ITEM_NOT_IN_STORE',
    });

    expect(callsMatching(/INSERT/)).toHaveLength(0);
    expect(slotsModel.assertSlotHasCapacity).not.toHaveBeenCalled();
  });

  it('fails before writing anything for a decimal quantity on a per-piece item', async () => {
    setupClient({ catalogRows: [milk] });

    await expect(create([{ catalog_item_id: 11, quantity: 1.5 }])).rejects.toMatchObject({
      code: 'INVALID_QUANTITY',
    });

    expect(callsMatching(/INSERT/)).toHaveLength(0);
  });

  it('still checks slot capacity (and propagates SLOT_FULL) after pricing', async () => {
    setupClient({ catalogRows: [salmon] });
    const full = new Error('Delivery slot is full.');
    full.code = 'SLOT_FULL';
    slotsModel.assertSlotHasCapacity.mockRejectedValue(full);

    await expect(create([{ catalog_item_id: 14, quantity: 1 }])).rejects.toBe(full);

    expect(callsMatching(/INSERT/)).toHaveLength(0);
  });

  it('keeps legacy custom lines working: unit each, whole quantity, client price', async () => {
    setupClient();

    await create([{ item_name: 'Milk', quantity: 2, estimated_price: 4.5, allow_substitution: true }]);

    const [itemInsert] = callsMatching(/INSERT INTO order_items/);
    expect(itemInsert[1]).toEqual([77, null, 'Milk', '2.000', 'each', '4.50', true]);
    expect(callsMatching(/INSERT INTO orders/)[0][1][4]).toBe('9.00');
  });
});

describe('ordersModel.getOrderById / getRepeatSource', () => {
  it('returns quantity as a number with unit and catalog link', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ order_id: 1, customer_id: 3, helper_id: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await ordersModel.getOrderById(1);

    const itemsSql = pool.query.mock.calls[1][0];
    expect(itemsSql).toContain('quantity::float8 AS quantity');
    expect(itemsSql).toContain('catalog_item_id');
    expect(itemsSql).toContain('unit');
  });

  function mockRepeat(rows) {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ order_id: 42, customer_id: 3, store_id: 2, delivery_slot: SLOT, delivery_address: 'x' }],
      })
      .mockResolvedValueOnce({ rows });
  }

  it('repeats an active catalog line as a catalog line (re-priced), keeping weight', async () => {
    mockRepeat([
      { item_name: 'x', quantity: 1.5, unit: 'lb', estimated_price: '10.99', allow_substitution: true, active_catalog_item_id: 14 },
    ]);

    const source = await ordersModel.getRepeatSource(42);

    expect(source.items).toEqual([{ catalog_item_id: 14, quantity: 1.5, allow_substitution: true }]);
  });

  it('repeats a line whose catalog item is gone as a custom line at its old price and unit', async () => {
    mockRepeat([
      { item_name: 'No Name Atlantic Salmon Fillet', quantity: 1.5, unit: 'lb', estimated_price: '10.99', allow_substitution: false, active_catalog_item_id: null },
      { item_name: 'Cake', quantity: 2, unit: 'each', estimated_price: '5.25', allow_substitution: false, active_catalog_item_id: null },
    ]);

    const source = await ordersModel.getRepeatSource(42);

    expect(source.items).toEqual([
      { item_name: 'No Name Atlantic Salmon Fillet', quantity: 1.5, unit: 'lb', estimated_price: 10.99, allow_substitution: false },
      { item_name: 'Cake', quantity: 2, unit: 'each', estimated_price: 5.25, allow_substitution: false },
    ]);
  });

  it('only keeps the catalog link for an active item at the same store with the same unit', async () => {
    mockRepeat([]);

    await ordersModel.getRepeatSource(42);

    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/c\.store_id = \$2\s+AND c\.is_active = TRUE\s+AND c\.unit = oi\.unit/);
    expect(params).toEqual([42, 2]);
  });

  it('returns undefined for a missing order', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(ordersModel.getRepeatSource(9)).resolves.toBeUndefined();
  });
});
