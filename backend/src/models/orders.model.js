const { pool, withTransaction } = require('../config/db');
const slotsModel = require('./slots.model');
const { NEXT_STATUS } = require('../constants/order-status');
const { priceOrderLines, catalogIdsOf } = require('../services/order-pricing.service');

// Order line columns as the API returns them. quantity is NUMERIC(10,3), which
// `pg` would return as a string, so it is cast back to a number.
const ORDER_ITEM_COLUMNS = `item_id, order_id, catalog_item_id, item_name, unit,
  quantity::float8 AS quantity, estimated_price, allow_substitution`;

/**
 * Looks up an active store by id. Returns the row, or undefined if the
 * store doesn't exist or has been deactivated (is_active = FALSE).
 */
async function findActiveStoreById(storeId, client = pool) {
  const result = await client.query(
    'SELECT store_id, store_name, is_active FROM stores WHERE store_id = $1 AND is_active = TRUE',
    [storeId]
  );
  return result.rows[0];
}

/**
 * Loads the catalog rows a set of order lines refers to, limited to active
 * items of the order's store. Missing ids are caught by the pricing service.
 */
async function loadCatalogRows(client, storeId, lines) {
  const ids = catalogIdsOf(lines);
  if (ids.length === 0) {
    return [];
  }
  const result = await client.query(
    `SELECT item_id, name, brand, unit, unit_price::float8 AS unit_price
     FROM items
     WHERE item_id = ANY($1::int[]) AND store_id = $2 AND is_active = TRUE`,
    [ids, storeId]
  );
  return result.rows;
}

async function insertOrderItem(client, orderId, line) {
  const result = await client.query(
    `INSERT INTO order_items
       (order_id, catalog_item_id, item_name, quantity, unit, estimated_price, allow_substitution)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${ORDER_ITEM_COLUMNS}`,
    [
      orderId,
      line.catalogItemId,
      line.itemName,
      line.quantity,
      line.unit,
      line.unitPrice,
      line.allowSubstitution,
    ]
  );
  return result.rows[0];
}

/**
 * Creates an order and its line items in a single transaction.
 * `items` is the array from the validated request body; each line is either
 *   catalog: { catalog_item_id, quantity, allow_substitution }
 *   custom:  { item_name, quantity, estimated_price, unit?, allow_substitution }
 * (see order-pricing.service.js).
 *
 * Names, units and prices of catalog lines come from the database, and
 * total_amount is computed here (sum of quantity * unit price, in cents)
 * rather than trusted from the client, per FR-02.
 *
 * Returns the created order row with its items attached, or throws for the
 * caller to translate into an HTTP response: ITEM_NOT_IN_STORE or
 * INVALID_QUANTITY for bad lines, SLOT_FULL when the delivery slot has no
 * capacity left (BR-07), or a Postgres error (e.g. FK violation).
 */
async function createOrder({ customerId, storeId, deliverySlot, deliveryAddress, items }) {
  return withTransaction(async (client) => {
    const catalogRows = await loadCatalogRows(client, storeId, items);
    const { lines, totalCents } = priceOrderLines(items, catalogRows);

    await slotsModel.assertSlotHasCapacity(client, deliverySlot);

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, store_id, status, delivery_slot, delivery_address, total_amount)
       VALUES ($1, $2, 'Pending', $3, $4, $5)
       RETURNING order_id, customer_id, helper_id, store_id, status, delivery_slot, delivery_address, total_amount, created_at`,
      [customerId, storeId, deliverySlot, deliveryAddress, (totalCents / 100).toFixed(2)]
    );
    const order = orderResult.rows[0];

    const insertedItems = [];
    for (const line of lines) {
      insertedItems.push(await insertOrderItem(client, order.order_id, line));
    }

    return { ...order, items: insertedItems };
  });
}

/**
 * Fetches an order with its items and the assigned helper's name
 * (helper_name is null until a helper claims it). Returns undefined if not found.
 */
async function getOrderById(orderId) {
  const orderResult = await pool.query(
    `SELECT o.order_id, o.customer_id, o.helper_id, h.full_name AS helper_name,
            o.store_id, o.status, o.delivery_slot, o.delivery_address, o.total_amount, o.created_at
     FROM orders o
     LEFT JOIN users h ON h.user_id = o.helper_id
     WHERE o.order_id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) {
    return undefined;
  }

  const itemsResult = await pool.query(
    `SELECT ${ORDER_ITEM_COLUMNS}
     FROM order_items WHERE order_id = $1
     ORDER BY item_id`,
    [orderId]
  );

  return { ...order, items: itemsResult.rows };
}

/**
 * Fetches an order only if `userId` may see it: the customer who placed it,
 * its assigned helper, or any helper while it is Paid and unclaimed (the
 * preview before claiming). Returns undefined otherwise.
 */
async function getOrderForViewer(orderId, userId) {
  const order = await getOrderById(orderId);
  if (!order) {
    return undefined;
  }
  if (Number(order.customer_id) === userId || Number(order.helper_id) === userId) {
    return order;
  }
  if (order.status === 'Paid' && order.helper_id == null) {
    const roleResult = await pool.query('SELECT role FROM users WHERE user_id = $1', [userId]);
    if (String(roleResult.rows[0]?.role).toLowerCase() === 'helper') {
      return order;
    }
  }
  return undefined;
}

/**
 * Loads what a repeat order copies from a previous order: its owner, store,
 * address, slot and line items. Returns undefined if the order doesn't exist.
 *
 * delivery_slot is formatted as a UTC ISO string in SQL: the column is a
 * TIMESTAMP holding UTC wall-clock time, and letting `pg` parse it would
 * shift it by the server's local offset.
 */
async function getRepeatSource(orderId) {
  const orderResult = await pool.query(
    `SELECT order_id, customer_id, store_id, status, delivery_address,
            to_char(delivery_slot, 'YYYY-MM-DD"T"HH24:MI:SS".000Z"') AS delivery_slot
     FROM orders WHERE order_id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) {
    return undefined;
  }

  // A line stays a catalog line (re-priced at today's price) only while its
  // catalog item is still active at this store with the same unit. Otherwise it
  // is repeated as a custom line at the price it was ordered at.
  const itemsResult = await pool.query(
    `SELECT oi.item_name, oi.quantity::float8 AS quantity, oi.unit, oi.estimated_price,
            oi.allow_substitution, c.item_id AS active_catalog_item_id
     FROM order_items oi
     LEFT JOIN items c
       ON c.item_id = oi.catalog_item_id
      AND c.store_id = $2
      AND c.is_active = TRUE
      AND c.unit = oi.unit
     WHERE oi.order_id = $1
     ORDER BY oi.item_id`,
    [orderId, order.store_id]
  );

  const items = itemsResult.rows.map((row) =>
    row.active_catalog_item_id
      ? {
          catalog_item_id: row.active_catalog_item_id,
          quantity: row.quantity,
          allow_substitution: Boolean(row.allow_substitution),
        }
      : {
          item_name: row.item_name,
          quantity: row.quantity,
          unit: row.unit,
          estimated_price: Number(row.estimated_price),
          allow_substitution: Boolean(row.allow_substitution),
        }
  );
  return { ...order, items };
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
const HELPER_ORDER_COLUMNS = `
  o.order_id, o.customer_id, o.helper_id, o.store_id, s.store_name,
  o.status, o.delivery_slot, o.delivery_address, o.total_amount, o.created_at`;

async function getAssignedTasks(helperId) {
  const result = await pool.query(
    `SELECT ${HELPER_ORDER_COLUMNS}
     FROM orders o
     JOIN stores s ON s.store_id = o.store_id
     WHERE o.helper_id = $1
       AND o.status IN ('Assigned', 'Shopping', 'Out_for_Delivery')
     ORDER BY o.created_at DESC`,
    [helperId]
  );

  return result.rows;
}

// Paid orders no helper has claimed yet (BR-01: only paid orders are claimable).
async function getAvailableOrders() {
  const result = await pool.query(
    `SELECT ${HELPER_ORDER_COLUMNS}
     FROM orders o
     JOIN stores s ON s.store_id = o.store_id
     WHERE o.status = 'Paid' AND o.helper_id IS NULL
     ORDER BY o.delivery_slot, o.order_id`
  );

  return result.rows;
}
module.exports = {
  findActiveStoreById,
  createOrder,
  getOrderById,
  getOrderForViewer,
  getRepeatSource,
  updateDeliveryStatus,
  getAssignedTasks,
  getAvailableOrders,
};
