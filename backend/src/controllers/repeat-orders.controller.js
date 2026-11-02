const ordersModel = require('../models/orders.model');
const { loadSlotAvailability } = require('../services/slot-availability.service');
const {
  validateSlot,
  findRecurringSlot,
  nearestAvailableSlots,
} = require('../services/slots.service');
const { parseId } = require('../validators/ids.validator');

// US-06 / SC-03: repeat a previous order, validating the new delivery slot
// against the slot grid and helper capacity (US-07, BR-07).

const PG_CHECK_VIOLATION = '23514';
const MAX_ADDRESS_LENGTH = 255; // orders.delivery_address is VARCHAR(255)
const SLOT_FULL_MESSAGE = 'That delivery slot is full. Please choose another.';
const STORE_INACTIVE_MESSAGE =
  'The store for this order is no longer available. Start a new order with another store.';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Parses an optional slot. Returns null when absent; throws 400 when unparseable. */
function parseRequestedSlot(value) {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'delivery_slot must be a valid date/time.');
  }
  return parsed;
}

/** Loads the source order, allowing only the customer who placed it. */
async function loadOwnedSource(req) {
  const orderId = parseId(req.params.id);
  if (!orderId) {
    throw new HttpError(400, 'Order id must be a positive integer.');
  }
  const source = await ordersModel.getRepeatSource(orderId);
  if (!source) {
    throw new HttpError(404, 'Order not found.');
  }
  if (Number(source.customer_id) !== req.user.userId) {
    throw new HttpError(403, 'Only the customer who placed this order can repeat it.');
  }
  return source;
}

/** Decides whether `target` (a Date or null) can be booked right now. */
function assessSlot(slots, target) {
  if (!target) {
    return {
      available: false,
      reason: 'NO_SLOT_SELECTED',
      message: 'The previous delivery time is not bookable this week. Choose another slot.',
      remaining: 0,
    };
  }
  const entry = slots.find((s) => s.start === target.toISOString());
  if (!entry) {
    return {
      available: false,
      reason: 'SLOT_NOT_BOOKABLE',
      message: validateSlot(target.toISOString()).error,
      remaining: 0,
    };
  }
  if (!entry.available) {
    return { available: false, reason: 'SLOT_FULL', message: SLOT_FULL_MESSAGE, remaining: 0 };
  }
  return { available: true, reason: null, message: 'Slot is available.', remaining: entry.remaining };
}

function sendError(res, err, context) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ errors: [err.message] });
  }
  console.error(`Failed to ${context}:`, err);
  return res.status(500).json({ errors: [`Unexpected error trying to ${context}.`] });
}

/**
 * GET /api/orders/:id/repeat/availability?delivery_slot=<ISO>
 * Checks whether a repeat of order :id can be booked. Without delivery_slot,
 * checks the same weekday and hour as the original order.
 */
async function getRepeatAvailability(req, res) {
  try {
    const requested = parseRequestedSlot(req.query.delivery_slot);
    const source = await loadOwnedSource(req);
    const [availability, store] = await Promise.all([
      loadSlotAvailability(),
      ordersModel.findActiveStoreById(source.store_id),
    ]);
    const recurring = findRecurringSlot(availability.grid, source.delivery_slot);
    const target = requested || (recurring ? recurring.start : null);
    const verdict = store
      ? assessSlot(availability.slots, target)
      : { available: false, reason: 'STORE_INACTIVE', message: STORE_INACTIVE_MESSAGE, remaining: 0 };

    return res.status(200).json({
      source_order_id: source.order_id,
      store_id: source.store_id,
      store_active: Boolean(store),
      requested_slot: target ? target.toISOString() : null,
      recurring_slot: recurring ? recurring.start.toISOString() : null,
      capacity: availability.capacity,
      ...verdict,
      alternatives:
        store && !verdict.available ? nearestAvailableSlots(availability.slots, target) : [],
    });
  } catch (err) {
    return sendError(res, err, 'check repeat order availability');
  }
}

function validateRepeatBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }
  if (body.delivery_slot === undefined || body.delivery_slot === '') {
    return 'delivery_slot is required.';
  }
  const address = body.delivery_address;
  if (address === undefined) {
    return null;
  }
  if (typeof address !== 'string' || address.trim().length === 0) {
    return 'delivery_address must be a non-empty string when provided.';
  }
  if (address.trim().length > MAX_ADDRESS_LENGTH) {
    return `delivery_address must be at most ${MAX_ADDRESS_LENGTH} characters.`;
  }
  return null;
}

/** Rejects a slot with up to 3 open alternatives near the one asked for. */
async function rejectSlot(res, status, message, target) {
  let alternatives = [];
  try {
    const { slots } = await loadSlotAvailability();
    alternatives = nearestAvailableSlots(slots, target);
  } catch (err) {
    console.error('Failed to load alternative delivery slots:', err);
  }
  return res.status(status).json({ errors: [message], alternatives });
}

/** Checks the source can still be repeated; returns the validated slot Date. */
async function prepareRepeat(source, deliverySlot) {
  if (source.items.length === 0) {
    throw new HttpError(409, 'This order has no items to repeat.');
  }
  const store = await ordersModel.findActiveStoreById(source.store_id);
  if (!store) {
    throw new HttpError(409, STORE_INACTIVE_MESSAGE);
  }
  return validateSlot(deliverySlot);
}

/**
 * POST /api/orders/:id/repeat  { delivery_slot, delivery_address? }
 * Places a new order with the same store and items as order :id. The slot is
 * checked against the grid here and against capacity inside the order
 * transaction, so a slot that filled since the availability check gets a 409.
 */
async function createRepeatOrder(req, res) {
  const bodyError = validateRepeatBody(req.body);
  if (bodyError) {
    return res.status(400).json({ errors: [bodyError] });
  }
  const { delivery_slot: deliverySlot, delivery_address: address } = req.body;
  const target = typeof deliverySlot === 'string' ? new Date(deliverySlot) : null;

  try {
    const source = await loadOwnedSource(req);
    const { slot, error: slotError } = await prepareRepeat(source, deliverySlot);
    if (slotError) {
      return rejectSlot(res, 400, slotError, target);
    }
    const order = await ordersModel.createOrder({
      customerId: source.customer_id,
      storeId: source.store_id,
      deliverySlot: slot.toISOString(),
      deliveryAddress: address === undefined ? source.delivery_address : address.trim(),
      items: source.items,
    });
    return res.status(201).json({
      ...order,
      delivery_slot: slot.toISOString(),
      repeated_from: source.order_id,
    });
  } catch (err) {
    if (err.code === 'SLOT_FULL') {
      return rejectSlot(res, 409, SLOT_FULL_MESSAGE, target);
    }
    if (err.code === PG_CHECK_VIOLATION) {
      return res.status(400).json({ errors: ['Order total must be greater than 0.'] });
    }
    return sendError(res, err, 'repeat the order');
  }
}

module.exports = { getRepeatAvailability, createRepeatOrder };
