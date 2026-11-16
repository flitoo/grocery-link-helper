// Exercise real HTTP handlers and SQL. All test records stay inside a transaction.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const db = require('../src/config/db');

async function main() {
  const client = await db.pool.connect();
  const originalQuery = db.pool.query;
  const originalTransaction = db.withTransaction;
  let serial = 0;
  try {
    await client.query('BEGIN');
    db.pool.query = client.query.bind(client);
    // Nested model transactions use savepoints, so no fixture can be committed.
    db.withTransaction = async callback => {
      const name = `qa_${++serial}`;
      await client.query(`SAVEPOINT ${name}`);
      try {
        const value = await callback(client);
        await client.query(`RELEASE SAVEPOINT ${name}`);
        return value;
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
        await client.query(`RELEASE SAVEPOINT ${name}`);
        throw error;
      }
    };
    // Load models only after installing the transaction adapter.
    const app = require('../src/app');
    async function user(role) {
      const result = await client.query(`INSERT INTO users(full_name,email,password_hash,phone_number,role)
        VALUES ('Tracking QA',$1,'disabled-test-account','',$2) RETURNING user_id`,
      [`qa-${randomUUID()}@example.invalid`, role]);
      return result.rows[0].user_id;
    }
    const customer = await user('Customer');
    const helper = await user('Helper');
    const outsider = await user('Customer');
    const otherHelper = await user('Helper');
    const auth = id => `Bearer ${jwt.sign({ userId: id }, config.jwtSecret, { expiresIn: '5m' })}`;
    const store = (await client.query("INSERT INTO stores(store_name,address) VALUES ('Tracking QA','Test address') RETURNING store_id")).rows[0].store_id;
    async function order(owner = customer, status = 'Paid') {
      return (await client.query(`INSERT INTO orders(customer_id,store_id,status,delivery_slot,delivery_address,total_amount)
        VALUES ($1,$2,$3,'2099-01-01 18:00:00','QA address',25.00) RETURNING order_id`, [owner, store, status])).rows[0].order_id;
    }
    async function item(orderId, allowed = true) {
      return (await client.query(`INSERT INTO order_items(order_id,item_name,quantity,estimated_price,allow_substitution)
        VALUES ($1,'Milk',1,5.00,$2) RETURNING item_id`, [orderId, allowed])).rows[0].item_id;
    }
    const id = await order();
    const first = await item(id);
    const second = await item(id);
    const third = await item(id);
    const forbidden = await item(id, false);
    const foreignOrder = await order(outsider);
    const foreignItem = await item(foreignOrder);
    const base = `/api/substitution-requests/orders/${id}`;
    const getOrder = (viewer = customer) => request(app).get(`/api/orders/${id}`).set('Authorization', auth(viewer));
    const list = (viewer = customer) => request(app).get(base).set('Authorization', auth(viewer));
    const propose = (itemId = first, actor = helper) => request(app).post(base).set('Authorization', auth(actor))
      .send({ original_item_id: itemId, suggested_item_name: ' Oat milk ', price_difference: -0.5 });
    const respond = (subId, status, actor = customer) => request(app).patch(`${base}/${subId}`)
      .set('Authorization', auth(actor)).send({ status });
    const advance = (status, actor = helper) => request(app).patch(`/api/orders/${id}/status`)
      .set('Authorization', auth(actor)).send({ status });

    assert.equal((await request(app).get(`/api/orders/${id}`)).status, 401);
    assert.equal((await request(app).get(base)).status, 401);
    assert.equal((await getOrder()).body.status, 'Paid');
    assert.equal((await list()).body.length, 0);
    assert.equal((await getOrder(outsider)).status, 404);
    assert.equal((await propose()).status, 404, 'No proposals before assignment and shopping');
    assert.equal((await request(app).post(`/api/deliveries/${id}/claim`).set('Authorization', auth(helper))).status, 201);
    assert.equal((await getOrder()).body.status, 'Assigned');
    assert.equal((await advance('Delivered')).status, 409, 'Cannot skip stages');
    assert.equal((await advance('Shopping', customer)).status, 403);
    assert.equal((await advance('Shopping', otherHelper)).status, 403);
    assert.equal((await advance('Shopping')).status, 200);
    assert.equal((await getOrder(helper)).body.status, 'Shopping');
    assert.equal((await getOrder(otherHelper)).status, 404);
    assert.equal((await advance('Shopping')).status, 409, 'No repeated transition');
    console.log('PASS: Tracking authentication, ownership, claim and sequential status updates');

    for (const viewer of [outsider, otherHelper]) assert.equal((await list(viewer)).status, 404);
    for (const actor of [customer, outsider, otherHelper]) assert.equal((await propose(first, actor)).status, 404);
    assert.equal((await propose(forbidden)).status, 404, 'Customer disabled replacements');
    assert.equal((await propose(foreignItem)).status, 404, 'Item belongs to another order');
    let res = await propose();
    assert.equal(res.status, 201);
    assert.equal(res.body.suggested_item_name, 'Oat milk');
    assert.equal(Number(res.body.price_difference), -0.5);
    const firstRequest = res.body.substitution_id;
    assert.equal((await propose()).status, 409, 'An item cannot have two active proposals');
    assert.equal((await list()).body.length, 1);
    for (const actor of [helper, outsider, otherHelper]) assert.equal((await respond(firstRequest, 'Approved', actor)).status, 404);
    assert.equal((await request(app).patch(`/api/substitution-requests/orders/${foreignOrder}/${firstRequest}`)
      .set('Authorization', auth(outsider)).send({ status: 'Approved' })).status, 404);
    assert.equal((await respond(firstRequest, 'Approved')).status, 200);
    assert.equal((await list(helper)).body[0].status, 'Approved');
    assert.equal((await respond(firstRequest, 'Rejected')).status, 404, 'Decision is final');
    assert.equal((await propose()).status, 409, 'Approved item cannot be proposed again');
    const secondRequest = (await propose(second)).body.substitution_id;
    assert.equal((await respond(secondRequest, 'Rejected')).status, 200);
    assert.equal((await propose(second)).status, 201, 'Rejected suggestion allows another proposal');
    const thirdRequest = (await propose(third)).body.substitution_id;
    console.log('PASS: Replacement eligibility, duplicate protection, approval/rejection and access control');

    assert.equal((await advance('Out_for_Delivery')).status, 200);
    assert.equal((await getOrder()).body.status, 'Out_for_Delivery');
    assert.equal((await propose()).status, 404);
    assert.equal((await advance('Delivered')).status, 200);
    const delivered = (await getOrder()).body;
    assert.equal(delivered.status, 'Delivered');
    assert.equal(delivered.helper_name, 'Tracking QA');
    assert.equal(delivered.delivery_slot, '2099-01-01T18:00:00.000Z');
    assert.equal(delivered.items.length, 4);
    assert.equal((await respond(thirdRequest, 'Approved')).status, 404, 'Cannot change delivered order');
    assert.equal((await advance('Shopping')).status, 409);
    const delivery = (await client.query('SELECT delivery_status,completed_at FROM deliveries WHERE order_id=$1', [id])).rows[0];
    assert.equal(delivery.delivery_status, 'Completed');
    assert.ok(delivery.completed_at);
    await client.query("UPDATE orders SET status='Cancelled' WHERE order_id=$1", [id]);
    assert.equal((await getOrder()).body.status, 'Cancelled');
    assert.equal((await respond(thirdRequest, 'Rejected')).status, 404);
    assert.equal((await advance('Delivered')).status, 409);
    console.log('PASS: Out-for-delivery, Delivered, completion timestamp and terminal-order guards');
  } finally {
    db.pool.query = originalQuery;
    db.withTransaction = originalTransaction;
    try { await client.query('ROLLBACK'); } finally { client.release(); await db.pool.end(); }
  }
  console.log('All substitution and tracking checks passed; fixtures rolled back.');
}
main().catch(error => {
  console.error('Substitution/tracking QA failed:', error.code || error.name);
  if (error.code === 'ERR_ASSERTION') console.error(error.message);
  process.exitCode = 1;
});
