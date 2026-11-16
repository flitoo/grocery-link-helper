// Optional integration check against DATABASE_URL. All fixture writes roll back.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { pool } = require('../src/config/db');
const app = require('../src/app');

async function main() {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is required.');
  const client = await pool.connect();
  const originalQuery = pool.query;
  try {
    await client.query('BEGIN');
    // Keep HTTP handlers on this isolated transaction, invisible to other sessions.
    pool.query = client.query.bind(client);
    async function user(role) {
      const result = await client.query(
        `INSERT INTO users(full_name, email, password_hash, phone_number, role)
         VALUES ('Feature verification', $1, 'disabled-test-account', '', $2) RETURNING user_id`,
        [`feature-${randomUUID()}@example.invalid`, role]
      );
      return result.rows[0].user_id;
    }
    const customerId = await user('Customer');
    const helperId = await user('Helper');
    const otherId = await user('Customer');
    const auth = id => `Bearer ${jwt.sign({ userId: id }, config.jwtSecret, { expiresIn: '5m' })}`;
    const customerAuth = auth(customerId);
    const helperAuth = auth(helperId);

    let res = await request(app).post('/api/collections').set('Authorization', customerAuth)
      .send({ name: 'Verification collection', category: 'Weekly', description: 'Temporary fixture' });
    assert.equal(res.status, 201);
    const id = res.body.collection.collection_id;
    res = await request(app).post(`/api/collections/${id}/items`).set('Authorization', customerAuth)
      .send({ item_name: 'Milk', quantity: 2, unit: 'bottles', estimated_unit_price: 0.29, dietary_options: ['Lactose free'] });
    assert.equal(res.status, 201);
    const itemId = res.body.item.collection_item_id;
    res = await request(app).get(`/api/collections/${id}`).set('Authorization', customerAuth);
    assert.equal(res.status, 200);
    assert.equal(res.body.collection.items.length, 1);
    assert.equal(Number(res.body.collection.items[0].estimated_unit_price), 0.29);
    res = await request(app).get(`/api/collections/${id}`).set('Authorization', auth(otherId));
    assert.equal(res.status, 404);
    res = await request(app).put(`/api/collections/${id}`).set('Authorization', customerAuth).send({ name: 'Renamed collection' });
    assert.equal(res.status, 200);
    res = await request(app).delete(`/api/collections/${id}/items/${itemId}`).set('Authorization', customerAuth);
    assert.equal(res.status, 200);
    res = await request(app).delete(`/api/collections/${id}`).set('Authorization', customerAuth);
    assert.equal(res.status, 200);

    const store = await client.query("INSERT INTO stores(store_name, address) VALUES ('Verification store', 'Test address') RETURNING store_id");
    for (const status of ['Delivered', 'Assigned', 'Cancelled']) {
      const result = await client.query(
        `INSERT INTO orders(customer_id, helper_id, store_id, status, delivery_slot, delivery_address, total_amount)
         VALUES ($1, $2, $3, $4, NOW(), 'Test address', 12.50) RETURNING order_id`,
        [customerId, helperId, store.rows[0].store_id, status]
      );
      if (status === 'Delivered') {
        const orderId = result.rows[0].order_id;
        await client.query("INSERT INTO deliveries(order_id, helper_id, delivery_status, completed_at) VALUES ($1, $2, 'Completed', NOW())", [orderId, helperId]);
        res = await request(app).post(`/api/ratings/orders/${orderId}`).set('Authorization', customerAuth)
          .send({ score: 5, comments: 'Verification feedback' });
        assert.equal(res.status, 201);
      }
    }
    res = await request(app).get('/api/orders').set('Authorization', customerAuth);
    assert.equal(res.status, 200);
    assert.equal(res.body.orders.length, 3);
    assert.equal(res.body.orders[0].item_count, 0);
    res = await request(app).get('/api/helpers/stats').set('Authorization', helperAuth);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.stats, { active_orders: 1, completed_orders: 1, cancelled_orders: 1, average_rating: 5, rating_count: 1 });
    res = await request(app).get('/api/helpers/history?limit=1').set('Authorization', helperAuth);
    assert.equal(res.status, 200);
    assert.equal(res.body.orders.length, 1);
    assert.equal(res.body.has_more, true);
    res = await request(app).get('/api/helpers/history?page=2&limit=1').set('Authorization', helperAuth);
    assert.equal(res.body.orders.length, 1);
    assert.equal(res.body.has_more, false);
    console.log('PASS: Collections CRUD, ownership, helper statistics and history pagination.');
  } finally {
    pool.query = originalQuery;
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
    console.log('Verification fixtures rolled back.');
  }
}
main().catch(error => {
  console.error('Feature verification failed:', error.code || error.message);
  process.exitCode = 1;
});
