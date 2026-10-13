const { pool, withTransaction } = require('../config/db');

async function claimDelivery({ orderId, helperId }) {
  return withTransaction(async (client) => {
    const helperResult = await client.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1 AND role = 'Helper'`,
      [helperId]
    );
    if (!helperResult.rows[0]) {
      const error = new Error('Only delivery helpers can claim orders.');
      error.code = 'NOT_A_HELPER';
      throw error;
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
      const error = new Error('Order is not available to claim.');
      error.code = 'ORDER_NOT_AVAILABLE';
      throw error;
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
