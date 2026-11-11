
const { pool } = require("../config/db");

// Get all collections belonging to the logged-in customer
async function getCollections(customerId) {
  const result = await pool.query(
    `
    SELECT
      c.*,
      (
        SELECT COUNT(*)::INTEGER
        FROM grocery_collection_items i
        WHERE i.collection_id = c.collection_id
      ) AS item_count
    FROM grocery_collections c
    WHERE c.customer_id = $1
    ORDER BY c.created_at DESC, c.collection_id DESC
    `,
    [customerId]
  );

  return result.rows;
}

// Get one collection
async function getCollection(collectionId, customerId) {
  const result = await pool.query(
    `
    SELECT *
    FROM grocery_collections
    WHERE collection_id = $1
      AND customer_id = $2
    `,
    [collectionId, customerId]
  );

  return result.rows[0] || null;
}

// Get items inside a collection
async function getCollectionItems(collectionId) {
  const result = await pool.query(
    `
    SELECT *
    FROM grocery_collection_items
    WHERE collection_id = $1
    ORDER BY collection_item_id ASC
    `,
    [collectionId]
  );

  return result.rows;
}

// Create collection
async function createCollection(customerId, data) {
  const { name, description, category } = data;

  const result = await pool.query(
    `
    INSERT INTO grocery_collections
      (customer_id, name, description, category)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [customerId, name, description, category]
  );

  return result.rows[0];
}

// Update collection
async function updateCollection(collectionId, customerId, data) {
  const { name, description, category } = data;

  const result = await pool.query(
    `
    UPDATE grocery_collections
    SET
      name = $3,
      description = $4,
      category = $5
    WHERE collection_id = $1
      AND customer_id = $2
    RETURNING *
    `,
    [collectionId, customerId, name, description, category]
  );

  return result.rows[0] || null;
}

// Delete collection
async function deleteCollection(collectionId, customerId) {
  const result = await pool.query(
    `
    DELETE FROM grocery_collections
    WHERE collection_id = $1
      AND customer_id = $2
    RETURNING collection_id
    `,
    [collectionId, customerId]
  );

  return result.rows[0] || null;
}

// Add item only if the customer owns the collection
async function addCollectionItem(collectionId, customerId, data) {
  const {
    item_name,
    brand,
    quantity,
    unit,
    estimated_unit_price,
    dietary_options,
  } = data;

  const result = await pool.query(
    `
    INSERT INTO grocery_collection_items
      (
        collection_id,
        item_name,
        brand,
        quantity,
        unit,
        estimated_unit_price,
        dietary_options
      )
    SELECT
      c.collection_id,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8::TEXT[]
    FROM grocery_collections c
    WHERE c.collection_id = $1
      AND c.customer_id = $2
    RETURNING *
    `,
    [
      collectionId,
      customerId,
      item_name,
      brand,
      quantity,
      unit,
      estimated_unit_price,
      dietary_options,
    ]
  );

  return result.rows[0] || null;
}

// Delete item only if the customer owns its collection
async function deleteCollectionItem(
  collectionId,
  customerId,
  itemId
) {
  const result = await pool.query(
    `
    DELETE FROM grocery_collection_items i
    USING grocery_collections c
    WHERE i.collection_id = c.collection_id
      AND i.collection_id = $1
      AND c.customer_id = $2
      AND i.collection_item_id = $3
    RETURNING i.collection_item_id
    `,
    [collectionId, customerId, itemId]
  );

  return result.rows[0] || null;
}

module.exports = {
  getCollections,
  getCollection,
  getCollectionItems,
  createCollection,
  updateCollection,
  deleteCollection,
  addCollectionItem,
  deleteCollectionItem,
};
