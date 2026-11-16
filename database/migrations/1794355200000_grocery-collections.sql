-- Up Migration
CREATE TABLE IF NOT EXISTS grocery_collections (
  collection_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(60),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS grocery_collection_items (
  collection_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES grocery_collections(collection_id) ON DELETE CASCADE,
  item_name VARCHAR(150) NOT NULL CHECK (length(trim(item_name)) > 0),
  brand VARCHAR(100),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs' CHECK (length(trim(unit)) > 0),
  estimated_unit_price NUMERIC(10,2) CHECK (estimated_unit_price >= 0),
  dietary_options TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_collections_customer ON grocery_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON grocery_collection_items(collection_id);

-- Down Migration
-- Some installations already had these tables before migrations tracked them.
-- Preserve saved collections when rolling back this compatibility migration.
SELECT 1;
