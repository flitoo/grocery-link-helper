const { pool } = require('../config/db');

async function createRating({ orderId, customerId, score, comments }) {
  const result = await pool.query(
    `INSERT INTO ratings (order_id, customer_id, helper_id, score, comments)
     SELECT o.order_id, o.customer_id, o.helper_id, $3, $4
     FROM (VALUES ($1::integer, $2::integer)) AS requested(order_id, customer_id)
     JOIN orders o
       ON o.order_id = requested.order_id
      AND o.customer_id = requested.customer_id
      AND o.status = 'Delivered'
      AND o.helper_id IS NOT NULL
     RETURNING rating_id, order_id, customer_id, helper_id, score, comments`,
    [orderId, customerId, score, comments]
  );
  return result.rows[0];
}

async function getOrderRating({ orderId, userId }) {
  const participant = await pool.query(
    `SELECT r.rating_id, r.order_id, r.customer_id, r.helper_id, r.score, r.comments
     FROM ratings r
     JOIN orders o
       ON o.order_id = r.order_id
      AND o.order_id = $1
      AND (o.customer_id = $2 OR o.helper_id = $2)`,
    [orderId, userId]
  );
  return participant.rows[0];
}

module.exports = { createRating, getOrderRating };
