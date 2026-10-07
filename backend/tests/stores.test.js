jest.mock('../src/models/stores.model');

const request = require('supertest');
const app = require('../src/app');
const storesModel = require('../src/models/stores.model');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/stores', () => {
  it('returns the active stores', async () => {
    const stores = [
      { store_id: 1, store_name: 'T&T Supermarket', address: '1800 Sheppard Avenue E' },
      { store_id: 2, store_name: 'No Frills', address: '4771 Yonge Street' },
    ];
    storesModel.listActiveStores.mockResolvedValue(stores);

    const res = await request(app).get('/api/stores');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stores });
  });

  it('returns an empty list when no store is active', async () => {
    storesModel.listActiveStores.mockResolvedValue([]);

    const res = await request(app).get('/api/stores');

    expect(res.status).toBe(200);
    expect(res.body.stores).toEqual([]);
  });

  it('returns 500 when the database fails', async () => {
    storesModel.listActiveStores.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).get('/api/stores');

    expect(res.status).toBe(500);
  });
});
