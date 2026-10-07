const { pool } = require('../config/db');

/**
 * Active stores a customer can choose from, in a stable order.
 */
async function listActiveStores() {
  const result = await pool.query(
    `SELECT store_id, store_name, address
     FROM stores
     WHERE is_active = TRUE
     ORDER BY store_id`
  );
  return result.rows;
}

module.exports = { listActiveStores };
