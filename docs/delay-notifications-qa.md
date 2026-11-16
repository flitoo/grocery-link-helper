# Delay notifications, repeat orders and ratings QA

## Delivery delay rule

An order becomes overdue **15 minutes after the selected delivery time** (inclusive).
Eligible statuses: `Paid`, `Assigned`, `Shopping`, `Out_for_Delivery`.
Unpaid `Pending`, `Delivered` and `Cancelled` orders do not generate delay alerts.
Delivery times are stored as UTC wall-clock timestamps.

The backend checks on startup and every 60 seconds after the previous check
finishes. Reading notifications also checks that customer's orders, so it catches
up after downtime. Each scan processes up to 200 previously unnotified orders;
larger backlogs drain over subsequent scans. The database allows one
`DeliveryDelayed` notification per order, including across process restarts.
An existing delay alert stays in the customer's history after delivery or
cancellation. Read state is stored in the database.

These are in-app alerts on the Notifications screen, refreshed every 15 seconds
while the screen is open. The background worker requires a running backend.

## API

All endpoints require a bearer token and use its user ID, never an owner ID from
the request body or query string.

| Endpoint | Result |
| --- | --- |
| `GET /api/notifications` | `{ notifications: [...] }`, newest first |
| `PATCH /api/notifications/:id/read` | `{ notification: { notification_id, read_at } }` |
| `PATCH /api/notifications/read-all` | Marks the signed-in customer's alerts read |

Missing/invalid token: `401`. Invalid notification ID: `400`.
Nonexistent or another customer's notification: `404`.

## Automated checks

Run from `backend`:

```powershell
npm test -- --runInBand
npm run test:notifications:db
```

The database check uses the configured `DATABASE_URL` and `JWT_SECRET`. It creates
isolated fixtures in one transaction, scopes every scan to fixture customers,
and rolls all writes back. If the notification table is absent, the script tests
the new migration inside that transaction too; it does not install the migration
permanently. Apply `1794873600000_delivery-delay-notifications.sql` through the
project's migration process before starting the feature in a new environment.

| Area | Automated coverage |
| --- | --- |
| Delay boundary | No alert at 14:59.999; alert at 15:00 |
| Statuses | All four eligible statuses; Pending/Delivered/Cancelled excluded |
| Deduplication | Repeated scans and GET requests keep one alert per order |
| Timezone | Correct threshold when database session uses America/Toronto |
| History | Existing alert remains after delivery |
| API ownership | Customer isolation, unauthorized requests, read-all isolation |
| Read state | Persists across API reads; repeated mark-read is idempotent |
| Worker | Startup scan, interval, stop, slow scan, retry after failure |
| Catch-up | GET detects overdue orders without waiting for the worker |
| Repeat order | Same source store/items, address override, new Pending order, source unchanged, ownership, expired token, inactive store, full slot, changed availability, DST |
| Ratings | Score 1–5, invalid score/comment/ID, expired token, owner and Delivered eligibility, helper required, duplicate conflict, participant-only reads, safe error responses |

Repeat-order controller tests mock persistence. Notification and rating database
checks exercise real SQL and HTTP handlers. Concurrent multi-process execution
is protected by row locks and a unique constraint but is not stress-tested here.

Frontend checks, from `frontend`:

```powershell
npm run lint
npm run build
```

## Browser acceptance walkthrough

Use test accounts and orders in a development database.

1. Sign in as a customer and open **Notifications**.
2. With a paid active test order less than 15 minutes overdue, refresh: no
   **Delivery Delayed** alert for that order.
3. At least 15 minutes after the selected delivery time, refresh: one delay
   alert appears. **Track Order** opens that order's tracking screen.
4. Refresh repeatedly and restart the backend: the alert does not duplicate.
5. Choose **Mark as Read**, then reload: the delay alert remains read.
6. Generate another test alert, choose **Mark All as Read**, then reload: all
   delay alerts remain read.
7. Sign in as another customer: the first customer's alerts are not shown.
8. Complete or cancel a test order before the threshold: it never gets a delay
   alert. Complete an already delayed order: its previous alert remains history.

This walkthrough is a manual acceptance checklist; lint/build do not execute
browser interactions.
