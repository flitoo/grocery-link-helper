-- Grocery Link Helper - PostgreSQL schema
-- Re-runnable: drops existing tables before recreating them.

DROP TABLE IF EXISTS PAYMENTS CASCADE;
DROP TABLE IF EXISTS ORDER_ITEMS CASCADE;
DROP TABLE IF EXISTS ORDERS CASCADE;
DROP TABLE IF EXISTS STORES CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

CREATE TABLE USERS (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number  VARCHAR(15),
    role          VARCHAR(20) NOT NULL
                  CHECK (role IN ('Customer', 'Helper', 'Admin'))
);

CREATE TABLE STORES (
    store_id SERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL
);

CREATE TABLE ORDERS (
    order_id      SERIAL PRIMARY KEY,
    customer_id   INT REFERENCES USERS(user_id),
    helper_id     INT REFERENCES USERS(user_id),
    store_id      INT REFERENCES STORES(store_id),
    status        VARCHAR(30) NOT NULL
                  CHECK (status IN ('Pending', 'Paid', 'Assigned', 'Shopping',
                                    'Out_for_Delivery', 'Delivered', 'Cancelled')),
    delivery_slot TIMESTAMP NOT NULL
);

CREATE TABLE ORDER_ITEMS (
    item_id   SERIAL PRIMARY KEY,
    order_id  INT REFERENCES ORDERS(order_id),
    item_name VARCHAR(255) NOT NULL,
    quantity  INT NOT NULL
);

CREATE TABLE PAYMENTS (
    payment_id            SERIAL PRIMARY KEY,
    order_id              INT UNIQUE REFERENCES ORDERS(order_id),
    transaction_reference VARCHAR(100),
    amount                DECIMAL(10,2),
    payment_status        VARCHAR(20) DEFAULT 'Pending'
                          CHECK (payment_status IN ('Pending', 'Verified', 'Rejected'))
);
