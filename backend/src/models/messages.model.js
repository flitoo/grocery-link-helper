const { pool } = require('../config/db');

async function listOrderMessages({ orderId, userId }) {
  const participantResult = await pool.query(
    `SELECT 1
     FROM orders
     WHERE order_id = $1
       AND (customer_id = $2 OR helper_id = $2)`,
    [orderId, userId]
  );
  if (!participantResult.rows[0]) {
    return undefined;
  }

  const result = await pool.query(
    `SELECT message_id, order_id, sender_id, message_text, sent_at
     FROM order_messages
     WHERE order_id = $1
     ORDER BY sent_at, message_id`,
    [orderId]
  );
  return result.rows;
}

async function createOrderMessage({ orderId, senderId, messageText }) {
  return pool.query(
    `INSERT INTO order_messages (order_id, sender_id, message_text)
     SELECT $1, $2, $3
     WHERE EXISTS (
       SELECT 1
       FROM orders
       WHERE order_id = $1
         AND (customer_id = $2 OR helper_id = $2)
     )
     RETURNING message_id, order_id, sender_id, message_text, sent_at`,
    [orderId, senderId, messageText]
  ).then((result) => result.rows[0]);
}

module.exports = { listOrderMessages, createOrderMessage };
