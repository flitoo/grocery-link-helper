# Tasks 8–13

## Implemented

8. Collections: customer-owned collections and items, database migration,
   name/category/description, brand/quantity/unit/price/dietary options,
   validation, CRUD endpoints and ownership checks.
9. Collections screen at `/collections`: create/edit/delete collections,
   add/remove items and reuse a saved collection as the grocery list.
   Replacing a draft requires confirmation. Checkout requires whole quantities
   and an estimated price; fractional quantities can still be saved.
10. Helper API: authenticated Helper-only `GET /api/helpers/stats` and
    `GET /api/helpers/history?page=1&limit=10`. Statistics show active,
    delivered and cancelled orders plus average rating and rating count.
    No ratings returns `null`, not a misleading zero-star score.
11. Helper Dashboard: real statistics, active and available orders,
    paginated completed/cancelled history, completion dates and ratings.
12. UI consistency: shared navigation/header/logout, green branding,
    responsive layouts, accessible focus indicators and readable light theme.
13. Frontend cleanup: shared API base/request helper, reusable header,
    state reset through keyed order screens, fixed hook warnings and removed
    unused logout code and starter global styling. Customer order history now
    loads from the API, and submitted delivery ratings persist in PostgreSQL
    so helper averages include feedback from the app.

Orders routes also require authentication. Order creation uses the token's
customer ID. Details are available to the customer, assigned helper, or a
Helper inspecting a paid unclaimed order before claiming it.

## Run locally

Keep the backend's existing `npm run dev` terminal running. In a separate
terminal, start the frontend with `cd frontend` then `npm run dev`.
Log in as a Customer and open Collections from navigation. Log in as a Helper
to see statistics and delivery history.

For a database without the Collections tables, run `npm run migrate:up`
from `backend`. The migration adds the two tables and owner/item indexes.
It does not replace existing rows. Apply migrations to development first.

## Verification

From `backend`: `npm test -- --runInBand` runs automated API tests.
`npm run test:features:db` checks real PostgreSQL CRUD, ownership, statistics
and pagination using an isolated transaction, then rolls back its fixtures.
It requires the normal DATABASE_URL and JWT_SECRET configuration and never
prints either value.

From `frontend`: `npm run lint` and `npm run build`.

Manual checks: create a collection, add items, reload, edit its name, reuse it
as a grocery list, then remove the test collection. Check a Helper account
with completed deliveries and use Previous/Next to navigate history.

The Collections layout and Helper login-required state were inspected in the
local browser. Authenticated flows were verified through the API against real
PostgreSQL; a browser walkthrough using the user's account remains a manual check.
