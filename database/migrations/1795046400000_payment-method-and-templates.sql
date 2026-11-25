-- Up Migration

-- Compatibility migration. The API already reads and writes
-- payments.payment_method and the grocery_templates table, but neither was
-- ever created by a tracked migration (the baseline migration is empty), so a
-- database built only from migrations returned 500 on POST /api/payments and
-- /api/templates. Every statement is idempotent so databases that already have
-- these objects are left untouched.

-- Validated by the API (credit | debit). Nullable because payments created
-- before this column existed have no method recorded.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

CREATE TABLE IF NOT EXISTS grocery_templates (
  template_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grocery_templates_customer ON grocery_templates(customer_id);

-- Down Migration
-- Some installations already had these objects before migrations tracked
-- them. Keep payment methods and saved templates when rolling this back.
SELECT 1;
