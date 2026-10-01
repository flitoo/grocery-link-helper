const { pool, withTransaction } = require('../config/db');

async function createPayment({ orderId, transactionRef }) {
  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `SELECT total_amount, status
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return undefined;
    }

    if (order.status !== 'Pending') {
      const error = new Error('Order is not awaiting payment.');
      error.code = 'ORDER_NOT_PAYABLE';
      throw error;
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (order_id, transaction_ref, amount)
       VALUES ($1, $2, $3)
       RETURNING payment_id, order_id, transaction_ref, amount, payment_status, verified_at`,
      [orderId, transactionRef, order.total_amount]
    );

    return paymentResult.rows[0];
  });
}

async function getPaymentByOrderId(orderId) {
  const result = await pool.query(
    `SELECT payment_id, order_id, transaction_ref, amount, payment_status, verified_at
     FROM payments
     WHERE order_id = $1`,
    [orderId]
  );
  return result.rows[0];
}

module.exports = { createPayment, getPaymentByOrderId };