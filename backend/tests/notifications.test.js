jest.mock('../src/models/notifications.model');
process.env.JWT_SECRET = 'test-secret';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const model = require('../src/models/notifications.model');
const auth = `Bearer ${jwt.sign({ userId: 7 }, process.env.JWT_SECRET)}`;

beforeEach(() => jest.resetAllMocks());

it.each([['get', '/'], ['patch', '/read-all'], ['patch', '/1/read']])('requires authentication: %s %s', async (method, path) => {
  expect((await request(app)[method](`/api/notifications${path}`)).status).toBe(401);
  expect(model.generateDelayNotifications).not.toHaveBeenCalled();
  expect(model.markRead).not.toHaveBeenCalled();
  expect(model.markAllRead).not.toHaveBeenCalled();
});
it('catches up and lists only the token owner notifications', async () => {
  model.listNotifications.mockResolvedValue([{ notification_id: 1, order_id: 42, kind: 'DeliveryDelayed', read_at: null }]);
  const res = await request(app).get('/api/notifications?customerId=999').set('Authorization', auth);
  expect(res.status).toBe(200);
  expect(res.body.notifications[0].kind).toBe('DeliveryDelayed');
  expect(model.generateDelayNotifications).toHaveBeenCalledWith({ customerId: 7 });
  expect(model.listNotifications).toHaveBeenCalledWith(7);
});
it('returns an empty notification list', async () => {
  model.listNotifications.mockResolvedValue([]);
  expect((await request(app).get('/api/notifications').set('Authorization', auth)).body).toEqual({ notifications: [] });
});
it('marks a notification read for the token owner', async () => {
  model.markRead.mockResolvedValue({ notification_id: 12, read_at: '2026-11-16T18:15:00Z' });
  const res = await request(app).patch('/api/notifications/12/read').set('Authorization', auth).send({ customer_id: 999 });
  expect(res.status).toBe(200);
  expect(model.markRead).toHaveBeenCalledWith(7, 12);
});
it('does not reveal or update another customer notification', async () => {
  model.markRead.mockResolvedValue(undefined);
  expect((await request(app).patch('/api/notifications/12/read').set('Authorization', auth)).status).toBe(404);
});
it.each(['0', '-1', '1e2', '0x10', '2147483648'])('rejects invalid notification id %s', async id => {
  expect((await request(app).patch(`/api/notifications/${id}/read`).set('Authorization', auth)).status).toBe(400);
  expect(model.markRead).not.toHaveBeenCalled();
});
it('marks all read without accepting a different customer id', async () => {
  expect((await request(app).patch('/api/notifications/read-all').set('Authorization', auth).send({ customerId: 999 })).status).toBe(200);
  expect(model.markAllRead).toHaveBeenCalledWith(7);
});
it.each(['generateDelayNotifications', 'listNotifications', 'markRead', 'markAllRead'])('handles %s failures without leaking database errors', async method => {
  model[method].mockRejectedValue(new Error('private database details'));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const path = method === 'markRead' ? '/12/read' : method === 'markAllRead' ? '/read-all' : '';
  const res = await request(app)[path ? 'patch' : 'get'](`/api/notifications${path}`).set('Authorization', auth);
  expect(res.status).toBe(500);
  expect(JSON.stringify(res.body)).not.toContain('private database details');
  spy.mockRestore();
});
