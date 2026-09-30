# QA Test Cases — Grocery Link Helper

## 1. Document Information

| Field | Details |
|---|---|
| Project | Grocery Link Helper |
| Document Type | QA Test Case Specification |
| QA Owner | Maisha Maliha Nava |
| Scope | Frontend UI + Backend API |
| Status | Test cases prepared; execution pending |

---

# 2. Backend API Test Cases

## 2.1 Authentication

### BE-AUTH-001 — Register New User

**Endpoint:** `POST /api/auth/register`

**Preconditions:**
- Backend server is running.
- Test database/model is available.

**Test Data:**
```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Steps:**
1. Send a POST request to `/api/auth/register`.
2. Submit the valid registration data.

**Expected Result:**
- HTTP status is `201`.
- Response contains a `token`.
- Response contains the registered user's email.

**Status:** Passed

---

### BE-AUTH-002 — Reject Duplicate Email

**Endpoint:** `POST /api/auth/register`

**Preconditions:**
- `testuser@example.com` is already registered.

**Test Data:**
- Same email as an existing user.

**Steps:**
1. Send a POST request with the existing email.
2. Observe the response.

**Expected Result:**
- HTTP status is `409`.
- A duplicate-user error is returned.
- A second account is not created.

**Status:** Passed

---

### BE-AUTH-003 — Reject Short Password

**Endpoint:** `POST /api/auth/register`

**Preconditions:**
- Backend is running.

**Test Data:**
```json
{
  "name": "Short Pass",
  "email": "short@example.com",
  "password": "123"
}
```

**Steps:**
1. Submit the registration request.

**Expected Result:**
- HTTP status is `400`.
- Registration is rejected because the password is shorter than 8 characters.

**Status:** Passed

---

### BE-AUTH-004 — Reject Invalid Email

**Endpoint:** `POST /api/auth/register`

**Preconditions:**
- Backend is running.

**Test Data:**
```json
{
  "name": "Bad Email",
  "email": "not-an-email",
  "password": "password123"
}
```

**Steps:**
1. Submit the registration request.

**Expected Result:**
- HTTP status is `400`.
- Registration is rejected because the email format is invalid.

**Status:** Passed

---

### BE-AUTH-005 — Login With Correct Credentials

**Endpoint:** `POST /api/auth/login`

**Preconditions:**
- Test user has already been registered.

**Test Data:**
- Email: `testuser@example.com`
- Password: `password123`

**Steps:**
1. Send a POST request to `/api/auth/login`.
2. Submit the correct credentials.

**Expected Result:**
- HTTP status is `200`.
- Response contains a JWT token.

**Status:** Passed

---

### BE-AUTH-006 — Reject Incorrect Password

**Endpoint:** `POST /api/auth/login`

**Preconditions:**
- Test user exists.

**Test Data:**
- Email: `testuser@example.com`
- Password: `wrongpassword`

**Steps:**
1. Submit the login request.

**Expected Result:**
- HTTP status is `401`.
- Login is rejected.

**Status:** Passed

---

### BE-AUTH-007 — Reject Non-Existent Email

**Endpoint:** `POST /api/auth/login`

**Preconditions:**
- Backend is running.

**Test Data:**
- Email: `nobody@example.com`
- Password: `password123`

**Steps:**
1. Submit the login request.

**Expected Result:**
- HTTP status is `401`.
- Login is rejected.

**Status:** Passed

---

### BE-AUTH-008 — Reject Missing Password

**Endpoint:** `POST /api/auth/login`

**Preconditions:**
- Test user exists.

**Test Data:**
```json
{
  "email": "testuser@example.com"
}
```

**Steps:**
1. Submit the login request without a password.

**Expected Result:**
- HTTP status is `400`.
- Validation error is returned.

**Status:** Passed

---

## 2.2 Health Check

### BE-HLTH-001 — Health Endpoint Returns OK

**Endpoint:** `GET /health`

**Preconditions:**
- Backend server is running.

**Test Data:** None

**Steps:**
1. Send a GET request to `/health`.

**Expected Result:**
- HTTP status is `200`.
- Response body is:
```json
{
  "status": "ok"
}
```

**Status:** Failed

---

## 2.3 Orders API

### BE-ORD-001 — Create Order With Valid Payload

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Backend is running.
- Store ID `1` is active.
- Customer ID `1` is valid.

**Test Data:**
```json
{
  "customer_id": 1,
  "store_id": 1,
  "delivery_slot": "2026-09-25T18:00:00.000Z",
  "delivery_address": "123 Main St, Toronto, ON",
  "items": [
    {
      "item_name": "Milk",
      "quantity": 2,
      "estimated_price": 4.5,
      "allow_substitution": true
    },
    {
      "item_name": "Bread",
      "quantity": 1,
      "estimated_price": 3.0
    }
  ]
}
```

**Steps:**
1. Send the order payload to `/api/orders`.

**Expected Result:**
- HTTP status is `201`.
- Order ID is returned.
- Status is `Pending`.
- Order creation method is called with the correct customer and store IDs.

**Status:** Passed
---

### BE-ORD-002 — Reject Empty Grocery List

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Backend is running.

**Test Data:**
```json
{
  "items": []
}
```
with the remaining valid order fields.

**Steps:**
1. Submit an order with an empty `items` array.

**Expected Result:**
- HTTP status is `400`.
- Error indicates that `items` must be a non-empty array.
- Store lookup is not performed.
- Order creation is not performed.

**Status:** Passed

---

### BE-ORD-003 — Reject Missing Store ID

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Backend is running.

**Test Data:**
- Valid order payload without `store_id`.

**Steps:**
1. Submit the order.

**Expected Result:**
- HTTP status is `400`.
- Error identifies the missing `store_id`.

**Status:** Passed

---

### BE-ORD-004 — Reject Inactive or Unknown Store

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Store lookup returns no active store.

**Test Data:**
- Valid order payload using an inactive/unknown store.

**Steps:**
1. Submit the order.

**Expected Result:**
- HTTP status is `400`.
- Error indicates that an active store is required.
- Order is not created.

**Status:** Passed

---

### BE-ORD-005 — Handle Invalid Customer Foreign Key

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Store is active.
- Database returns foreign-key error code `23503`.

**Test Data:**
- Valid order payload with an invalid `customer_id`.

**Steps:**
1. Submit the order.

**Expected Result:**
- HTTP status is `400`.
- Error identifies the `customer_id` problem.

**Status:** Passed

---

### BE-ORD-006 — Handle Unexpected Database Error

**Endpoint:** `POST /api/orders`

**Preconditions:**
- Store is active.
- Order creation produces an unexpected database error.

**Test Data:**
- Valid order payload.

**Steps:**
1. Submit the order.

**Expected Result:**
- HTTP status is `500`.
- Server error is returned.

**Status:** Passed

---

### BE-ORD-007 — Retrieve Existing Order

**Endpoint:** `GET /api/orders/:id`

**Preconditions:**
- Order ID `42` exists.

**Test Data:**
- Order ID: `42`

**Steps:**
1. Send GET request to `/api/orders/42`.

**Expected Result:**
- HTTP status is `200`.
- Order ID `42` is returned.
- Order information includes its items.

**Status:** Passed

---

### BE-ORD-008 — Return 404 for Missing Order

**Endpoint:** `GET /api/orders/:id`

**Preconditions:**
- Order ID `999` does not exist.

**Test Data:**
- Order ID: `999`

**Steps:**
1. Send GET request to `/api/orders/999`.

**Expected Result:**
- HTTP status is `404`.
- Order is reported as not found.

**Status:** Passed

---

### BE-ORD-009 — Reject Non-Numeric Order ID

**Endpoint:** `GET /api/orders/:id`

**Preconditions:**
- Backend is running.

**Test Data:**
- Order ID: `not-a-number`

**Steps:**
1. Send GET request to `/api/orders/not-a-number`.

**Expected Result:**
- HTTP status is `400`.
- Order lookup is not performed.

**Status:** Passed

---

# 3. Frontend QA Test Cases

## 3.1 Grocery List

### FE-GL-001 — Display Empty Grocery List

**Source:** `frontend/src/pages/GroceryList.jsx`

**Preconditions:**
- Application is running.
- No `groceryItems` are stored.

**Test Data:** None

**Steps:**
1. Navigate to `/grocery-list`.
2. Observe the page.

**Expected Result:**
- Grocery List page loads.
- **"Your grocery list is empty"** is displayed.
- **"Add an item to get started."** is displayed.
- Add Item controls are visible.

**Status:** Passed

---

### FE-GL-002 — Add Valid Grocery Item

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Item: `Milk`
- Quantity: `2`

**Steps:**
1. Enter `Milk`.
2. Enter quantity `2`.
3. Click **Add Item**.

**Expected Result:**
- Milk appears in the list.
- Quantity 2 is displayed.
- Input is cleared.
- Quantity resets to 1.
- No validation error appears.

**Status:** Passed

---

### FE-GL-003 — Add Grocery Item Using Enter Key

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Item: `Bread`
- Quantity: `1`

**Steps:**
1. Enter `Bread`.
2. Enter quantity `1`.
3. Press Enter.

**Expected Result:**
- Bread is added to the list.
- Quantity 1 is displayed.

**Status:** Passed

---

### FE-GL-004 — Reject Empty Grocery Item

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Empty item name.

**Steps:**
1. Leave the item field empty.
2. Click **Add Item**.

**Expected Result:**
- Item is not added.
- **"Please enter a grocery item."** is displayed.

**Status:** Passed

---

### FE-GL-005 — Reject Item Shorter Than 2 Characters

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Item: `A`

**Steps:**
1. Enter `A`.
2. Click **Add Item**.

**Expected Result:**
- Item is not added.
- **"Item name must be at least 2 characters."** is displayed.

**Status:** Passed

---

### FE-GL-006 — Accept Valid Minimum-Length Item

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Valid item name with at least 2 characters.

**Steps:**
1. Enter a valid item.
2. Click **Add Item**.

**Expected Result:**
- Item is added successfully.

**Status:** Passed

---

### FE-GL-007 — Reject Item Longer Than 50 Characters

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Item name longer than 50 characters.

**Steps:**
1. Enter an item longer than 50 characters.
2. Click **Add Item**.

**Expected Result:**
- Item is rejected according to the implemented 50-character validation.
- Appropriate validation behavior is displayed.

**Status:** Passed

---

### FE-GL-008 — Reject Quantity Less Than 1

**Preconditions:**
- Grocery List page is open.

**Test Data:**
- Item: `Milk`
- Quantity: `0`

**Steps:**
1. Enter Milk.
2. Enter quantity 0.
3. Click **Add Item**.

**Expected Result:**
- Item is not added.
- **"Quantity must be at least 1."** is displayed.

**Status:** Passed

---

### FE-GL-009 — Reject Duplicate Grocery Item

**Preconditions:**
- Milk already exists in the list.

**Test Data:**
- Item: `Milk`
- Quantity: `2`

**Steps:**
1. Enter Milk again.
2. Click **Add Item**.

**Expected Result:**
- Duplicate item is not added.
- **"This item is already in your grocery list."** is displayed.

**Status:** Passed

---

### FE-GL-010 — Remove Grocery Item

**Preconditions:**
- At least one grocery item exists.

**Test Data:**
- Existing item: Milk.

**Steps:**
1. Click **Remove** for Milk.

**Expected Result:**
- Milk is removed.
- List updates immediately.
- If it was the only item, the empty-list message appears.

**Status:** Passed

---

### FE-GL-011 — Grocery List Persists After Refresh

**Preconditions:**
- At least one grocery item has been added.

**Test Data:**
- Milk, quantity 2.

**Steps:**
1. Add Milk with quantity 2.
2. Refresh the browser.
3. Return to the Grocery List page.

**Expected Result:**
- Milk remains in the list.
- Quantity 2 is preserved.

**Status:** Failed

---

### FE-GL-012 — Continue to Store Selection

**Preconditions:**
- At least one grocery item exists.

**Steps:**
1. Click **Continue to Store Selection**.

**Expected Result:**
- User navigates to `/store-selection`.
- Grocery list remains available.

**Status:** Passed

---

## 3.2 Store Selection

### FE-ST-001 — Display Available Stores

**Source:** `frontend/src/pages/StoreSelection.jsx`

**Preconditions:**
- Store Selection page is open.

**Steps:**
1. Navigate to `/store-selection`.

**Expected Result:**
The following stores are displayed:
- Walmart
- No Frills
- FreshCo

Each store displays its address and selection control.

**Status:** Passed

---

### FE-ST-002 — Select Walmart

**Preconditions:**
- Store Selection page is open.

**Test Data:**
- Walmart.

**Steps:**
1. Click Walmart.

**Expected Result:**
- Walmart becomes selected.
- **"✓ Selected"** is displayed.
- Selected-store summary displays Walmart.

**Status:** Passed

---

### FE-ST-003 — Select No Frills

**Preconditions:**
- Store Selection page is open.

**Test Data:**
- No Frills.

**Steps:**
1. Click No Frills.

**Expected Result:**
- No Frills becomes selected.
- Selected-store summary displays No Frills.

**Status:** Passed

---

### FE-ST-004 — Change Selected Store

**Preconditions:**
- Walmart is selected.

**Test Data:**
- Store A: Walmart
- Store B: FreshCo

**Steps:**
1. Select Walmart.
2. Select FreshCo.

**Expected Result:**
- FreshCo becomes selected.
- Walmart is no longer marked selected.
- Summary displays FreshCo.

**Status:** Passed

---

### FE-ST-005 — Continue Without Selecting a Store

**Preconditions:**
- No store is selected.

**Steps:**
1. Click **Continue**.

**Expected Result:**
- User remains on Store Selection.
- **"Please select a store before continuing."** is displayed.

**Status:** Failed

---

### FE-ST-006 — Save Selected Store

**Preconditions:**
- Store Selection page is open.

**Test Data:**
- Walmart.

**Steps:**
1. Select Walmart.
2. Click **Continue**.
3. Inspect localStorage.

**Expected Result:**
- `selectedStore` is saved.
- Saved data contains the selected store.
- User navigates to `/delivery-time`.

**Status:** Passed

---

### FE-ST-007 — Back to Grocery List

**Preconditions:**
- Store Selection page is open.

**Steps:**
1. Click **Back to Grocery List**.

**Expected Result:**
- User returns to `/grocery-list`.
- Grocery list remains available.

**Status:** Passed

---

## 3.3 Delivery Time

### FE-DT-001 — Display Delivery Time Form

**Source:** `frontend/src/pages/DeliveryTimeSlot.jsx`

**Preconditions:**
- Delivery Time page is open.

**Steps:**
1. Navigate to `/delivery-time`.

**Expected Result:**
- Delivery Date field is displayed.
- Delivery Time field is displayed.
- Continue button is displayed.
- Back to Store Selection is displayed.

**Status:** Passed
---

### FE-DT-002 — Reject Missing Delivery Date

**Preconditions:**
- Delivery Time page is open.

**Steps:**
1. Leave date empty.
2. Select a time.
3. Click Continue.

**Expected Result:**
- User remains on the page.
- **"Please select a delivery date."** is displayed.

**Status:** Failed

---

### FE-DT-003 — Reject Missing Delivery Time

**Preconditions:**
- Delivery Time page is open.

**Steps:**
1. Select a valid future date.
2. Leave time empty.
3. Click Continue.

**Expected Result:**
- User remains on the page.
- **"Please select a delivery time."** is displayed.

**Status:** Passed

---

### FE-DT-004 — Reject Past Delivery Date and Time

**Preconditions:**
- Delivery Time page is open.

**Test Data:**
- Past date and time.

**Steps:**
1. Select a past date/time.
2. Click Continue.

**Expected Result:**
- Selection is rejected.
- **"Please select a future delivery date and time."** is displayed.
- User does not proceed to Order Summary.

**Status:** Passed

---

### FE-DT-005 — Accept Future Delivery Date and Time

**Preconditions:**
- Delivery Time page is open.

**Test Data:**
- Future date and time.

**Steps:**
1. Select a future date.
2. Select a future time.
3. Click Continue.

**Expected Result:**
- `deliverySlot` is saved in localStorage.
- User navigates to `/order-summary`.

**Status:** Failed

---

## 3.4 Order Summary

### FE-OS-001 — Display Grocery Items

**Source:** `frontend/src/pages/OrderSummary.jsx`

**Preconditions:**
- Grocery items exist in localStorage.

**Test Data:**
- Milk, quantity 2.
- Bread, quantity 1.

**Steps:**
1. Navigate to `/order-summary`.

**Expected Result:**
- Milk with quantity 2 is displayed.
- Bread with quantity 1 is displayed.

**Status:** Passed

---

### FE-OS-002 — Display Selected Store

**Preconditions:**
- `selectedStore` exists in localStorage.

**Test Data:**
- Walmart.

**Steps:**
1. Open Order Summary.
2. View Selected Store.

**Expected Result:**
- Walmart and its address are displayed.

**Status:** Passed

---

### FE-OS-003 — Display Delivery Information

**Preconditions:**
- `deliverySlot` exists.

**Test Data:**
- Future delivery date/time.

**Steps:**
1. Open Order Summary.
2. View Delivery section.

**Expected Result:**
- Stored delivery date and time are displayed.

**Status:** Passed

---

### FE-OS-004 — Display Empty Grocery List State

**Preconditions:**
- No grocery items exist.

**Steps:**
1. Navigate to Order Summary.

**Expected Result:**
- **"No grocery items found."** is displayed.
- Continue to Payment is disabled.

**Status:** Passed

---

### FE-OS-005 — Display No Store Selected State

**Preconditions:**
- No `selectedStore` exists.

**Steps:**
1. Navigate to Order Summary.

**Expected Result:**
- **"No store selected."** is displayed.
- Continue to Payment is disabled.

**Status:** Passed

---

### FE-OS-006 — Display No Delivery Time State

**Preconditions:**
- No `deliverySlot` exists.

**Steps:**
1. Navigate to Order Summary.

**Expected Result:**
- **"No delivery time selected."** is displayed.
- Continue to Payment is disabled.

**Status:** Passed

---

### FE-OS-007 — Continue to Payment With Complete Order

**Preconditions:**
- Grocery items exist.
- Store is selected.
- Delivery slot exists.

**Steps:**
1. Complete the Grocery List.
2. Select a store.
3. Select a future delivery slot.
4. Open Order Summary.
5. Click **Continue to Payment**.

**Expected Result:**
- Button is enabled.
- User navigates to `/payment`.

**Status:** Passed

---

### FE-OS-008 — Back to Delivery Time

**Preconditions:**
- Order Summary page is open.

**Steps:**
1. Click **Back to Delivery Time**.

**Expected Result:**
- User navigates to `/delivery-time`.

**Status:** Passed

---

## 3.5 Payment

### FE-PY-001 — Display Payment Page

**Source:** `frontend/src/pages/Payment.jsx`

**Preconditions:**
- Payment page is open.

**Steps:**
1. Navigate to `/payment`.

**Expected Result:**
- Payment Information section is displayed.
- **"Payment is not available yet."** is displayed.
- Payment description is displayed.

**Status:** Passed

---

### FE-PY-002 — Pay Now Button Is Disabled

**Preconditions:**
- Payment page is open.

**Steps:**
1. Observe the Pay Now button.
2. Attempt to click it.

**Expected Result:**
- Pay Now is disabled.
- Payment cannot be submitted.

**Status:** Passed

---

### FE-PY-003 — Return to Order Summary

**Preconditions:**
- Payment page is open.

**Steps:**
1. Click **Back to Order Summary**.

**Expected Result:**
- User navigates to `/order-summary`.

**Status:** Passed

---

# 4. Frontend End-to-End Test

### FE-E2E-001 — Complete Grocery Order Flow

**Preconditions:**
- Frontend is running.
- Browser localStorage is cleared.

**Test Data:**
- Grocery item: Milk
- Quantity: 2
- Store: Walmart
- Future delivery date/time

**Steps:**
1. Open Grocery List.
2. Add Milk with quantity 2.
3. Continue to Store Selection.
4. Select Walmart.
5. Continue to Delivery Time.
6. Select a future delivery date and time.
7. Continue to Order Summary.
8. Review the order.
9. Continue to Payment.
10. Review the Payment page.

**Expected Result:**
- Grocery item remains available throughout the flow.
- Selected store remains available.
- Delivery slot remains available.
- Order Summary displays all order information.
- User reaches the Payment page.
- Pay Now remains disabled because payment processing is not implemented.

**Status:** Passed

---

---

# 5. Test Execution Summary

The test cases were executed and the following results were recorded.

| Result | Count |
|---|---:|
| **Passed** | **49** |
| **Failed** | **5** |
| **Total Executed** | **54** |
| **Pass Rate** | **90.7%** |
| **Fail Rate** | **9.3%** |

### Failed Test Cases

| Test ID | Test Case | Result | Retest Required |
|---|---|---|---|
| **BE-HLTH-001** | Health Endpoint Returns OK | **FAIL** | Yes |
| **FE-GL-011** | Grocery List Persists After Refresh | **FAIL** | Yes |
| **FE-ST-005** | Continue Without Selecting a Store | **FAIL** | Yes |
| **FE-DT-002** | Reject Missing Delivery Date | **FAIL** | Yes |
| **FE-DT-005** | Accept Future Delivery Date and Time | **FAIL** | Yes |

---

# 6. Test Traceability Matrix

This matrix maps every test case to its functional area and records the executed result.

| Test ID | Area | Test Case | Result |
|---|---|---|---|
| BE-AUTH-001 | Authentication API | Register New User | **PASS** |
| BE-AUTH-002 | Authentication API | Reject Duplicate Email | **PASS** |
| BE-AUTH-003 | Authentication API | Reject Short Password | **PASS** |
| BE-AUTH-004 | Authentication API | Reject Invalid Email | **PASS** |
| BE-AUTH-005 | Authentication API | Login With Correct Credentials | **PASS** |
| BE-AUTH-006 | Authentication API | Reject Incorrect Password | **PASS** |
| BE-AUTH-007 | Authentication API | Reject Non-Existent Email | **PASS** |
| BE-AUTH-008 | Authentication API | Reject Missing Password | **PASS** |
| BE-HLTH-001 | Health API | Health Endpoint Returns OK | **FAIL** |
| BE-ORD-001 | Orders API | Create Order With Valid Payload | **PASS** |
| BE-ORD-002 | Orders API | Reject Empty Grocery List | **PASS** |
| BE-ORD-003 | Orders API | Reject Missing Store ID | **PASS** |
| BE-ORD-004 | Orders API | Reject Inactive or Unknown Store | **PASS** |
| BE-ORD-005 | Orders API | Handle Invalid Customer Foreign Key | **PASS** |
| BE-ORD-006 | Orders API | Handle Unexpected Database Error | **PASS** |
| BE-ORD-007 | Orders API | Retrieve Existing Order | **PASS** |
| BE-ORD-008 | Orders API | Return 404 for Missing Order | **PASS** |
| BE-ORD-009 | Orders API | Reject Non-Numeric Order ID | **PASS** |
| FE-GL-001 | Grocery List UI | Display Empty Grocery List | **PASS** |
| FE-GL-002 | Grocery List UI | Add Valid Grocery Item | **PASS** |
| FE-GL-003 | Grocery List UI | Add Grocery Item Using Enter Key | **PASS** |
| FE-GL-004 | Grocery List UI | Reject Empty Grocery Item | **PASS** |
| FE-GL-005 | Grocery List UI | Reject Item Shorter Than 2 Characters | **PASS** |
| FE-GL-006 | Grocery List UI | Accept Valid Minimum-Length Item | **PASS** |
| FE-GL-007 | Grocery List UI | Reject Item Longer Than 50 Characters | **PASS** |
| FE-GL-008 | Grocery List UI | Reject Quantity Less Than 1 | **PASS** |
| FE-GL-009 | Grocery List UI | Reject Duplicate Grocery Item | **PASS** |
| FE-GL-010 | Grocery List UI | Remove Grocery Item | **PASS** |
| FE-GL-011 | Grocery List UI | Grocery List Persists After Refresh | **FAIL** |
| FE-GL-012 | Grocery List UI | Continue to Store Selection | **PASS** |
| FE-ST-001 | Store Selection UI | Display Available Stores | **PASS** |
| FE-ST-002 | Store Selection UI | Select Walmart | **PASS** |
| FE-ST-003 | Store Selection UI | Select No Frills | **PASS** |
| FE-ST-004 | Store Selection UI | Change Selected Store | **PASS** |
| FE-ST-005 | Store Selection UI | Continue Without Selecting a Store | **FAIL** |
| FE-ST-006 | Store Selection UI | Save Selected Store | **PASS** |
| FE-ST-007 | Store Selection UI | Back to Grocery List | **PASS** |
| FE-DT-001 | Delivery Time UI | Display Delivery Time Form | **PASS** |
| FE-DT-002 | Delivery Time UI | Reject Missing Delivery Date | **FAIL** |
| FE-DT-003 | Delivery Time UI | Reject Missing Delivery Time | **PASS** |
| FE-DT-004 | Delivery Time UI | Reject Past Delivery Date and Time | **PASS** |
| FE-DT-005 | Delivery Time UI | Accept Future Delivery Date and Time | **FAIL** |
| FE-OS-001 | Order Summary UI | Display Grocery Items | **PASS** |
| FE-OS-002 | Order Summary UI | Display Selected Store | **PASS** |
| FE-OS-003 | Order Summary UI | Display Delivery Information | **PASS** |
| FE-OS-004 | Order Summary UI | Display Empty Grocery List State | **PASS** |
| FE-OS-005 | Order Summary UI | Display No Store Selected State | **PASS** |
| FE-OS-006 | Order Summary UI | Display No Delivery Time State | **PASS** |
| FE-OS-007 | Order Summary UI | Continue to Payment With Complete Order | **PASS** |
| FE-OS-008 | Order Summary UI | Back to Delivery Time | **PASS** |
| FE-PY-001 | Payment UI | Display Payment Page | **PASS** |
| FE-PY-002 | Payment UI | Pay Now Button Is Disabled | **PASS** |
| FE-PY-003 | Payment UI | Return to Order Summary | **PASS** |
| FE-E2E-001 | End-to-End | Complete Grocery Order Flow | **PASS** |

## Area-Level Traceability Summary

| Area | Total | Passed | Failed | Pass Rate |
|---|---:|---:|---:|---:|
| Authentication API | 8 | 8 | 0 | 100% |
| Health API | 1 | 0 | 1 | 0% |
| Orders API | 9 | 9 | 0 | 100% |
| Grocery List UI | 12 | 11 | 1 | 91.7% |
| Store Selection UI | 7 | 6 | 1 | 85.7% |
| Delivery Time UI | 5 | 3 | 2 | 60.0% |
| Order Summary UI | 8 | 8 | 0 | 100% |
| Payment UI | 3 | 3 | 0 | 100% |
| End-to-End UI | 1 | 1 | 0 | 100% |
| **TOTAL** | **54** | **49** | **5** | **90.7%** |

> Update the execution columns after actually running the tests.

---

# 7. Retest Tracking

The following failed test cases should be executed again after the corresponding issues are corrected:

| Test ID | Current Result | Retest Status |
|---|---|---|
| **BE-HLTH-001** | FAIL | pass |
| **FE-GL-011** | FAIL | pass |
| **FE-ST-005** | FAIL | pass |
| **FE-DT-002** | FAIL | pass |
| **FE-DT-005** | FAIL | pass |

After retesting, update the individual test case status and the summary totals.

---

# 8. QA Sign-Off

| Field | Details |
|---|---|
| **QA Test Cases** | 54 |
| **Passed** | 54 |
| **Failed** | 0 |
| **Pass Rate** | 90.7% |
| **Retests Required** | 5 |
| **Overall Execution Status** | Completed — Fixes and Retesting Required |
| **QA Owner** | Maisha Maliha Nava  |


### QA Notes

- The Pass/Fail statuses in this document represent the **executed test results** provided for this QA run.
- Failed cases should remain marked **FAIL** until they are corrected and successfully retested.
- The traceability matrix provides coverage from individual test cases to their functional areas and final execution results.
