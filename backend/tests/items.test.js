jest.mock('../src/models/items.model');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const itemsModel = require('../src/models/items.model');

function auth(userId = 4) {
  return { Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` };
}

const milk = {
  item_id: 11,
  store_id: 2,
  name: '2% Milk, 4 L',
  brand: 'Neilson',
  category: 'Dairy & Eggs',
  unit: 'each',
  unit_price: 6.29,
  dietary_tags: ['gluten-free'],
};

beforeEach(() => {
  jest.clearAllMocks();
  itemsModel.searchItems.mockResolvedValue({ items: [milk], total: 1 });
});

describe('GET /api/items', () => {
  it('returns matching items and the total', async () => {
    const res = await request(app).get('/api/items?store_id=2&q=milk').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [milk], total: 1 });
  });

  it('passes parsed filters to the model with defaults', async () => {
    await request(app).get('/api/items?store_id=2').set(auth());

    expect(itemsModel.searchItems).toHaveBeenCalledWith({
      storeId: 2,
      terms: [],
      category: undefined,
      tags: [],
      ids: [],
      limit: 20,
      offset: 0,
    });
  });

  it('splits the search text into words and trims it', async () => {
    await request(app).get('/api/items?store_id=2&q=%20greek%20%20yogurt%20').set(auth());

    expect(itemsModel.searchItems).toHaveBeenCalledWith(
      expect.objectContaining({ terms: ['greek', 'yogurt'] })
    );
  });

  it('accepts repeated and comma-separated tags, removing duplicates', async () => {
    await request(app)
      .get('/api/items?store_id=2&tag=vegan&tag=gluten-free,vegan')
      .set(auth());

    expect(itemsModel.searchItems).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['vegan', 'gluten-free'] })
    );
  });

  it('passes category, ids, limit and offset', async () => {
    await request(app)
      .get('/api/items?store_id=2&category=Dairy%20%26%20Eggs&ids=3,5,3&limit=50&offset=10')
      .set(auth());

    expect(itemsModel.searchItems).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Dairy & Eggs', ids: [3, 5], limit: 50, offset: 10 })
    );
  });

  it('requires a login token', async () => {
    const res = await request(app).get('/api/items?store_id=2');

    expect(res.status).toBe(401);
    expect(itemsModel.searchItems).not.toHaveBeenCalled();
  });

  it.each([
    ['missing store_id', '', 'store_id'],
    ['non-numeric store_id', 'store_id=abc', 'store_id'],
    ['zero store_id', 'store_id=0', 'store_id'],
    ['repeated store_id', 'store_id=1&store_id=2', 'store_id'],
    ['unknown category', 'store_id=2&category=Toys', 'category'],
    ['unknown tag', 'store_id=2&tag=keto', 'tag'],
    ['one bad tag among good ones', 'store_id=2&tag=vegan&tag=keto', 'keto'],
    ['q over 100 characters', `store_id=2&q=${'a'.repeat(101)}`, 'q must'],
    ['q with more than 8 words', 'store_id=2&q=a+b+c+d+e+f+g+h+i', 'q can have'],
    ['repeated q', 'store_id=2&q=a&q=b', 'q must'],
    ['limit 0', 'store_id=2&limit=0', 'limit'],
    ['limit above 50', 'store_id=2&limit=51', 'limit'],
    ['limit not a number', 'store_id=2&limit=ten', 'limit'],
    ['negative offset', 'store_id=2&offset=-1', 'offset'],
    ['bad ids', 'store_id=2&ids=1,x', 'ids'],
    ['too many ids', `store_id=2&ids=${Array.from({ length: 101 }, (_, i) => i + 1).join(',')}`, 'ids'],
  ])('rejects %s with 400', async (_label, query, expected) => {
    const res = await request(app).get(`/api/items?${query}`).set(auth());

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toContain(expected);
    expect(itemsModel.searchItems).not.toHaveBeenCalled();
  });

  it('returns 500 for an unexpected database error', async () => {
    itemsModel.searchItems.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).get('/api/items?store_id=2').set(auth());

    expect(res.status).toBe(500);
  });
});

describe('GET /api/items/filters', () => {
  it('lists the categories and dietary tags', async () => {
    const res = await request(app).get('/api/items/filters').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.categories).toContain('Produce');
    expect(res.body.dietary_tags).toEqual(expect.arrayContaining(['vegan', 'halal', 'organic']));
  });

  it('requires a login token', async () => {
    const res = await request(app).get('/api/items/filters');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/items/:id/alternatives', () => {
  it('returns the item and its other brands', async () => {
    const organic = { ...milk, item_id: 12, brand: 'Organic Meadow' };
    itemsModel.findItemById.mockResolvedValue(milk);
    itemsModel.findAlternatives.mockResolvedValue([organic]);

    const res = await request(app).get('/api/items/11/alternatives').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ item: milk, alternatives: [organic] });
    expect(itemsModel.findAlternatives).toHaveBeenCalledWith(milk);
  });

  it('returns an empty list when the product has one brand', async () => {
    itemsModel.findItemById.mockResolvedValue(milk);
    itemsModel.findAlternatives.mockResolvedValue([]);

    const res = await request(app).get('/api/items/11/alternatives').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.alternatives).toEqual([]);
  });

  it('returns 404 for an unknown or inactive item', async () => {
    itemsModel.findItemById.mockResolvedValue(undefined);

    const res = await request(app).get('/api/items/999/alternatives').set(auth());

    expect(res.status).toBe(404);
    expect(itemsModel.findAlternatives).not.toHaveBeenCalled();
  });

  it('returns 400 for a bad id', async () => {
    const res = await request(app).get('/api/items/abc/alternatives').set(auth());

    expect(res.status).toBe(400);
    expect(itemsModel.findItemById).not.toHaveBeenCalled();
  });

  it('requires a login token', async () => {
    const res = await request(app).get('/api/items/11/alternatives');

    expect(res.status).toBe(401);
  });
});
