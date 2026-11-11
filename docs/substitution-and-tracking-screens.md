# Substitution requests and order tracking

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

Frontend lint and build pass. The 42 relevant backend tests pass.
Browser checks use an isolated in-memory API fixture, without real database
writes: helper eligibility and submission, customer approval, removal of the
pending notification, and automatic progress updates.

The existing substitution API records decisions; approving a request does not
change the stored item or charge a price difference. These screens preserve
that backend contract and display the proposed difference for review.
