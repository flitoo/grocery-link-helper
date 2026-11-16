// Real PostgreSQL/API checks. Fixture writes (including temporary schema setup)
// always roll back; detection is restricted to the fixture customers.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { pool } = require('../src/config/db');
const notifications = require('../src/models/notifications.model');
const app = require('../src/app');

async function main() {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is required.');
  const client = await pool.connect();
  const originalQuery = pool.query;
  try {
    await client.query('BEGIN');
    pool.query = client.query.bind(client);
    const table = await client.query("SELECT to_regclass('public.delivery_notifications') AS name");
    if (!table.rows[0].name) {
      const migration = readFileSync(path.join(__dirname, '../../database/migrations/1794873600000_delivery-delay-notifications.sql'), 'utf8');
      await client.query(migration.split('-- Down Migration')[0]);
    }
    async function user(role) {
      const result = await client.query(
        `INSERT INTO users(full_name, email, password_hash, phone_number, role)
         VALUES ('Notification QA', $1, 'disabled-test-account', '', $2) RETURNING user_id`,
        [`qa-${randomUUID()}@example.invalid`, role]);
      return result.rows[0].user_id;
    }
    const customerId = await user('Customer');
    const otherId = await user('Customer');
    const helperId = await user('Helper');
    const auth = id => `Bearer ${jwt.sign({ userId: id }, config.jwtSecret, { expiresIn: '5m' })}`;
    const store = await client.query("INSERT INTO stores(store_name, address) VALUES ('Notification QA', 'Test address') RETURNING store_id");
    // Future fixtures keep the GET catch-up scan from advancing our fixed clock.
    const slot = '2099-11-01T23:00:00.000Z';
    async function order(status, owner = customerId, deliverySlot = slot, helper = helperId) {
      const result = await client.query(
        `INSERT INTO orders(customer_id, helper_id, store_id, status, delivery_slot, delivery_address, total_amount)
         VALUES ($1, $2, $3, $4, $5, 'Test address', 12.50) RETURNING order_id`,
        [owner, helper, store.rows[0].store_id, status, deliverySlot]);
      return result.rows[0].order_id;
    }
    const eligible = [];
    for (const status of ['Paid', 'Assigned', 'Shopping', 'Out_for_Delivery']) eligible.push(await order(status));
    const excluded = [];
    for (const status of ['Pending', 'Delivered', 'Cancelled']) excluded.push(await order(status));
    const otherOrder = await order('Shopping', otherId);
    const scan = at => notifications.generateDelayNotifications({ customerId, at: new Date(at) });
    assert.equal(await scan('2099-11-01T23:14:59.999Z'), 0, 'No notification before 15 minutes');
    assert.equal(await scan('2099-11-01T23:15:00.000Z'), 4, 'All active paid statuses at 15 minutes');
    assert.equal(await scan('2099-11-02T00:00:00.000Z'), 0, 'Repeated scan must not duplicate');
    let rows = await notifications.listNotifications(customerId);
    assert.deepEqual(rows.map(row => row.order_id).sort((a, b) => a - b), eligible);
    assert.ok(rows.every(row => row.read_at === null && row.kind === 'DeliveryDelayed'));
    assert.equal((await notifications.listNotifications(otherId)).length, 0, 'Customer-scoped scan');
    console.log('PASS: 15-minute boundary, eligible statuses, exclusions, deduplication, scoped scan');

    // UTC conversion must remain correct even if a database session uses Toronto.
    await client.query("SET LOCAL TIME ZONE 'America/Toronto'");
    await order('Paid', customerId, '2099-11-02T01:00:00.000Z');
    assert.equal(await scan('2099-11-02T01:14:59.999Z'), 0);
    assert.equal(await scan('2099-11-02T01:15:00.000Z'), 1);
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("UPDATE orders SET status = 'Delivered' WHERE order_id = $1", [eligible[0]]);
    assert.equal(await scan('2099-11-02T02:00:00.000Z'), 0);
    assert.equal((await notifications.listNotifications(customerId)).length, 5, 'Keep previous delay history after completion');
    console.log('PASS: UTC conversion and delay history after delivery');

    const get = id => request(app).get('/api/notifications').set('Authorization', auth(id));
    assert.equal((await request(app).get('/api/notifications')).status, 401);
    let res = await get(customerId);
    assert.equal(res.status, 200);
    assert.equal(res.body.notifications.length, 5);
    const notificationId = res.body.notifications[0].notification_id;
    res = await request(app).patch(`/api/notifications/${notificationId}/read`).set('Authorization', auth(otherId));
    assert.equal(res.status, 404);
    res = await request(app).patch(`/api/notifications/${notificationId}/read`).set('Authorization', auth(customerId));
    assert.equal(res.status, 200);
    const readAt = res.body.notification.read_at;
    assert.ok(readAt);
    res = await request(app).patch(`/api/notifications/${notificationId}/read`).set('Authorization', auth(customerId));
    assert.equal(res.body.notification.read_at, readAt, 'Mark read is idempotent');
    res = await get(customerId);
    assert.equal(res.body.notifications.find(n => n.notification_id === notificationId).read_at, readAt);
    await notifications.generateDelayNotifications({ customerId: otherId, at: new Date('2099-11-02T02:00:00Z') });
    assert.equal((await notifications.listNotifications(otherId))[0].order_id, otherOrder);
    res = await request(app).patch('/api/notifications/read-all').set('Authorization', auth(customerId));
    assert.equal(res.status, 200);
    assert.ok((await get(customerId)).body.notifications.every(n => n.read_at));
    assert.equal((await get(otherId)).body.notifications[0].read_at, null, 'Mark all respects owner');
    // A request catches up after server downtime without waiting for the timer.
    const catchupId = await order('Paid', customerId, new Date(Date.now() - 16 * 60 * 1000).toISOString());
    assert.ok((await get(customerId)).body.notifications.some(n => n.order_id === catchupId));
    assert.equal((await get(customerId)).body.notifications.length, 6);
    console.log('PASS: API authentication, ownership, persisted read state, mark all and catch-up');

    const rate = (id, owner, score = 5) => request(app).post(`/api/ratings/orders/${id}`)
      .set('Authorization', auth(owner)).send({ score, comments: ' QA rating ' });
    const deliveredId = excluded[1];
    assert.equal((await rate(deliveredId, otherId)).status, 404);
    assert.equal((await rate(eligible[1], customerId)).status, 404);
    assert.equal((await rate(await order('Delivered', customerId, slot, null), customerId)).status, 404);
    assert.equal((await rate(deliveredId, customerId, 0)).status, 400);
    res = await rate(deliveredId, customerId);
    assert.equal(res.status, 201);
    assert.equal(res.body.helper_id, helperId);
    assert.equal(res.body.comments, 'QA rating');
    await client.query('SAVEPOINT duplicate_rating');
    assert.equal((await rate(deliveredId, customerId)).status, 409);
    await client.query('ROLLBACK TO SAVEPOINT duplicate_rating');
    for (const [viewer, expected] of [[customerId, 200], [helperId, 200], [otherId, 404]]) {
      res = await request(app).get(`/api/ratings/orders/${deliveredId}`).set('Authorization', auth(viewer));
      assert.equal(res.status, expected);
    }
    console.log('PASS: ratings eligibility, score validation, ownership, duplicate conflict and participant access');
  } finally {
    pool.query = originalQuery;
    try { await client.query('ROLLBACK'); } finally { client.release(); await pool.end(); }
  }
  console.log('All notification and ratings database checks passed; fixtures rolled back.');
}

main().catch(error => {
  // Do not print connection strings or query parameters on failure.
  console.error('Database verification failed:', error.code || error.name);
  if (error.code === 'ERR_ASSERTION') console.error(error.message);
  process.exitCode = 1;
});
