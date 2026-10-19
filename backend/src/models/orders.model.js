const { pool, withTransaction } = require('../config/db');
const slotsModel = require('./slots.model');
const { NEXT_STATUS } = require('../constants/order-status');

/**
 * Looks up an active store by id. Returns the row, or undefined if the
 * store doesn't exist or has been deactivated (is_active = FALSE).
 */
async function findActiveStoreById(storeId, client = pool) {
  const result = await client.query(
    'SELECT store_id, store_name, is_active FROM stores WHERE store_id = $1',
    [storeId]
  );
  return result.rows[0];
}

/**
 * Creates an order and its line items in a single transaction.
 * `items` is the array from the validated request body:
 *   [{ item_name, quantity, estimated_price, allow_substitution }]
 *
 * total_amount is computed here (sum of quantity * estimated_price) rather
 * than trusted from the client, per FR-02.
 *
 * Returns the created order row with its items attached, or throws for the
 * caller to translate into an HTTP response: a Postgres error (e.g. FK
 * violation on a bad customer_id) or SLOT_FULL when the delivery slot has no
 * capacity left (BR-07).
 */
async function createOrder({ customerId, storeId, deliverySlot, deliveryAddress, items }) {
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.estimated_price,
    0
  );

  return withTransaction(async (client) => {
    await slotsModel.assertSlotHasCapacity(client, deliverySlot);

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, store_id, status, delivery_slot, delivery_address, total_amount)
       VALUES ($1, $2, 'Pending', $3, $4, $5)
       RETURNING order_id, customer_id, helper_id, store_id, status, delivery_slot, delivery_address, total_amount, created_at`,
      [customerId, storeId, deliverySlot, deliveryAddress, totalAmount]
    );
    const order = orderResult.rows[0];

    const insertedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, item_name, quantity, estimated_price, allow_substitution)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING item_id, order_id, item_name, quantity, estimated_price, allow_substitution`,
        [
          order.order_id,
          item.item_name,
          item.quantity,
          item.estimated_price,
          Boolean(item.allow_substitution),
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    return { ...order, items: insertedItems };
  });
}

/**
 * Fetches an order with its items. Returns undefined if not found.
 */
async function getOrderById(orderId) {
  const orderResult = await pool.query(
    `SELECT order_id, customer_id, helper_id, store_id, status, delivery_slot, delivery_address, total_amount, created_at
     FROM orders WHERE order_id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) {
    return undefined;
  }

  const itemsResult = await pool.query(
    `SELECT item_id, order_id, item_name, quantity, estimated_price, allow_substitution
     FROM order_items WHERE order_id = $1
     ORDER BY item_id`,
    [orderId]
  );

  return { ...order, items: itemsResult.rows };
}


function invalidTransitionError(current, requested) {
  const expected = NEXT_STATUS[current];
  const error = new Error(
    expected
      ? `Cannot move order from ${current} to ${requested}. Next status is ${expected}.`
      : `Order is ${current} and cannot be advanced.`
  );
  error.code = 'INVALID_STATUS_TRANSITION';
  return error;
}

// Only the assigned helper may advance the order one step at a time.
async function updateDeliveryStatus({ orderId, helperId, nextStatus }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT order_id, helper_id, status FROM orders WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = result.rows[0];
    if (!order) return undefined;
    if (Number(order.helper_id) !== Number(helperId)) {
      const error = new Error('Only the assigned helper may update this order.');
      error.code = 'NOT_ASSIGNED_HELPER';
      throw error;
    }
    if (NEXT_STATUS[order.status] !== nextStatus) {
      throw invalidTransitionError(order.status, nextStatus);
    }
    const updated = await client.query(
      `UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING order_id, helper_id, status`,
      [nextStatus, orderId]
    );
    if (nextStatus === 'Delivered') {
      await client.query(
        `UPDATE deliveries SET delivery_status = 'Completed', completed_at = NOW() WHERE order_id = $1 AND helper_id = $2`,
        [orderId, helperId]
      );
    }
    return updated.rows[0];
  });
}
async function getAssignedTasks(helperId) {
  const result = await pool.query(
    `SELECT
       order_id,
       customer_id,
       helper_id,
       store_id,
       status,
       delivery_slot,
       delivery_address,
       total_amount,
       created_at
     FROM orders
     WHERE helper_id = $1
       AND status IN ('Assigned', 'Shopping', 'Out_for_Delivery')
     ORDER BY created_at DESC`,
    [helperId]
  );

  return result.rows;
}
module.exports = {
  findActiveStoreById,
  createOrder,
  getOrderById,
  updateDeliveryStatus,
  getAssignedTasks,
};
