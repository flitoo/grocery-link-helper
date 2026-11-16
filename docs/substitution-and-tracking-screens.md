# Substitution requests and order tracking

Automated QA coverage, fixes and re-run commands:
[Substitution and tracking QA](substitution-tracking-qa.md).

- Customer: open Orders → Track Order, or Order Details → Substitution Requests.
- Helper: open a claimed order → Substitution Requests.
- Before checkout, customers can enable “Allow replacement if unavailable”
  for individual items in Grocery List. Existing drafts keep this preference.
- While Shopping, the assigned helper can propose an eligible replacement,
  including a signed CAD price difference. Items with pending/approved requests
  are excluded from the form. Customers can approve or reject pending requests.
- Both screens read the existing authenticated API every 15 seconds. Refresh
  is also available. Changing routes cancels obsolete requests and timers.
- Tracking shows the order status, scheduled Toronto delivery time, address,
  assigned helper, progress, and pending replacement requests. Delivered and
  cancelled orders have explicit states. This is status tracking, not GPS.

## Verification

Frontend lint/build, 31 component and polling tests, and the full 356-test
backend suite pass. Real PostgreSQL/API checks cover helper assignment,
replacement proposals and decisions, access control, and tracking through
delivery. Fixtures are rolled back. See the QA report above for test boundaries.

The existing substitution API records decisions; approving a request does not
change the stored item or charge a price difference. These screens preserve
that backend contract and display the proposed difference for review.
