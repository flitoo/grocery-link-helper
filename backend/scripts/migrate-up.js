const { readdirSync } = require('node:fs');
const path = require('node:path');
const { pool } = require('../src/config/db');
const { checkMigrationOrder } = require('./migration-order');

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Supported option: --dry-run');
  const { runner, PG_MIGRATE_LOCK_ID } = await import('node-pg-migrate');
  const dir = path.join(__dirname, '../../database/migrations');
  const available = readdirSync(dir).filter(name => /^\d+_.+\.sql$/.test(name))
    .sort().map(name => name.slice(0, -4));
  const client = await pool.connect();
  let locked = false;
  try {
    // Hold the standard migration lock while checking history AND applying SQL.
    const lock = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS locked', [PG_MIGRATE_LOCK_ID]);
    locked = lock.rows[0].locked;
    if (!locked) throw new Error('Another migration is already running. Try again after it finishes.');
    const table = await client.query("SELECT to_regclass('public.pgmigrations') AS name");
    const applied = table.rows[0].name
      ? (await client.query('SELECT name FROM public.pgmigrations ORDER BY run_on, id')).rows.map(row => row.name)
      : [];
    const { checkOrder } = checkMigrationOrder(applied, available);
    if (!checkOrder) console.log('Allowing the known late Collections compatibility migration.');
    const migrations = await runner({
      dbClient: client, dir, direction: 'up', migrationsTable: 'pgmigrations',
      schema: 'public', migrationsSchema: 'public',
      checkOrder, singleTransaction: true, noLock: true,
      dryRun: args.includes('--dry-run'),
      logger: { info: console.log, warn: console.warn, error: () => console.error('Migration query failed.') },
    });
    console.log(`${args.includes('--dry-run') ? 'Previewed' : 'Applied'} ${migrations.length} migration(s).`);
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock($1::bigint)', [PG_MIGRATE_LOCK_ID]);
    } finally { client.release(); }
  }
}

main().catch(error => {
  // Avoid including database URLs, query parameters or credentials in CI logs.
  console.error('Migration failed:', error.code || error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
