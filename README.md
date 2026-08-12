# Grocery Link Helper — Vertical Slice

A community grocery delivery platform for Toronto students and busy residents.
This repo is a **thin vertical slice**: it proves the React UI, the Express API, and
PostgreSQL are connected end to end. A customer fills out an order form, the order is
saved to Postgres with status `Pending`, and a confirmation screen shows the saved order.

```
frontend/   React (Vite)      -> http://localhost:3000
backend/    Express REST API  -> http://localhost:8080
database/   SQL schema + seed data
```

## Prerequisites

- Node.js 18+
- PostgreSQL running locally

## 1. Create and load the database

```bash
createdb grocery_link
psql -d grocery_link -f database/schema.sql
psql -d grocery_link -f database/seed.sql
```

On Windows, `createdb` / `psql` live in e.g.
`C:\Program Files\PostgreSQL\16\bin` — add that to your PATH or call them with the full path.
You may also need `-U postgres` and to enter your password.

`schema.sql` drops and recreates the five tables (USERS, STORES, ORDERS, ORDER_ITEMS,
PAYMENTS), so it is safe to re-run before a demo. `seed.sql` adds the 3 stores
(Walmart, Costco, T&T Supermarket) and one demo customer.

## 2. Configure environment variables

```bash
cp .env.example backend/.env
```

Then edit `backend/.env` with your Postgres password. Either set `DATABASE_URL` or the
discrete `PGUSER` / `PGPASSWORD` / `PGDATABASE` variables — `DATABASE_URL` wins when both
are present.

The frontend defaults to `http://localhost:8080`. To point it elsewhere, create
`frontend/.env` with `VITE_API_URL=...`.

## 3. Run the backend

```bash
cd backend
npm install
npm start
# Grocery Link Helper API listening on http://localhost:8080
```

Quick check: <http://localhost:8080/api/stores> should return the three seeded stores.

## 4. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
# open http://localhost:3000
```

## API

### `GET /api/stores`
Returns every row in STORES — used to populate the store dropdown.

```json
[{ "store_id": 1, "name": "Walmart" }]
```

### `POST /api/orders`
Creates one ORDERS row with status `Pending` plus one ORDER_ITEMS row per item, inside a
single transaction (it rolls back if any insert fails).

Request:

```json
{
  "customer_id": 1,
  "store_id": 1,
  "delivery_slot": "2026-08-12T18:00:00",
  "items": [{ "item_name": "Milk 2L", "quantity": 2 }]
}
```

Response `201`:

```json
{
  "order_id": 1,
  "customer_id": 1,
  "helper_id": null,
  "store_id": 1,
  "status": "Pending",
  "delivery_slot": "2026-08-12T18:00:00.000Z",
  "store_name": "Walmart",
  "items": [{ "item_id": 1, "order_id": 1, "item_name": "Milk 2L", "quantity": 2 }]
}
```

Invalid payloads return `400` with an `error` message.

## Verifying the demo

After submitting the form, confirm the data landed:

```sql
SELECT * FROM orders;
SELECT * FROM order_items WHERE order_id = 1;
```

## Scope notes

- **No login.** The frontend posts with the seeded customer's id (`1`), set as
  `DEMO_CUSTOMER_ID` in `frontend/src/components/OrderForm.jsx`. Authentication is out of
  scope for this slice.
- **MongoDB is not used yet.** `order_chats` and `user_templates` are planned for a later
  iteration.
- **PAYMENTS** exists in the schema but no payment flow is wired up.
