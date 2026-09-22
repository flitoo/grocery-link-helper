const { Pool } = require('pg');
const config = require('./index');

// Neon (and most managed Postgres hosts) require TLS. The connection string
// already carries `sslmode=require`, but `pg` needs an explicit ssl option
// to skip validating Neon's intermediate CA chain from Node.
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl && config.databaseUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

/**
 * Runs `fn` with a single client inside a BEGIN/COMMIT transaction,
 * rolling back if `fn` throws. `fn` receives the client to query with.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
