
const { pool, withTransaction } = require("../config/db");

async function createPayment({ orderId, transactionRef, paymentMethod }) {
  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `SELECT total_amount, status
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) return undefined;

    if (order.status !== "Pending") {
      const error = new Error("Order is not awaiting payment.");
      error.code = "ORDER_NOT_PAYABLE";
      throw error;
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (order_id, transaction_ref, amount, payment_method)
       VALUES ($1, $2, $3, $4)
       RETURNING payment_id, order_id, transaction_ref,
                 amount, payment_status, verified_at, payment_method`,
      [orderId, transactionRef, order.total_amount, paymentMethod]
    );

    return paymentResult.rows[0];
  });
}

async function getPaymentByOrderId(orderId) {
  const result = await pool.query(
    `SELECT payment_id, order_id, transaction_ref,
            amount, payment_status, verified_at, payment_method
     FROM payments
     WHERE order_id = $1`,
    [orderId]
  );

  return result.rows[0];
}

// Development-only simulated payment confirmation.
// Payment and order are updated in one transaction.
async function confirmDemoPayment(orderId) {
  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `SELECT order_id, status
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      const error = new Error("Order not found.");
      error.code = "ORDER_NOT_FOUND";
      throw error;
    }

    const paymentResult = await client.query(
      `SELECT payment_id, payment_status
       FROM payments
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    const payment = paymentResult.rows[0];

    if (!payment) {
      const error = new Error("Payment not found.");
      error.code = "PAYMENT_NOT_FOUND";
      throw error;
    }

    // Allow retry when confirmation already succeeded.
    if (
      payment.payment_status === "Verified" &&
      order.status === "Paid"
    ) {
      return {
        order_id: orderId,
        order_status: order.status,
        payment_status: payment.payment_status,
      };
    }

    if (
      order.status !== "Pending" ||
      payment.payment_status !== "Pending"
    ) {
      const error = new Error(
        "Order or payment is not awaiting confirmation."
      );
      error.code = "INVALID_PAYMENT_STATE";
      throw error;
    }

    const updatedPayment = await client.query(
      `UPDATE payments
       SET payment_status = 'Verified',
           verified_at = NOW()
       WHERE payment_id = $1
       RETURNING payment_status`,
      [payment.payment_id]
    );

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'Paid'
       WHERE order_id = $1
       RETURNING order_id, status`,
      [orderId]
    );

    return {
      order_id: updatedOrder.rows[0].order_id,
      order_status: updatedOrder.rows[0].status,
      payment_status: updatedPayment.rows[0].payment_status,
    };
  });
}

module.exports = {
  createPayment,
  getPaymentByOrderId,
  confirmDemoPayment,
};
