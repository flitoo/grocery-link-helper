-- Up Migration

CREATE TABLE IF NOT EXISTS substitution_requests (
    substitution_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id              INTEGER NOT NULL,
    original_item_id      INTEGER NOT NULL,
    suggested_item_name   VARCHAR(150) NOT NULL,
    price_difference      NUMERIC(10, 2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_substitution_requests_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_substitution_requests_item
        FOREIGN KEY (original_item_id) REFERENCES order_items(item_id) ON DELETE CASCADE,
    CONSTRAINT chk_substitution_requests_status
        CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

CREATE TABLE IF NOT EXISTS ratings (
    rating_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      INTEGER NOT NULL UNIQUE,
    customer_id   INTEGER NOT NULL,
    helper_id     INTEGER NOT NULL,
    score         INTEGER NOT NULL,
    comments      TEXT,
    CONSTRAINT fk_ratings_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_ratings_customer
        FOREIGN KEY (customer_id) REFERENCES users(user_id),
    CONSTRAINT fk_ratings_helper
        FOREIGN KEY (helper_id) REFERENCES users(user_id),
    CONSTRAINT chk_ratings_score
        CHECK (score BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_substitution_requests_order_id
    ON substitution_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_original_item_id
    ON substitution_requests(original_item_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer_id
    ON ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_helper_id
    ON ratings(helper_id);

-- Down Migration

-- These tables are also part of the pre-migration baseline schema, so leave
-- them intact when rolling back this compatibility migration.
SELECT 1;
