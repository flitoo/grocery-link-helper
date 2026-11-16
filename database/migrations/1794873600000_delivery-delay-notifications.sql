-- Up Migration
CREATE TABLE delivery_notifications (
  notification_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL CHECK (kind = 'DeliveryDelayed'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMPTZ,
  UNIQUE (order_id, kind)
);
CREATE INDEX idx_delivery_notifications_customer
  ON delivery_notifications(customer_id, created_at DESC);

-- Down Migration
DROP TABLE delivery_notifications;
