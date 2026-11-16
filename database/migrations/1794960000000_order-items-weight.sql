-- Up Migration

-- Weight-based order lines. A line can now be priced per `unit` (each, lb or
-- kg) with a decimal quantity such as 1.5 lb, and can point at the catalog
-- item it was picked from.
--
-- order_items.item_id is already this table's primary key (it is also what
-- substitution_requests.original_item_id references), so the link to the
-- catalog is named catalog_item_id. estimated_price keeps its meaning: the
-- price of ONE unit, so a line costs quantity * estimated_price.

ALTER TABLE order_items
    ADD COLUMN catalog_item_id INTEGER,
    ADD COLUMN unit VARCHAR(4) NOT NULL DEFAULT 'each';

ALTER TABLE order_items
    ALTER COLUMN quantity TYPE NUMERIC(10, 3) USING quantity::NUMERIC(10, 3);

ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_catalog_item
        FOREIGN KEY (catalog_item_id) REFERENCES items(item_id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_order_items_unit
        CHECK (unit IN ('each', 'lb', 'kg')),
    -- Things sold per item can't be split; only lb and kg allow decimals.
    ADD CONSTRAINT chk_order_items_whole_each
        CHECK (unit <> 'each' OR quantity = trunc(quantity));

CREATE INDEX idx_order_items_catalog_item_id ON order_items(catalog_item_id);

-- Down Migration

-- Lossy: decimal quantities are rounded UP to the next whole number, and the
-- catalog link and unit are dropped.

DROP INDEX idx_order_items_catalog_item_id;

ALTER TABLE order_items
    DROP CONSTRAINT chk_order_items_whole_each,
    DROP CONSTRAINT chk_order_items_unit,
    DROP CONSTRAINT fk_order_items_catalog_item;

ALTER TABLE order_items
    ALTER COLUMN quantity TYPE INTEGER USING CEIL(quantity)::INTEGER;

ALTER TABLE order_items
    DROP COLUMN unit,
    DROP COLUMN catalog_item_id;
