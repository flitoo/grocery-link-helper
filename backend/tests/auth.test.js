// Mock the user model with an in-memory store so these tests never touch a real database.
jest.mock('../src/models/user.model', () => {
  const users = [];
  return {
    findUserByEmail: jest.fn(async (email) => users.find((u) => u.email === email) || null),
    createUser: jest.fn(async ({ name, email, passwordHash }) => {
      const user = { id: users.length + 1, name, email, password_hash: passwordHash };
      users.push(user);
      return { id: user.id, name, email };
    }),
  };
});

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');

const testUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'password123',
};

describe('POST /api/auth/register', () => {
  it('should create a new user and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject registering the same email twice', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(409);
  });

  it('should reject a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Pass', email: 'short@example.com', password: '123' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'password123' });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should log in with correct credentials and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });

  it('should reject a login for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.statusCode).toBe(401);
  });

  it('should reject a missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email });

    expect(res.statusCode).toBe(400);
  });
});

describe('auth input handling', () => {
  it('rejects a login with no request body instead of crashing', async () => {
    const res = await request(app).post('/api/auth/login');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects a register with no request body instead of crashing', async () => {
    const res = await request(app).post('/api/auth/register');

    expect(res.statusCode).toBe(400);
  });

  it('rejects an email sent as an array', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Array Email', email: ['array@example.com'], password: 'password123' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a password that is not a string', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Number Pass', email: 'numpass@example.com', password: 12345678 });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a name longer than the database column', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(101), email: 'longname@example.com', password: 'password123' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a password bcrypt would silently truncate', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Long Pass', email: 'longpass@example.com', password: 'p'.repeat(73) });

    expect(res.statusCode).toBe(400);
  });

  it('treats emails case-insensitively when registering', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: '  TestUser@Example.COM ' });

    expect(res.statusCode).toBe(409);
  });

  it('treats emails case-insensitively when logging in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'TESTUSER@example.com', password: testUser.password });

    expect(res.statusCode).toBe(200);
  });
});
