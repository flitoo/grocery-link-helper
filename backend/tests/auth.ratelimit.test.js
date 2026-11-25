jest.mock('../src/models/user.model', () => ({
  findUserByEmail: jest.fn(async () => null),
  createUser: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');

describe('login rate limit', () => {
  it('blocks the 11th attempt on one account from one address', async () => {
    const attempt = () =>
      request(app).post('/api/auth/login').send({ email: 'victim@example.com', password: 'guess-guess' });

    for (let i = 0; i < 10; i += 1) {
      expect((await attempt()).statusCode).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);
  });

  it('does not block a different account from the same address', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone-else@example.com', password: 'guess-guess' });

    expect(res.statusCode).toBe(401);
  });
});
