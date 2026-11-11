jest.mock('../src/models/collections.model');
process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const model = require('../src/models/collections.model');
const auth = `Bearer ${jwt.sign({ userId: 7 }, process.env.JWT_SECRET)}`;
beforeEach(() => jest.resetAllMocks());

it.each([['get', ''], ['post', ''], ['get', '/1'], ['put', '/1'], ['delete', '/1'], ['post', '/1/items'], ['delete', '/1/items/2']])('requires login for %s %s', async (method, path) => {
  expect((await request(app)[method](`/api/collections${path}`)).status).toBe(401);
});
it('creates a trimmed collection for the token owner', async () => {
  model.createCollection.mockResolvedValue({ collection_id: 1, name: 'Weekly' });
  const res = await request(app).post('/api/collections').set('Authorization', auth).send({ name: ' Weekly ', customer_id: 99 });
  expect(res.status).toBe(201);
  expect(model.createCollection).toHaveBeenCalledWith(7, { name: 'Weekly', description: '', category: null });
});
it('rejects an empty collection name', async () => {
  expect((await request(app).post('/api/collections').set('Authorization', auth).send({ name: ' ' })).status).toBe(400);
  expect(model.createCollection).not.toHaveBeenCalled();
});
it('does not load items for an unowned collection', async () => {
  model.getCollection.mockResolvedValue(null);
  expect((await request(app).get('/api/collections/1').set('Authorization', auth)).status).toBe(404);
  expect(model.getCollection).toHaveBeenCalledWith(1, 7);
  expect(model.getCollectionItems).not.toHaveBeenCalled();
});
it.each(['1e2', '0', '2147483648', '1.5'])('rejects invalid id %s', async id => {
  expect((await request(app).get(`/api/collections/${id}`).set('Authorization', auth)).status).toBe(400);
});
it('accepts ordinary decimal prices such as 0.29', async () => {
  model.addCollectionItem.mockResolvedValue({ collection_item_id: 2 });
  const res = await request(app).post('/api/collections/1/items').set('Authorization', auth)
    .send({ item_name: 'Milk', quantity: 1.1, estimated_unit_price: 0.29 });
  expect(res.status).toBe(201);
  expect(model.addCollectionItem).toHaveBeenCalledWith(1, 7, expect.objectContaining({ estimated_unit_price: 0.29, quantity: 1.1 }));
});
it.each([{ quantity: 0 }, { quantity: true }, { estimated_unit_price: -1 }, { estimated_unit_price: ' ' }, { dietary_options: 'vegan' }])('rejects malformed item %j', async extra => {
  const res = await request(app).post('/api/collections/1/items').set('Authorization', auth).send({ item_name: 'Milk', ...extra });
  expect(res.status).toBe(400);
  expect(model.addCollectionItem).not.toHaveBeenCalled();
});
it('scopes item deletion to the token owner', async () => {
  model.deleteCollectionItem.mockResolvedValue(null);
  expect((await request(app).delete('/api/collections/1/items/2').set('Authorization', auth)).status).toBe(404);
  expect(model.deleteCollectionItem).toHaveBeenCalledWith(1, 7, 2);
});
