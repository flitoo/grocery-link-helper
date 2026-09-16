-- Grocery delivery project database schema
-- PostgreSQL 18+
-- Run this script while connected to the grocery_db database.

BEGIN;

-- SET LOCAL ROLE grocery_app; # for local setup only

CREATE TABLE users (
    user_id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(15) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
        CHECK (role IN ('Customer', 'Helper', 'Admin'))
);

CREATE TABLE stores (
    store_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_name      VARCHAR(100) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE orders (
    order_id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id       INTEGER NOT NULL,
    helper_id         INTEGER,
    store_id          INTEGER NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'Pending',
    delivery_slot     TIMESTAMP NOT NULL,
    delivery_address  VARCHAR(255) NOT NULL,
    total_amount      NUMERIC(10, 2) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_orders_helper
        FOREIGN KEY (helper_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_orders_store
        FOREIGN KEY (store_id)
        REFERENCES stores(store_id),

    CONSTRAINT chk_orders_status
        CHECK (status IN (
            'Pending',
            'Paid',
            'Assigned',
            'Shopping',
            'Out_for_Delivery',
            'Delivered',
            'Cancelled'
        )),

    CONSTRAINT chk_orders_total_amount
        CHECK (total_amount > 0.00)
);

CREATE TABLE order_items (
    item_id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id            INTEGER NOT NULL,
    item_name           VARCHAR(150) NOT NULL,
    quantity            INTEGER NOT NULL,
    estimated_price     NUMERIC(10, 2) NOT NULL,
    allow_substitution  BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_order_items_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_items_estimated_price
        CHECK (estimated_price >= 0.00)
);

CREATE TABLE payments (
    payment_id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id         INTEGER NOT NULL UNIQUE,
    transaction_ref  VARCHAR(100) NOT NULL UNIQUE,
    amount           NUMERIC(10, 2) NOT NULL,
    payment_status   VARCHAR(20) NOT NULL DEFAULT 'Pending',
    verified_at      TIMESTAMP,

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_payments_amount
        CHECK (amount > 0.00),

    CONSTRAINT chk_payments_status
        CHECK (payment_status IN ('Pending', 'Verified', 'Rejected'))
);

CREATE TABLE deliveries (
    delivery_id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id           INTEGER NOT NULL UNIQUE,
    helper_id          INTEGER NOT NULL,
    delivery_status    VARCHAR(30) NOT NULL,
    photo_proof_url    VARCHAR(500),
    completed_at       TIMESTAMP,

    CONSTRAINT fk_deliveries_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_deliveries_helper
        FOREIGN KEY (helper_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_deliveries_status
        CHECK (delivery_status IN ('In_Transit', 'Arrived', 'Completed'))
);

CREATE TABLE substitution_requests (
    substitution_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id              INTEGER NOT NULL,
    original_item_id      INTEGER NOT NULL,
    suggested_item_name   VARCHAR(150) NOT NULL,
    price_difference      NUMERIC(10, 2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_substitution_requests_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_substitution_requests_item
        FOREIGN KEY (original_item_id)
        REFERENCES order_items(item_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_substitution_requests_status
        CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

CREATE TABLE order_messages (
    message_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       INTEGER NOT NULL,
    sender_id      INTEGER NOT NULL,
    message_text   TEXT NOT NULL,
    sent_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_messages_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_order_messages_text
        CHECK (length(trim(message_text)) > 0)
);

CREATE TABLE ratings (
    rating_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      INTEGER NOT NULL UNIQUE,
    customer_id   INTEGER NOT NULL,
    helper_id     INTEGER NOT NULL,
    score         INTEGER NOT NULL,
    comments      TEXT,

    CONSTRAINT fk_ratings_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ratings_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_ratings_helper
        FOREIGN KEY (helper_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_ratings_score
        CHECK (score BETWEEN 1 AND 5)
);

CREATE TABLE saved_order_templates (
    template_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id    INTEGER NOT NULL,
    template_name  VARCHAR(100) NOT NULL,
    items_json     JSONB NOT NULL,

    CONSTRAINT fk_saved_order_templates_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_saved_order_templates_customer_name
        UNIQUE (customer_id, template_name),

    CONSTRAINT chk_saved_order_templates_items_array
        CHECK (jsonb_typeof(items_json) = 'array')
);

-- PostgreSQL automatically indexes primary keys and UNIQUE constraints.
-- These additional indexes support foreign-key joins and common searches.
CREATE INDEX idx_orders_customer_id
    ON orders(customer_id);

CREATE INDEX idx_orders_helper_id
    ON orders(helper_id);

CREATE INDEX idx_orders_store_id
    ON orders(store_id);

CREATE INDEX idx_orders_status
    ON orders(status);

CREATE INDEX idx_orders_delivery_slot
    ON orders(delivery_slot);

CREATE INDEX idx_order_items_order_id
    ON order_items(order_id);

CREATE INDEX idx_deliveries_helper_id
    ON deliveries(helper_id);

CREATE INDEX idx_substitution_requests_order_id
    ON substitution_requests(order_id);

CREATE INDEX idx_substitution_requests_original_item_id
    ON substitution_requests(original_item_id);

CREATE INDEX idx_order_messages_order_id_sent_at
    ON order_messages(order_id, sent_at);

CREATE INDEX idx_order_messages_sender_id
    ON order_messages(sender_id);

CREATE INDEX idx_ratings_customer_id
    ON ratings(customer_id);

CREATE INDEX idx_ratings_helper_id
    ON ratings(helper_id);

CREATE INDEX idx_saved_order_templates_customer_id
    ON saved_order_templates(customer_id);

COMMIT;

