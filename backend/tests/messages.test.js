jest.mock('../src/models/messages.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const messagesModel = require('../src/models/messages.model');

function userToken(userId = 3) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/orders/:orderId/messages', () => {
  it('returns ordered messages for the authenticated order participant', async () => {
    messagesModel.listOrderMessages.mockResolvedValue([
      { message_id: 1, order_id: 42, sender_id: 3, message_text: 'Hello' },
    ]);

    const res = await request(app)
      .get('/api/orders/42/messages')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(messagesModel.listOrderMessages).toHaveBeenCalledWith({
      orderId: 42,
      userId: 3,
    });
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/orders/42/messages');

    expect(res.status).toBe(401);
    expect(messagesModel.listOrderMessages).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is not an order participant', async () => {
    messagesModel.listOrderMessages.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/orders/42/messages')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/orders/:orderId/messages', () => {
  it('creates a message using the authenticated sender id', async () => {
    messagesModel.createOrderMessage.mockResolvedValue({
      message_id: 2,
      order_id: 42,
      sender_id: 3,
      message_text: 'Buzz 1204, please.',
    });

    const res = await request(app)
      .post('/api/orders/42/messages')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ message_text: '  Buzz 1204, please.  ' });

    expect(res.status).toBe(201);
    expect(res.body.message_text).toBe('Buzz 1204, please.');
    expect(messagesModel.createOrderMessage).toHaveBeenCalledWith({
      orderId: 42,
      senderId: 3,
      messageText: 'Buzz 1204, please.',
    });
  });

  it('rejects an empty message', async () => {
    const res = await request(app)
      .post('/api/orders/42/messages')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ message_text: '   ' });

    expect(res.status).toBe(400);
    expect(messagesModel.createOrderMessage).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is not an order participant', async () => {
    messagesModel.createOrderMessage.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/orders/42/messages')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ message_text: 'Where should I leave the groceries?' });

    expect(res.status).toBe(404);
  });
});
