jest.mock('../src/models/ratings.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const ratingsModel = require('../src/models/ratings.model');

function token(userId = 3) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
});

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
