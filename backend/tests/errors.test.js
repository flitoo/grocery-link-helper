const request = require('supertest');
const app = require('../src/app');
const { errorHandler } = require('../src/middleware/error.middleware');

function fakeRes() {
  const res = { headersSent: false };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('malformed JSON bodies', () => {
  it('returns a JSON 400 without a stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad');

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBe('Request body must be valid JSON.');
    expect(res.body.errors).toEqual(['Request body must be valid JSON.']);
    expect(res.text).not.toMatch(/SyntaxError|node_modules|\.js:\d+/);
  });
});

describe('errorHandler', () => {
  it('hides the details of unexpected errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeRes();

    errorHandler(new Error('db password is hunter2'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/hunter2/);
    spy.mockRestore();
  });

  it('passes the error on when a response was already started', () => {
    const res = fakeRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new Error('late');

    errorHandler(err, {}, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
