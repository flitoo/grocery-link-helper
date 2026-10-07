const { validateCreateOrderPayload } = require('../validators/orders.validator');
const ordersModel = require('../models/orders.model');
const { validateSlot } = require('../services/slots.service');

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

async function createOrder(req, res) {
  const { valid, errors } = validateCreateOrderPayload(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const store = await ordersModel.findActiveStoreById(req.body.store_id);
  if (!store) {
    return res.status(400).json({ errors: ['store_id does not refer to an active store.'] });
  }

  const { slot, error: slotError } = validateSlot(req.body.delivery_slot);
  if (slotError) {
    return res.status(400).json({ errors: [slotError] });
  }

  try {
    const order = await ordersModel.createOrder({
      customerId: req.body.customer_id,
      storeId: req.body.store_id,
      deliverySlot: slot.toISOString(),
      deliveryAddress: req.body.delivery_address,
      items: req.body.items,
    });
    return res.status(201).json(order);
  } catch (err) {
    if (err.code === 'SLOT_FULL') {
      return res.status(409).json({ errors: ['That delivery slot is full. Please choose another.'] });
    }
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      return res.status(400).json({ errors: ['customer_id does not refer to an existing user.'] });
    }
    if (err.code === PG_CHECK_VIOLATION) {
      return res.status(400).json({ errors: ['Order total must be greater than 0.'] });
    }
    console.error('Failed to create order:', err);
    return res.status(500).json({ errors: ['Unexpected error creating the order.'] });
  }
}

async function getOrder(req, res) {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const order = await ordersModel.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ errors: ['Order not found.'] });
    }
    return res.status(200).json(order);
  } catch (err) {
    console.error('Failed to fetch order:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching the order.'] });
  }
}

module.exports = { createOrder, getOrder };
