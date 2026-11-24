# Performance check and accessibility audit

Audit date: 2026-11-24. Baseline source: `3a65a3f`; latest reports include the
local changes described below. Results are laboratory checks, not production
load-test results or a claim of complete WCAG conformance.

## Reproduce

Install frontend dependencies with `npm ci`. Use Node.js 22+ and installed
Chrome/Chromium (or Edge). If auto-detection fails, set `CHROME_PATH` to the
browser executable. No existing browser profile or login is used.

From `frontend`:

```powershell
npm run audit:accessibility
npm run audit:performance
npm test
npm run lint
```

Each audit command builds the production app, serves it on an ephemeral loopback
port, launches an isolated headless browser and saves JSON under `docs/qa`.
Frontend API responses and authentication are synthetic fixtures; unexpected
API requests fail the audit. No orders, payments or notifications are created.
Performance runs should run alone to reduce CPU contention.

From `backend`, with the existing development `.env` and seeded database:

```powershell
npm run test:performance
```

This starts a separate local Express listener without the notification worker,
uses read-only catalogue endpoints and closes the server and database pool when
finished. It does not stop an existing development server. Tokens and connection
strings are not written to the report.

## API performance

The smoke budget is p95 <= 1,000 ms, zero measured errors and successful initial
endpoint responses. This is a project check threshold, not an agreed production
SLA. Each endpoint receives 3 concurrent warm-up requests and 30 measured
requests at concurrency 3, plus one initial endpoint request.

| Endpoint | Measured requests | p50 | p95 | Maximum | Errors |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/health` | 30 | 8 ms | 20 ms | 20 ms | 0 |
| `/api/stores` | 30 | 38 ms | 45 ms | 64 ms | 0 |
| `/api/items?store_id=1&limit=20` | 30 | 74 ms | 209 ms | 225 ms | 0 |
| `/api/slots` | 30 | 528 ms | 640 ms | 640 ms | 0 |

All 120 measured requests passed. Initial database lookup took 1,236 ms in the
recorded run; an earlier exploratory connection took approximately 9.5 seconds.
Cold database/network startup is variable and excluded from the warm p95 budget.
Slots were the slowest measured endpoint. This bounded check does not establish
capacity under many concurrent users or cover authenticated order mutations.

Evidence: [API measurements](qa/api-performance-latest.json).

## Frontend performance

Lighthouse uses the production build with gzip, simulated mobile networking
(150 ms RTT, 1,638.4 Kbps) and 4x CPU slowdown. The API fixtures eliminate actual
backend latency, so these measurements assess frontend loading separately.

Route-level lazy loading reduced the initial JavaScript bundle from 374.28 KB
to 268.85 KB (gzip: 107.64 KB to 85.49 KB). Initial CSS fell from 60.48 KB to
3.42 KB; other route code and styles load when needed. Login remains eager.
These are Vite build sizes in decimal KB, not total session transfer sizes.

| Screen | Baseline score | Post-change run 1 | Post-change run 2 | Run 2 LCP | Run 2 TBT | Run 2 CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Login | 97 | 71 | 80 | 1,503 ms | 807 ms | 0 |
| Grocery list | 81 | 82 | 71 | 2,471 ms | 1,411 ms | 0.040 |
| Order tracking | 93 | 71 | 73 | 2,591 ms | 1,158 ms | 0.024 |

**Finding remains open:** main-thread blocking is high in both post-change
runs. Smaller bundles did not establish an overall performance improvement.
Post-change scores are lower on login and tracking; CPU benchmark indices also
changed (baseline 657-744 versus approximately 479-545 after changes), so the
cause cannot be assigned to application code or machine load from these samples
alone. Lazy route loading introduces additional requests and small layout
shifts. Profile the long tasks and compare repeated runs on a controlled machine
before declaring frontend performance accepted. No frontend score gate is
enforced by the script; its successful exit means the measurement completed
without page/fixture failures, not that a performance target passed.

Evidence: [baseline](qa/performance-baseline.json),
[post-change run 1](qa/performance-postchange-run1.json), and
[post-change run 2](qa/performance-latest.json). These are individual lab
observations, not medians or field Core Web Vitals measurements.

## Accessibility

Coverage includes all 23 routes in `frontend/scripts/audit-fixtures.mjs` at
1365 x 900 desktop and 390 x 844 mobile sizes. Additional states cover login
validation errors, the expanded custom-item form and a selected collection on
both viewports, for 52 states in the final audit.

Final result: **0 automated violations across all 52 states**, no recorded page
or fixture errors, no horizontal overflow on the 46 initial page states, and
all 46 skip-link/focus checks passed. Both client-navigation focus checks passed.

The baseline had 78 rule violations across 38 of 46 route/viewport cases,
affecting 238 element instances (including repeated elements on both viewports).
Findings included low text contrast, missing main landmarks, missing primary
headings and heading hierarchy problems revealed after adding primary headings.

Changes:

- Darker text and button colours; visible outlines for keyboard focus.
- One primary heading and focusable main landmark per page, with ordered
  subsection headings and descriptive document titles.
- A first-tab skip link and focus transfer to loaded content after navigation,
  including routes whose chunks load asynchronously.
- Appropriate autocomplete and error/status announcements on authentication
  forms; reduced-motion preferences respected.
- Named pagination navigation and rating controls with readable star colours,
  distinct outlined/filled stars and accessible button names/pressed states.

Browser checks exercise Tab/Enter skip navigation, visible focus and dashboard
to orders navigation at both viewport sizes. Three component regression tests
also cover document titles, skip navigation and focus on route changes.

Evidence: [baseline](qa/accessibility-baseline.json) and
[latest](qa/accessibility-latest.json). Axe rules include best-practice rules
alongside WCAG checks. Automated results do not replace testing with a screen
reader, zoom, real users or all possible order/error states. Items listed under
`needsReview` remain manual-review observations, not automatic passes.
The final report retains glyph contrast/name review items on the rating,
tracking and delivery-status screens at both viewport sizes. Code inspection
confirmed named rating buttons with decorative star glyphs and separate text
labels for progress steps; a screen-reader and visual review remains outside
this automated run.

## Regression validation

- Frontend: 81 tests across 8 files passed.
- Production build and ESLint passed.
- API smoke benchmark: all four endpoint budgets passed.

Both requested audit activities have been executed and their findings recorded.
Frontend performance follow-up and manual accessibility review remain as noted
above. Audit completion does not imply that these follow-up findings are resolved.
