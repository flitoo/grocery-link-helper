# Grocery Link Helper
Grocery Link Helper is a web-based platform that connects customers with local fulfillment helpers. Customers submit store-specific grocery orders, confirm payment upfront, and track delivery status until the order arrives.

## Directory Structure
- `/frontend`: React web application
- `/backend`: Express API backend
- `/database/migrations`: PostgreSQL DDL scripts and migrations
- `/docs`: System Design Specification (SDS) artifacts and documentation

## Branching Strategy
- `main`: Locked release branch (production-ready)
- `develop`: Primary integration branch
- `feature/us-XX-short-description`: Feature branches for user stories
- `bugfix/issue-description`: Bug resolution branches

## Quick Start
### Prerequisites
- Node.js 22+ and npm
- A PostgreSQL database (local, or a Neon branch). Ask the DB owner for a dev connection string. Do not point local work at the production database.

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend
```bash
cd backend
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```
Edit `backend/.env`:
```
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/grocery_link_helper
JWT_SECRET=replace_with_a_long_random_secret
```
`.env` is git-ignored. Never commit it.

### 3. Set up the database
From `backend/`, apply the migrations in `database/migrations`:
```bash
npm run migrate:up
```
Note: pushing changes under `database/migrations` to `main` automatically runs them against production (Neon). Test migrations on a Neon branch first.

### 4. Run the app
Use two terminals.

**Backend** (http://localhost:8080):
```bash
cd backend
npm run dev     # nodemon; use `npm start` for plain node
```
Check it at http://localhost:8080/health.

**Frontend** (http://localhost:5173):
```bash
cd frontend
npm run dev
```
The frontend calls the API at `http://localhost:8080` by default. To change it, set `VITE_API_URL` in `frontend/.env`.

### 5. Try the login feature
Open http://localhost:5173, register an account, then log in. Auth endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`

### Which endpoints need a login
Send `Authorization: Bearer <token>` (from register/login). Missing or invalid
tokens get `401`.

| Endpoint | Who can call it |
| --- | --- |
| `POST /api/orders` | Customers only (`403` for helpers). The customer is the logged-in user; a `customer_id` in the body is optional and must match, otherwise `403`. |
| `GET /api/orders/{id}` | The order's customer, its assigned helper, or any helper while the order is Paid and unclaimed. Anyone else gets `404`. |
| `POST /api/payments`, `POST /api/payments/{orderId}/confirm-demo` | Only the customer who placed the order (`403` otherwise). |
| `GET /api/payments/{orderId}` | The order's customer or assigned helper; anyone else gets `404`. |

### Demo setup
The payment screen confirms payments through a development-only endpoint, and
helper accounts can't self-register by default. For a local demo, add both
flags to `backend/.env` (they are ignored when `NODE_ENV=production`):

```
ENABLE_DEMO_PAYMENTS=true
ENABLE_DEMO_HELPER_REGISTRATION=true
```

### Delivery assignment and order messaging
Helpers see their work on the helper dashboard, which loads two lists with the
helper's token (both return `{ orders: [...] }`, `401` without a token, `403`
for non-helpers):

```http
GET /api/orders/assigned    # the helper's active order
GET /api/orders/available   # paid orders no helper has claimed yet
Authorization: Bearer <token>
```

Delivery helpers can claim paid, unassigned orders with their login token:

```http
POST /api/deliveries/{orderId}/claim
Authorization: Bearer <token>
```

The claim is atomic. A successful claim creates the delivery and sets the
order's helper and status to `Assigned`. Only users with the `Helper` role can
claim an order. A helper can hold only one active order (status `Assigned`,
`Shopping` or `Out_for_Delivery`) at a time; claiming another returns `409`
until the current one is `Delivered` or `Cancelled`.

The assigned helper advances an order one step at a time:

```http
PATCH /api/orders/{orderId}/status
Authorization: Bearer <token>
Content-Type: application/json
```

Send `{"status":"Shopping"}`, then `"Out_for_Delivery"`, then `"Delivered"`.
Responses: `200` with `{order_id, helper_id, status}`, `400` for an invalid id
or status, `401` without a valid token, `403` if the caller is not the order's
helper, `404` if the order does not exist, and `409` for a skipped or repeated
step. Setting `Delivered` also marks the delivery `Completed`, which frees the
helper to claim another order.

### Ratings and substitution requests

After an order is delivered, its customer can submit one 1-to-5 rating:

```http
POST /api/ratings/orders/{orderId}
Authorization: Bearer <token>
Content-Type: application/json

{ "score": 5, "comments": "Great delivery." }
```

The customer or assigned helper can read the rating with
`GET /api/ratings/orders/{orderId}`. A second rating for the same order returns
`409`.

While shopping, the assigned helper can suggest a substitute for an order item
whose `allow_substitution` value is true:

```http
POST /api/substitution-requests/orders/{orderId}
Authorization: Bearer <token>
Content-Type: application/json

{ "original_item_id": 12, "suggested_item_name": "Oat milk", "price_difference": 0.50 }
```

Either order participant can list requests with
`GET /api/substitution-requests/orders/{orderId}`. The customer can approve or
reject a pending request with
`PATCH /api/substitution-requests/orders/{orderId}/{substitutionId}` and
`{"status":"Approved"}` or `{"status":"Rejected"}`.

Customers and assigned helpers can read and send messages for their order:

```http
GET  /api/orders/{orderId}/messages
POST /api/orders/{orderId}/messages
Authorization: Bearer <token>
Content-Type: application/json
```

Send a message with `{"message_text":"Buzz 1204, please."}`. The API derives
the sender from the token and allows access only to the customer or assigned
helper for that order.

### Repeat order (US-06)
A customer can repeat one of their previous orders. The new order keeps the
same store, items and address; only the delivery slot (and optionally the
address) changes. Both endpoints need the customer's token, and only the
customer who placed the original order can use them (`403` otherwise).

Check a slot before checkout:

```http
GET /api/orders/{orderId}/repeat/availability?delivery_slot=2026-11-08T23:00:00.000Z
Authorization: Bearer <token>
```

`delivery_slot` is optional. Without it, the API checks the next slot on the
same weekday and local time as the original order ("same time as last week",
which keeps the local time across daylight-saving changes). The response is
always `200` for a valid request:

```json
{
  "source_order_id": 42, "store_id": 3, "store_active": true,
  "requested_slot": "2026-11-08T23:00:00.000Z",
  "recurring_slot": "2026-11-08T23:00:00.000Z",
  "capacity": 2, "available": false, "reason": "SLOT_FULL",
  "message": "That delivery slot is full. Please choose another.",
  "remaining": 0,
  "alternatives": [{ "start": "...", "date": "2026-11-08", "booked": 0, "remaining": 2, "available": true }]
}
```

`reason` is `null` when the slot is available. Otherwise it is one of
`SLOT_FULL`, `SLOT_NOT_BOOKABLE` (outside hours, not on the hour, inside the
2-hour lead time or beyond 7 days), `NO_SLOT_SELECTED` (no slot given and the
original time isn't bookable this week), or `STORE_INACTIVE`. When the slot
isn't available, `alternatives` lists up to 3 open slots nearest the one you
asked for. An unparseable `delivery_slot` returns `400`.

Place the repeat order:

```http
POST /api/orders/{orderId}/repeat
Authorization: Bearer <token>
Content-Type: application/json

{ "delivery_slot": "2026-11-08T23:00:00.000Z", "delivery_address": "55 Bloor St" }
```

`delivery_address` is optional. Responses: `201` with the new order plus
`repeated_from`; `400` with `alternatives` for a slot that isn't bookable;
`409` with `alternatives` if the slot filled up since the check (capacity is
enforced inside the order transaction, so the check alone does not reserve
it); `409` if the store is no longer active; `404` if the order does not exist.

### Tests and lint
```bash
cd backend && npm test
cd frontend && npm run lint
```
