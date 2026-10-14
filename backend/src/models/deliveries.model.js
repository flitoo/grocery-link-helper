const { withTransaction } = require('../config/db');

// An order counts against a helper's one-active-order limit from the moment it
// is claimed until it is delivered (or cancelled).
const ACTIVE_ORDER_STATUSES = ['Assigned', 'Shopping', 'Out_for_Delivery'];

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function claimDelivery({ orderId, helperId }) {
  return withTransaction(async (client) => {
    const helperResult = await client.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1 AND role = 'Helper'
       FOR UPDATE`,
      [helperId]
    );
    if (!helperResult.rows[0]) {
      throw codedError('Only delivery helpers can claim orders.', 'NOT_A_HELPER');
    }

    // The FOR UPDATE above serializes concurrent claims by the same helper, so
    // this check cannot race with another claim in flight.
    const activeResult = await client.query(
      `SELECT order_id
       FROM orders
       WHERE helper_id = $1 AND status = ANY($2)
       LIMIT 1`,
      [helperId, ACTIVE_ORDER_STATUSES]
    );
    if (activeResult.rows[0]) {
      throw codedError('Helper already has an active order.', 'HELPER_HAS_ACTIVE_ORDER');
    }

    const orderResult = await client.query(
      `SELECT order_id, status, helper_id
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return undefined;
    }

    if (order.status !== 'Paid' || order.helper_id !== null) {
      throw codedError('Order is not available to claim.', 'ORDER_NOT_AVAILABLE');
    }

    const deliveryResult = await client.query(
      `INSERT INTO deliveries (order_id, helper_id, delivery_status)
       VALUES ($1, $2, 'In_Transit')
       RETURNING delivery_id, order_id, helper_id, delivery_status, photo_proof_url, completed_at`,
      [orderId, helperId]
    );

    await client.query(
      `UPDATE orders
       SET helper_id = $1, status = 'Assigned'
       WHERE order_id = $2`,
      [helperId, orderId]
    );

    return deliveryResult.rows[0];
  });
}

module.exports = { claimDelivery };
