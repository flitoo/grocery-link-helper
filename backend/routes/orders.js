const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// Returns an error message string, or null when the payload is usable.
function validateOrder(body) {
  const { customer_id, store_id, delivery_slot, items } = body || {};

  if (!Number.isInteger(Number(customer_id))) return 'customer_id is required.';
  if (!Number.isInteger(Number(store_id))) return 'store_id is required.';
  if (!delivery_slot || Number.isNaN(Date.parse(delivery_slot))) {
    return 'delivery_slot must be a valid date/time.';
  }
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one grocery item is required.';
  }

  for (const item of items) {
    if (!item || typeof item.item_name !== 'string' || item.item_name.trim() === '') {
      return 'Every item needs a name.';
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return `Quantity for "${item.item_name}" must be a whole number of 1 or more.`;
    }
  }

  return null;
}

// POST /api/orders - creates a Pending order plus its items in one transaction.
router.post('/', async (req, res) => {
  const problem = validateOrder(req.body);
  if (problem) return res.status(400).json({ error: problem });

  const { customer_id, store_id, delivery_slot, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO ORDERS (customer_id, store_id, status, delivery_slot)
       VALUES ($1, $2, 'Pending', $3)
       RETURNING order_id, customer_id, helper_id, store_id, status, delivery_slot`,
      [customer_id, store_id, delivery_slot]
    );
    const order = orderResult.rows[0];

    const savedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO ORDER_ITEMS (order_id, item_name, quantity)
         VALUES ($1, $2, $3)
         RETURNING item_id, order_id, item_name, quantity`,
        [order.order_id, item.item_name.trim(), Number(item.quantity)]
      );
      savedItems.push(itemResult.rows[0]);
    }

    const storeResult = await client.query(
      'SELECT name FROM STORES WHERE store_id = $1',
      [order.store_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...order,
      store_name: storeResult.rows[0] ? storeResult.rows[0].name : null,
      items: savedItems,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/orders failed:', err.message);
    res.status(500).json({ error: 'Could not save the order.' });
  } finally {
    client.release();
  }
});

module.exports = router;
