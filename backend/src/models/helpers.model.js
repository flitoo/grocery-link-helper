const { pool } = require('../config/db');

async function getStats(helperId) {
  // Separate aggregates avoid multiplying orders by their ratings/deliveries.
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM orders WHERE helper_id = $1
        AND status IN ('Assigned', 'Shopping', 'Out_for_Delivery')) AS active_orders,
      (SELECT COUNT(*)::int FROM orders WHERE helper_id = $1 AND status = 'Delivered') AS completed_orders,
      (SELECT COUNT(*)::int FROM orders WHERE helper_id = $1 AND status = 'Cancelled') AS cancelled_orders,
      (SELECT ROUND(AVG(score), 2)::float FROM ratings WHERE helper_id = $1) AS average_rating,
      (SELECT COUNT(*)::int FROM ratings WHERE helper_id = $1) AS rating_count`,
    [helperId]
  );
  return result.rows[0];
}

async function getHistory(helperId, limit, offset) {
  const result = await pool.query(
    `SELECT o.order_id, o.status, o.delivery_slot, o.total_amount, s.store_name,
      d.completed_at, r.score AS rating,
      COUNT(*) OVER()::int AS total_count
     FROM orders o JOIN stores s ON s.store_id = o.store_id
     LEFT JOIN deliveries d ON d.order_id = o.order_id
     LEFT JOIN ratings r ON r.order_id = o.order_id
     WHERE o.helper_id = $1 AND o.status IN ('Delivered', 'Cancelled')
     ORDER BY COALESCE(d.completed_at, o.created_at) DESC, o.order_id DESC
     LIMIT $2 OFFSET $3`, [helperId, limit, offset]
  );
  return result.rows;
}

module.exports = { getStats, getHistory };
