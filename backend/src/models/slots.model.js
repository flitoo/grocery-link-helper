const { pool } = require('../config/db');
const config = require('../config');

// Orders in these states no longer occupy a helper for their slot.
const INACTIVE_STATUSES = ['Cancelled'];

// delivery_slot is a TIMESTAMP (no zone) holding the UTC wall-clock time, so
// compare and format it as UTC.
const SLOT_KEY_SQL = `to_char(date_trunc('hour', delivery_slot), 'YYYY-MM-DD"T"HH24:MI:SS".000Z"')`;

/**
 * Orders-per-slot capacity (BR-07): the number of helpers, unless
 * SLOT_CAPACITY overrides it.
 */
async function getCapacity(client = pool) {
  if (config.slots.capacityOverride) {
    return config.slots.capacityOverride;
  }
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'Helper'`);
  return result.rows[0].count;
}

/**
 * Active order counts per slot in [from, to). Returns Map<isoStart, count>.
 */
async function countActiveOrdersBySlot(from, to, client = pool) {
  const result = await client.query(
    `SELECT ${SLOT_KEY_SQL} AS slot, COUNT(*)::int AS count
     FROM orders
     WHERE delivery_slot >= $1::timestamp AND delivery_slot < $2::timestamp
       AND status <> ALL($3)
     GROUP BY 1`,
    [from.toISOString(), to.toISOString(), INACTIVE_STATUSES]
  );
  return new Map(result.rows.map((row) => [row.slot, row.count]));
}

/**
 * Throws SLOT_FULL if the slot has no capacity left. Call inside the order
 * transaction: the advisory lock serialises concurrent bookings of the same
 * slot so two customers can't both take the last place.
 */
async function assertSlotHasCapacity(client, slotIso) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`delivery_slot:${slotIso}`]);

  const capacity = await getCapacity(client);
  const slot = new Date(slotIso);
  const next = new Date(slot.getTime() + 60 * 60 * 1000);
  const booked = (await countActiveOrdersBySlot(slot, next, client)).get(slot.toISOString()) || 0;

  if (booked >= capacity) {
    const err = new Error('Delivery slot is full.');
    err.code = 'SLOT_FULL';
    throw err;
  }
}

module.exports = { getCapacity, countActiveOrdersBySlot, assertSlotHasCapacity };
