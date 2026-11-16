const { pool } = require('../config/db');

const DELAY_MINUTES = 15;

async function generateDelayNotifications({ customerId = null, at = new Date() } = {}) {
  // Lock eligible orders so completion/cancellation and detection cannot race.
  // The unique key makes repeated polls and concurrent server instances safe.
  const result = await pool.query(
    `WITH overdue AS (
       SELECT o.order_id, o.customer_id FROM orders o
       WHERE o.status IN ('Paid', 'Assigned', 'Shopping', 'Out_for_Delivery')
         AND o.delivery_slot <= ($1::timestamptz AT TIME ZONE 'UTC') - $3::integer * INTERVAL '1 minute'
         AND ($2::integer IS NULL OR o.customer_id = $2)
         AND NOT EXISTS (SELECT 1 FROM delivery_notifications n
                         WHERE n.order_id = o.order_id AND n.kind = 'DeliveryDelayed')
       ORDER BY o.delivery_slot, o.order_id
       LIMIT 200 FOR UPDATE OF o SKIP LOCKED
     )
     INSERT INTO delivery_notifications (order_id, customer_id, kind, created_at)
     SELECT order_id, customer_id, 'DeliveryDelayed', $1::timestamptz FROM overdue
     ON CONFLICT (order_id, kind) DO NOTHING
     RETURNING notification_id`, [at, customerId, DELAY_MINUTES]
  );
  return result.rowCount;
}

async function listNotifications(customerId) {
  const result = await pool.query(
    `SELECT notification_id, order_id, kind, created_at, read_at
     FROM delivery_notifications WHERE customer_id = $1
     ORDER BY created_at DESC, notification_id DESC`, [customerId]
  );
  return result.rows;
}

async function markRead(customerId, notificationId) {
  const result = await pool.query(
    `UPDATE delivery_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE customer_id = $1 AND notification_id = $2
     RETURNING notification_id, read_at`, [customerId, notificationId]
  );
  return result.rows[0];
}

async function markAllRead(customerId) {
  await pool.query(
    `UPDATE delivery_notifications SET read_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1 AND read_at IS NULL`, [customerId]
  );
}

module.exports = { DELAY_MINUTES, generateDelayNotifications, listNotifications, markRead, markAllRead };
