const { Pool, types } = require('pg');
const config = require('./index');

// TIMESTAMP (no zone) columns hold UTC wall-clock time. By default `pg` parses
// them as the Node machine's local time, which shifts every delivery_slot,
// created_at and sent_at by the UTC offset (e.g. 5h in Toronto). Parse as UTC.
const PG_TIMESTAMP_OID = 1114;
types.setTypeParser(PG_TIMESTAMP_OID, (value) => new Date(`${value.replace(' ', 'T')}Z`));

// Neon (and most managed Postgres hosts) require TLS. The connection string
// already carries `sslmode=require`, but `pg` needs an explicit ssl option
// to skip validating Neon's intermediate CA chain from Node.
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl && config.databaseUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

// DEFAULT CURRENT_TIMESTAMP / NOW() write the session's local time into
// TIMESTAMP columns, so pin every session to UTC to keep them UTC wall-clock.
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'UTC'").catch((err) => {
    console.error('Failed to set session time zone to UTC:', err);
  });
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
