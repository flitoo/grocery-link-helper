# QA: substitution and tracking

Verified on 2026-11-16. Backend: **356 tests passed** (full Jest suite).
Frontend: **31 tests passed** (Vitest/React Testing Library), ESLint and production
build passed. The PostgreSQL/API integration script passed with all fixtures
rolled back.

## Coverage

| Scenario | Expected result | Verification |
| --- | --- | --- |
| Unauthenticated/expired session | 401, no read or write | API unit tests; database check for missing login |
| Customer/helper ownership | Other accounts cannot view or modify the order's requests | Real SQL/API |
| Helper claims paid order | Assigned appears in customer tracking | Real SQL/API |
| Advance order | Assigned → Shopping → Out for Delivery → Delivered | Real SQL/API; rendered progress for every status |
| Invalid transition or wrong helper | 409 for skipped/repeated steps; 403 for a different actor | Real SQL/API |
| Suggest replacement | Assigned helper, Shopping, same-order item, substitutions allowed | Real SQL/API; helper component tests |
| Request input | Valid name, signed price difference with at most two decimals; reject malformed IDs/types | API unit tests |
| Duplicate active proposal | 409 if the item already has a Pending or Approved request | Real SQL/API; frontend hides ineligible item |
| Customer approval/rejection | Owner chooses once; helper sees the saved decision | Real SQL/API; click-and-refresh component tests |
| Rejected suggestion | Helper can propose another replacement | Real SQL/API and component test |
| Delivered/Cancelled | No new decisions or misleading pending-review prompt; no status reversal | Real SQL/API and component tests |
| Delivery completion | Delivery row marked Completed with completed_at | Real SQL/API |
| Tracking details | Toronto delivery time, address, helper, items, review/chat/rating links | Real SQL/API and component tests |
| Polling | Refresh after 15 seconds; no overlapping slow polls; abort on unmount | Hook tests with controlled timers |
| Refresh race | Obsolete request cannot overwrite the newer result | Hook test |
| Error/recovery | Clear stale data/actions; show error; recover on refresh/next poll | Component and hook tests |
| Repeated clicking | Disable decision buttons during a pending save | Component test |

## Defects fixed during QA

1. The UI excluded duplicate active replacement requests, but calling the API
   directly created duplicates. A real database test reproduced `201` instead of
   `409`. Proposal creation now locks the order and checks for existing Pending
   or Approved requests in a transaction, also serializing with status updates.
2. Pending requests could still be decided after the order was Delivered or
   Cancelled. The API now locks and checks the order; both screens hide actions
   or review prompts for terminal orders. Existing request history remains visible.
3. The API accepted price differences with more than two decimal places even
   though the form required cents. Server validation now matches the form.

## Re-run

From `backend`:

```powershell
npm test
npm run test:substitution-tracking:db
```

From `frontend`:

```powershell
npm test
npm run lint
npm run build
```

The database check uses the configured development `DATABASE_URL` and `JWT_SECRET`.
It creates temporary accounts/orders and runs real HTTP handlers and SQL within
one outer transaction. Nested model transactions use savepoints so the script
cannot commit fixture data. It always rolls fixtures back. It does not alter
existing customer orders or require a new migration.

Frontend tests render the actual components and polling hook in jsdom, with API
responses controlled by the tests. They cover interactions, not visual layout or
a live browser-to-backend session. Simultaneous multi-client database contention
has not been stress-tested. Approval records the replacement decision; payment
adjustments and automatic rewriting of original line items remain outside the
existing feature's scope.
