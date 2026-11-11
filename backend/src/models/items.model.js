const { pool } = require('../config/db');

const ITEM_COLUMNS = `item_id, store_id, name, brand, category, unit,
  unit_price::float8 AS unit_price, dietary_tags`;

/** Escapes LIKE wildcards so user text such as "50%" or "a_b" matches literally. */
function escapeLike(text) {
  return text.replace(/[\\%_]/g, '\\$&');
}

/**
 * Builds the WHERE clause for an item search. Every search is limited to one
 * store's active items. Each search word must appear in the name or brand;
 * every requested dietary tag must be on the item.
 */
function buildWhere({ storeId, terms = [], category, tags = [], ids = [] }) {
  const params = [storeId];
  const where = ['store_id = $1', 'is_active = TRUE'];

  for (const term of terms) {
    params.push(`%${escapeLike(term)}%`);
    const n = params.length;
    where.push(`(name ILIKE $${n} ESCAPE '\\' OR brand ILIKE $${n} ESCAPE '\\')`);
  }
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (tags.length > 0) {
    params.push(tags);
    where.push(`dietary_tags @> $${params.length}::text[]`);
  }
  if (ids.length > 0) {
    params.push(ids);
    where.push(`item_id = ANY($${params.length}::int[])`);
  }
  return { whereSql: where.join(' AND '), params };
}

/**
 * Searches a store's active items. Returns { items, total } where total is the
 * number of matches ignoring limit/offset, for paging.
 */
async function searchItems({ limit, offset, ...filters }) {
  const { whereSql, params } = buildWhere(filters);

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM items WHERE ${whereSql}`,
    params
  );
  const pageResult = await pool.query(
    `SELECT ${ITEM_COLUMNS}
     FROM items
     WHERE ${whereSql}
     ORDER BY name, brand, item_id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { items: pageResult.rows, total: countResult.rows[0].total };
}

/** One active item by id, or undefined. */
async function findItemById(itemId) {
  const result = await pool.query(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE item_id = $1 AND is_active = TRUE`,
    [itemId]
  );
  return result.rows[0];
}

/**
 * Other brands of the same product at the same store (same name, different
 * item), for swapping the brand on a grocery list line.
 */
async function findAlternatives(item) {
  const result = await pool.query(
    `SELECT ${ITEM_COLUMNS}
     FROM items
     WHERE store_id = $1
       AND lower(name) = lower($2)
       AND item_id <> $3
       AND is_active = TRUE
     ORDER BY brand, item_id`,
    [item.store_id, item.name, item.item_id]
  );
  return result.rows;
}

module.exports = { searchItems, findItemById, findAlternatives, escapeLike };
