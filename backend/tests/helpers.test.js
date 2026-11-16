jest.mock('../src/config/db', () => ({ pool: { query: jest.fn() } }));
jest.mock('../src/models/helpers.model');
process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const helpers = require('../src/models/helpers.model');
const { pool } = require('../src/config/db');
const auth = `Bearer ${jwt.sign({ userId: 7 }, process.env.JWT_SECRET)}`;
beforeEach(() => { jest.clearAllMocks(); pool.query.mockResolvedValue({ rows: [{ role: 'Helper' }] }); });

it.each(['/stats', '/history'])('requires login for %s', async path => {
  expect((await request(app).get(`/api/helpers${path}`)).status).toBe(401);
  expect(helpers.getStats).not.toHaveBeenCalled();
  expect(helpers.getHistory).not.toHaveBeenCalled();
});
it.each(['/stats', '/history'])('rejects customers for %s', async path => {
  pool.query.mockResolvedValue({ rows: [{ role: 'Customer' }] });
  expect((await request(app).get(`/api/helpers${path}`).set('Authorization', auth)).status).toBe(403);
});
it('returns stats only for the token helper', async () => {
  helpers.getStats.mockResolvedValue({ completed_orders: 3, average_rating: null });
  const res = await request(app).get('/api/helpers/stats?helperId=99').set('Authorization', auth);
  expect(res.status).toBe(200);
  expect(helpers.getStats).toHaveBeenCalledWith(7);
  expect(res.body.stats.average_rating).toBeNull();
});
it('paginates history without exposing internal counts', async () => {
  helpers.getHistory.mockResolvedValue([{ order_id: 3, total_count: 25 }]);
  const res = await request(app).get('/api/helpers/history?page=2&limit=10').set('Authorization', auth);
  expect(res.status).toBe(200);
  expect(helpers.getHistory).toHaveBeenCalledWith(7, 10, 10);
  expect(res.body).toEqual({ orders: [{ order_id: 3 }], page: 2, has_more: true });
});
it.each(['page=0', 'page=abc', 'limit=101', 'page=1.5', 'limit=-1'])('rejects invalid pagination %s', async query => {
  expect((await request(app).get(`/api/helpers/history?${query}`).set('Authorization', auth)).status).toBe(400);
  expect(helpers.getHistory).not.toHaveBeenCalled();
});
it('returns empty history', async () => {
  helpers.getHistory.mockResolvedValue([]);
  const res = await request(app).get('/api/helpers/history').set('Authorization', auth);
  expect(res.body).toEqual({ orders: [], page: 1, has_more: false });
});
it('handles stats failures', async () => {
  helpers.getStats.mockRejectedValue(new Error('db failure'));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect((await request(app).get('/api/helpers/stats').set('Authorization', auth)).status).toBe(500);
  spy.mockRestore();
});
