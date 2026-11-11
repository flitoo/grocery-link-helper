jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
  withTransaction: jest.fn(),
}));

const { pool } = require('../src/config/db');
const itemsModel = require('../src/models/items.model');

beforeEach(() => {
  jest.resetAllMocks();
});

function mockSearchResults(rows = [], total = rows.length) {
  pool.query
    .mockResolvedValueOnce({ rows: [{ total }] })
    .mockResolvedValueOnce({ rows });
}

const base = { storeId: 2, terms: [], tags: [], ids: [], limit: 20, offset: 0 };

describe('itemsModel.escapeLike', () => {
  it.each([
    ['50%', '50\\%'],
    ['a_b', 'a\\_b'],
    ['back\\slash', 'back\\\\slash'],
    ['plain', 'plain'],
  ])('escapes %s', (input, expected) => {
    expect(itemsModel.escapeLike(input)).toBe(expected);
  });
});

describe('itemsModel.searchItems', () => {
  it('limits every search to one store\'s active items', async () => {
    mockSearchResults();

    await itemsModel.searchItems(base);

    const [countSql, countParams] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/store_id = \$1 AND is_active = TRUE/);
    expect(countParams).toEqual([2]);
  });

  it('returns the page rows and the unpaged total', async () => {
    const rows = [{ item_id: 1 }];
    mockSearchResults(rows, 37);

    await expect(itemsModel.searchItems(base)).resolves.toEqual({ items: rows, total: 37 });
  });

  it('passes limit and offset after the filter params', async () => {
    mockSearchResults();

    await itemsModel.searchItems({ ...base, limit: 5, offset: 10 });

    const [pageSql, pageParams] = pool.query.mock.calls[1];
    expect(pageSql).toMatch(/LIMIT \$2 OFFSET \$3/);
    expect(pageParams).toEqual([2, 5, 10]);
  });

  it('matches each search word against name or brand, escaping wildcards', async () => {
    mockSearchResults();

    await itemsModel.searchItems({ ...base, terms: ['milk', '50%'] });

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual([2, '%milk%', '%50\\%%']);
    expect(sql).toContain("(name ILIKE $2 ESCAPE '\\' OR brand ILIKE $2 ESCAPE '\\')");
    expect(sql).toContain("(name ILIKE $3 ESCAPE '\\' OR brand ILIKE $3 ESCAPE '\\')");
  });

  it('never puts user text into the SQL string', async () => {
    mockSearchResults();

    await itemsModel.searchItems({
      ...base,
      terms: ["x'; DROP TABLE items; --"],
      category: "Pantry' OR '1'='1",
    });

    const [sql] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/DROP TABLE|OR '1'/);
  });

  it('requires every dietary tag with array containment', async () => {
    mockSearchResults();

    await itemsModel.searchItems({ ...base, tags: ['vegan', 'gluten-free'] });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('dietary_tags @> $2::text[]');
    expect(params).toEqual([2, ['vegan', 'gluten-free']]);
  });

  it('filters by category and by ids together', async () => {
    mockSearchResults();

    await itemsModel.searchItems({ ...base, category: 'Dairy & Eggs', ids: [3, 5] });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('category = $2');
    expect(sql).toContain('item_id = ANY($3::int[])');
    expect(params).toEqual([2, 'Dairy & Eggs', [3, 5]]);
  });

  it('returns prices as numbers, not strings', async () => {
    mockSearchResults();

    await itemsModel.searchItems(base);

    expect(pool.query.mock.calls[1][0]).toContain('unit_price::float8 AS unit_price');
  });
});

describe('itemsModel.findItemById / findAlternatives', () => {
  it('finds only active items by id', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ item_id: 9 }] });

    await expect(itemsModel.findItemById(9)).resolves.toEqual({ item_id: 9 });

    expect(pool.query.mock.calls[0][0]).toContain('is_active = TRUE');
  });

  it('looks for same-name items in the same store, excluding the item itself', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await itemsModel.findAlternatives({ item_id: 9, store_id: 2, name: '2% Milk, 4 L' });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('lower(name) = lower($2)');
    expect(sql).toContain('item_id <> $3');
    expect(params).toEqual([2, '2% Milk, 4 L', 9]);
  });
});
