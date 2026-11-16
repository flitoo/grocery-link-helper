jest.mock('../src/models/ratings.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ratingsModel = require('../src/models/ratings.model');

function token(userId = 3) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

beforeEach(() => jest.resetAllMocks());

describe('POST /api/ratings/orders/:orderId', () => {
  it('creates a rating with the authenticated customer id', async () => {
    ratingsModel.createRating.mockResolvedValue({
      rating_id: 1,
      order_id: 42,
      customer_id: 3,
      helper_id: 7,
      score: 5,
      comments: 'Great delivery',
    });

    const res = await request(app)
      .post('/api/ratings/orders/42')
      .set('Authorization', `Bearer ${token()}`)
      .send({ score: 5, comments: '  Great delivery  ' });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(5);
    expect(ratingsModel.createRating).toHaveBeenCalledWith({
      orderId: 42,
      customerId: 3,
      score: 5,
      comments: 'Great delivery',
    });
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/ratings/orders/42').send({ score: 5 });

    expect(res.status).toBe(401);
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5, '5'] )('rejects invalid score %s', async (score) => {
    const res = await request(app)
      .post('/api/ratings/orders/42')
      .set('Authorization', `Bearer ${token()}`)
      .send({ score });

    expect(res.status).toBe(400);
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
  });

  it('returns 409 when the order already has a rating', async () => {
    ratingsModel.createRating.mockRejectedValue({ code: '23505' });

    const res = await request(app)
      .post('/api/ratings/orders/42')
      .set('Authorization', `Bearer ${token()}`)
      .send({ score: 4 });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/ratings/orders/:orderId', () => {
  it('returns the order rating to an authenticated participant', async () => {
    ratingsModel.getOrderRating.mockResolvedValue({
      rating_id: 1,
      order_id: 42,
      score: 5,
    });

    const res = await request(app)
      .get('/api/ratings/orders/42')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(5);
    expect(ratingsModel.getOrderRating).toHaveBeenCalledWith({ orderId: 42, userId: 3 });
  });

  it('returns 404 when no accessible rating exists', async () => {
    ratingsModel.getOrderRating.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/ratings/orders/42')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
  });
});

describe('Rating validation and access boundaries', () => {
  it.each(['get', 'post'])('rejects expired login tokens for %s', async method => {
    const expired = jwt.sign({ userId: 3 }, process.env.JWT_SECRET, { expiresIn: -1 });
    const res = await request(app)[method]('/api/ratings/orders/42').set('Authorization', `Bearer ${expired}`).send({ score: 5 });
    expect(res.status).toBe(401);
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
    expect(ratingsModel.getOrderRating).not.toHaveBeenCalled();
  });
  it.each(['get', 'post'])('validates route IDs for %s', async method => {
    for (const id of ['0', '-1', '1.5', '1e2', '2147483648']) {
      expect((await request(app)[method](`/api/ratings/orders/${id}`).set('Authorization', `Bearer ${token()}`).send({ score: 5 })).status).toBe(400);
    }
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
    expect(ratingsModel.getOrderRating).not.toHaveBeenCalled();
  });
  it.each([undefined, null, true, [], {}])('rejects missing or invalid score %j', async score => {
    expect((await request(app).post('/api/ratings/orders/42').set('Authorization', `Bearer ${token()}`).send({ score })).status).toBe(400);
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
  });
  it.each([null, 12, {}, []])('rejects non-text comments %j', async comments => {
    expect((await request(app).post('/api/ratings/orders/42').set('Authorization', `Bearer ${token()}`).send({ score: 5, comments })).status).toBe(400);
    expect(ratingsModel.createRating).not.toHaveBeenCalled();
  });
  it.each([1, 5])('accepts boundary score %s without letting the body choose the customer or helper', async score => {
    ratingsModel.createRating.mockResolvedValue({ rating_id: 1, score });
    const res = await request(app).post('/api/ratings/orders/42').set('Authorization', `Bearer ${token()}`)
      .send({ score, customer_id: 999, helper_id: 999, comments: '   ' });
    expect(res.status).toBe(201);
    expect(ratingsModel.createRating).toHaveBeenCalledWith({ orderId: 42, customerId: 3, score, comments: null });
  });
  it('returns 404 when the order is not eligible or not owned', async () => {
    ratingsModel.createRating.mockResolvedValue(undefined);
    const res = await request(app).post('/api/ratings/orders/42').set('Authorization', `Bearer ${token()}`).send({ score: 5 });
    expect(res.status).toBe(404);
  });
  it.each(['get', 'post'])('returns a safe error if the database fails on %s', async method => {
    ratingsModel[method === 'get' ? 'getOrderRating' : 'createRating'].mockRejectedValue(new Error('private database details'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)[method]('/api/ratings/orders/42').set('Authorization', `Bearer ${token()}`).send({ score: 5 });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('private database details');
    spy.mockRestore();
  });
});
