jest.mock('../src/models/orders.model');
jest.mock('../src/models/slots.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ordersModel = require('../src/models/orders.model');
const slotsModel = require('../src/models/slots.model');
const {
  buildSlotGrid,
  applyCapacity,
  findRecurringSlot,
  nearestAvailableSlots,
} = require('../src/services/slots.service');

// Tuesday 2026-10-06 08:00 in Toronto (EDT, UTC-4).
const NOW = new Date('2026-10-06T12:00:00.000Z');
const CUSTOMER_ID = 7;

const settings = {
  timeZone: 'America/Toronto',
  openHour: 8,
  closeHour: 21,
  leadHours: 2,
  windowDays: 7,
};

// Last week's order: Tuesday 2026-09-29, 6 PM Toronto.
const source = {
  order_id: 42,
  customer_id: CUSTOMER_ID,
  store_id: 3,
  status: 'Delivered',
  delivery_address: '100 Queen St W, Toronto',
  delivery_slot: '2026-09-29T22:00:00.000Z',
  items: [
    { item_name: 'Milk', quantity: 2, estimated_price: 4.5, allow_substitution: true },
    { item_name: 'Bread', quantity: 1, estimated_price: 3.25, allow_substitution: false },
  ],
};
const RECURRING = '2026-10-06T22:00:00.000Z'; // Tuesday 2026-10-06, 6 PM Toronto
const store = { store_id: 3, store_name: 'FreshCo', is_active: true };

function token(userId = CUSTOMER_ID) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

function checkAvailability(orderId, query = {}, authToken = token()) {
  const req = request(app).get(`/api/orders/${orderId}/repeat/availability`).query(query);
  return authToken ? req.set('Authorization', `Bearer ${authToken}`) : req;
}

function repeatOrder(orderId, body, authToken = token()) {
  const req = request(app).post(`/api/orders/${orderId}/repeat`);
  if (authToken) {
    req.set('Authorization', `Bearer ${authToken}`);
  }
  return req.send(body);
}

function bookings(entries) {
  return new Map(Object.entries(entries));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
  jest.spyOn(console, 'error').mockImplementation(() => {});
  ordersModel.getRepeatSource.mockResolvedValue(source);
  ordersModel.findActiveStoreById.mockResolvedValue(store);
  slotsModel.getCapacity.mockResolvedValue(2);
  slotsModel.countActiveOrdersBySlot.mockResolvedValue(new Map());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('findRecurringSlot', () => {
  const grid = buildSlotGrid({ at: NOW, settings });

  it('finds the same local weekday and hour within the window', () => {
    const slot = findRecurringSlot(grid, source.delivery_slot, { settings });
    expect(slot.start.toISOString()).toBe(RECURRING);
  });

  it('keeps the local time across a DST change', () => {
    // Tue 2026-10-27 6 PM EDT -> Tue 2026-11-03 6 PM EST (23:00Z, not 22:00Z).
    const at = new Date('2026-11-03T12:00:00.000Z');
    const dstGrid = buildSlotGrid({ at, settings });
    const slot = findRecurringSlot(dstGrid, '2026-10-27T22:00:00.000Z', { settings });
    expect(slot.start.toISOString()).toBe('2026-11-03T23:00:00.000Z');
  });

  it('returns undefined when the time is inside today\'s lead time', () => {
    // Tue 9 AM is inside the 2-hour lead time, and next Tuesday is past the window.
    expect(findRecurringSlot(grid, '2026-09-29T13:00:00.000Z', { settings })).toBeUndefined();
  });

  it('returns undefined outside operating hours or for bad input', () => {
    expect(findRecurringSlot(grid, '2026-09-29T03:00:00.000Z', { settings })).toBeUndefined();
    expect(findRecurringSlot(grid, 'not a date', { settings })).toBeUndefined();
    expect(findRecurringSlot(grid, null, { settings })).toBeUndefined();
  });
});

describe('nearestAvailableSlots', () => {
  const grid = buildSlotGrid({ at: NOW, settings });
  const slots = applyCapacity(
    grid,
    bookings({ '2026-10-06T22:00:00.000Z': 2, '2026-10-06T21:00:00.000Z': 2 }),
    2
  );

  it('returns open slots closest to the target, in time order, excluding it', () => {
    const result = nearestAvailableSlots(slots, new Date('2026-10-06T22:00:00.000Z'));
    expect(result.map((s) => s.start)).toEqual([
      '2026-10-06T20:00:00.000Z',
      '2026-10-06T23:00:00.000Z',
      '2026-10-07T00:00:00.000Z',
    ]);
    expect(result.every((s) => s.available)).toBe(true);
  });

  it('returns the earliest open slots when there is no valid target', () => {
    const earliest = ['2026-10-06T14:00:00.000Z', '2026-10-06T15:00:00.000Z'];
    expect(nearestAvailableSlots(slots, null, 2).map((s) => s.start)).toEqual(earliest);
    expect(nearestAvailableSlots(slots, new Date('bad'), 2).map((s) => s.start)).toEqual(earliest);
  });

  it('returns an empty list when nothing is open', () => {
    const full = slots.map((s) => ({ ...s, available: false, remaining: 0 }));
    expect(nearestAvailableSlots(full, new Date(RECURRING))).toEqual([]);
  });
});

describe('GET /api/orders/:id/repeat/availability', () => {
  it('defaults to the same weekday and hour as the original order', async () => {
    const res = await checkAvailability(42);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source_order_id: 42,
      store_id: 3,
      store_active: true,
      requested_slot: RECURRING,
      recurring_slot: RECURRING,
      capacity: 2,
      available: true,
      reason: null,
      remaining: 2,
      alternatives: [],
    });
    expect(ordersModel.getRepeatSource).toHaveBeenCalledWith(42);
  });

  it('checks a requested slot and reports remaining capacity', async () => {
    slotsModel.countActiveOrdersBySlot.mockResolvedValue(
      bookings({ '2026-10-07T18:00:00.000Z': 1 })
    );

    const res = await checkAvailability(42, { delivery_slot: '2026-10-07T18:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      requested_slot: '2026-10-07T18:00:00.000Z',
      recurring_slot: RECURRING,
      available: true,
      remaining: 1,
    });
  });

  it('reports a full slot with nearby alternatives (BR-07)', async () => {
    slotsModel.countActiveOrdersBySlot.mockResolvedValue(bookings({ [RECURRING]: 2 }));

    const res = await checkAvailability(42);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ available: false, reason: 'SLOT_FULL', remaining: 0 });
    expect(res.body.alternatives.map((s) => s.start)).toEqual([
      '2026-10-06T20:00:00.000Z',
      '2026-10-06T21:00:00.000Z',
      '2026-10-06T23:00:00.000Z',
    ]);
  });

  it.each([
    ['inside the lead time', '2026-10-06T13:00:00.000Z'],
    ['outside operating hours', '2026-10-07T03:00:00.000Z'],
    ['not on the hour', '2026-10-07T18:30:00.000Z'],
    ['past the 7-day window', '2026-10-20T18:00:00.000Z'],
    ['in the past', '2026-09-29T22:00:00.000Z'],
  ])('reports a slot %s as not bookable', async (_label, slot) => {
    const res = await checkAvailability(42, { delivery_slot: slot });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ available: false, reason: 'SLOT_NOT_BOOKABLE' });
    expect(res.body.message).toMatch(/not an available slot/);
    expect(res.body.alternatives).toHaveLength(3);
  });

  it('suggests the earliest slots when the original time is not bookable this week', async () => {
    ordersModel.getRepeatSource.mockResolvedValue({
      ...source,
      delivery_slot: '2026-09-29T13:00:00.000Z', // Tue 9 AM: inside today's lead time
    });

    const res = await checkAvailability(42);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      requested_slot: null,
      recurring_slot: null,
      available: false,
      reason: 'NO_SLOT_SELECTED',
    });
    expect(res.body.alternatives[0].start).toBe('2026-10-06T14:00:00.000Z');
  });

  it('reports an inactive store without alternatives', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue(undefined);

    const res = await checkAvailability(42);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      store_active: false,
      available: false,
      reason: 'STORE_INACTIVE',
      alternatives: [],
    });
  });

  it('rejects an unparseable delivery_slot', async () => {
    const res = await checkAvailability(42, { delivery_slot: 'tomorrow-ish' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/valid date/);
    expect(ordersModel.getRepeatSource).not.toHaveBeenCalled();
  });

  it('rejects a repeated delivery_slot query parameter', async () => {
    const res = await request(app)
      .get('/api/orders/42/repeat/availability?delivery_slot=a&delivery_slot=b')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await checkAvailability(42, {}, null);

    expect(res.status).toBe(401);
    expect(ordersModel.getRepeatSource).not.toHaveBeenCalled();
  });

  it('only lets the customer who placed the order check it', async () => {
    const res = await checkAvailability(42, {}, token(99));

    expect(res.status).toBe(403);
    expect(slotsModel.countActiveOrdersBySlot).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing order and 400 for a bad id', async () => {
    ordersModel.getRepeatSource.mockResolvedValue(undefined);

    expect((await checkAvailability(999)).status).toBe(404);
    expect((await checkAvailability('abc')).status).toBe(400);
    expect((await checkAvailability('99999999999')).status).toBe(400);
  });

  it('returns 500 when the database fails', async () => {
    slotsModel.getCapacity.mockRejectedValue(new Error('connection lost'));

    const res = await checkAvailability(42);

    expect(res.status).toBe(500);
    expect(res.body.errors[0]).toMatch(/Unexpected error/);
  });
});

describe('POST /api/orders/:id/repeat', () => {
  const created = {
    order_id: 77,
    customer_id: CUSTOMER_ID,
    helper_id: null,
    store_id: 3,
    status: 'Pending',
    delivery_slot: new Date('2026-10-06T18:00:00.000Z'), // pg's local-time parse
    delivery_address: source.delivery_address,
    total_amount: '12.25',
    items: [],
  };

  beforeEach(() => {
    ordersModel.createOrder.mockResolvedValue(created);
  });

  it('places a new order with the same store, items and address', async () => {
    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ order_id: 77, repeated_from: 42, delivery_slot: RECURRING });
    expect(ordersModel.createOrder).toHaveBeenCalledWith({
      customerId: CUSTOMER_ID,
      storeId: 3,
      deliverySlot: RECURRING,
      deliveryAddress: source.delivery_address,
      items: source.items,
    });
  });

  it('accepts an equivalent slot with a UTC offset and normalises it', async () => {
    const res = await repeatOrder(42, { delivery_slot: '2026-10-06T18:00:00-04:00' });

    expect(res.status).toBe(201);
    expect(ordersModel.createOrder.mock.calls[0][0].deliverySlot).toBe(RECURRING);
  });

  it('uses a new delivery address when one is given', async () => {
    const res = await repeatOrder(42, {
      delivery_slot: RECURRING,
      delivery_address: '  55 Bloor St, Unit 4  ',
    });

    expect(res.status).toBe(201);
    expect(ordersModel.createOrder.mock.calls[0][0].deliveryAddress).toBe('55 Bloor St, Unit 4');
  });

  it('returns 409 with alternatives when the slot filled up (BR-07)', async () => {
    const full = new Error('Delivery slot is full.');
    full.code = 'SLOT_FULL';
    ordersModel.createOrder.mockRejectedValue(full);
    slotsModel.countActiveOrdersBySlot.mockResolvedValue(bookings({ [RECURRING]: 2 }));

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toMatch(/full/);
    expect(res.body.alternatives.map((s) => s.start)).toEqual([
      '2026-10-06T20:00:00.000Z',
      '2026-10-06T21:00:00.000Z',
      '2026-10-06T23:00:00.000Z',
    ]);
  });

  it('still returns 409 when alternatives cannot be loaded', async () => {
    const full = new Error('Delivery slot is full.');
    full.code = 'SLOT_FULL';
    ordersModel.createOrder.mockRejectedValue(full);
    slotsModel.getCapacity.mockRejectedValue(new Error('connection lost'));

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(409);
    expect(res.body.alternatives).toEqual([]);
  });

  it.each([
    ['inside the lead time', '2026-10-06T13:00:00.000Z'],
    ['outside operating hours', '2026-10-07T03:00:00.000Z'],
    ['not on the hour', '2026-10-07T18:30:00.000Z'],
    ['past the 7-day window', '2026-10-20T18:00:00.000Z'],
  ])('returns 400 with alternatives for a slot %s', async (_label, slot) => {
    const res = await repeatOrder(42, { delivery_slot: slot });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/not an available slot/);
    expect(res.body.alternatives).toHaveLength(3);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparseable slot, suggesting the earliest slots', async () => {
    const res = await repeatOrder(42, { delivery_slot: 'soon' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/valid date/);
    expect(res.body.alternatives[0].start).toBe('2026-10-06T14:00:00.000Z');
  });

  it.each([
    ['no body fields', {}, /delivery_slot is required/],
    ['an empty slot', { delivery_slot: '' }, /delivery_slot is required/],
    ['a blank address', { delivery_slot: RECURRING, delivery_address: '   ' }, /delivery_address/],
    ['a non-string address', { delivery_slot: RECURRING, delivery_address: 12 }, /delivery_address/],
    [
      'an over-long address',
      { delivery_slot: RECURRING, delivery_address: 'x'.repeat(256) },
      /at most 255/,
    ],
  ])('returns 400 for %s', async (_label, body, message) => {
    const res = await repeatOrder(42, body);

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(message);
    expect(ordersModel.getRepeatSource).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-object JSON body', async () => {
    const res = await request(app)
      .post('/api/orders/42/repeat')
      .set('Authorization', `Bearer ${token()}`)
      .set('Content-Type', 'application/json')
      .send('[1,2]');

    expect(res.status).toBe(400);
  });

  it('returns 409 when the store is no longer active', async () => {
    ordersModel.findActiveStoreById.mockResolvedValue(undefined);

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toMatch(/store/);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('returns 409 when the source order has no items', async () => {
    ordersModel.getRepeatSource.mockResolvedValue({ ...source, items: [] });

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(409);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('returns 400 when the copied items total 0', async () => {
    const check = new Error('violates check constraint');
    check.code = '23514';
    ordersModel.createOrder.mockRejectedValue(check);

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/greater than 0/);
  });

  it('requires authentication and ownership', async () => {
    expect((await repeatOrder(42, { delivery_slot: RECURRING }, null)).status).toBe(401);
    expect((await repeatOrder(42, { delivery_slot: RECURRING }, token(99))).status).toBe(403);
    expect(ordersModel.createOrder).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing order', async () => {
    ordersModel.getRepeatSource.mockResolvedValue(undefined);

    const res = await repeatOrder(999, { delivery_slot: RECURRING });

    expect(res.status).toBe(404);
  });

  it('returns 500 on an unexpected database error', async () => {
    ordersModel.createOrder.mockRejectedValue(new Error('boom'));

    const res = await repeatOrder(42, { delivery_slot: RECURRING });

    expect(res.status).toBe(500);
  });
});
