const { pool } = require('../config/db');

async function listOrderSubstitutionRequests({ orderId, userId }) {
  const result = await pool.query(
    `SELECT sr.substitution_id, sr.order_id, sr.original_item_id, sr.suggested_item_name,
            sr.price_difference, sr.status
     FROM (VALUES ($1::integer, $2::integer)) AS requested(order_id, user_id)
     JOIN orders o
       ON o.order_id = requested.order_id
      AND (o.customer_id = requested.user_id OR o.helper_id = requested.user_id)
     LEFT JOIN substitution_requests sr
       ON sr.order_id = o.order_id
     ORDER BY sr.substitution_id`,
    [orderId, userId]
  );
  if (result.rows.length === 0) {
    return undefined;
  }
  return result.rows.filter((row) => row.substitution_id !== null);
}

async function createSubstitutionRequest({
  orderId,
  helperId,
  originalItemId,
  suggestedItemName,
  priceDifference,
}) {
  const result = await pool.query(
    `INSERT INTO substitution_requests
       (order_id, original_item_id, suggested_item_name, price_difference)
     SELECT o.order_id, i.item_id, $4, $5
     FROM (VALUES ($1::integer, $2::integer, $3::integer))
          AS requested(order_id, helper_id, item_id)
     JOIN orders o
       ON o.order_id = requested.order_id
      AND o.helper_id = requested.helper_id
      AND o.status = 'Shopping'
     JOIN order_items i
       ON i.order_id = o.order_id
      AND i.item_id = requested.item_id
      AND i.allow_substitution = TRUE
     RETURNING substitution_id, order_id, original_item_id, suggested_item_name,
               price_difference, status`,
    [orderId, helperId, originalItemId, suggestedItemName, priceDifference]
  );
  return result.rows[0];
}

async function respondToSubstitutionRequest({ orderId, substitutionId, customerId, status }) {
  const result = await pool.query(
    `UPDATE substitution_requests sr
     SET status = $4
     FROM orders o
     WHERE sr.substitution_id = $1
       AND sr.order_id = $2
       AND o.order_id = sr.order_id
       AND o.customer_id = $3
       AND sr.status = 'Pending'
     RETURNING sr.substitution_id, sr.order_id, sr.original_item_id,
               sr.suggested_item_name, sr.price_difference, sr.status`,
    [substitutionId, orderId, customerId, status]
  );
  return result.rows[0];
}

module.exports = {
  listOrderSubstitutionRequests,
  createSubstitutionRequest,
  respondToSubstitutionRequest,
};
