import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Payment.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function Payment() {
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] =
    useState("credit");

  const [cardholderName, setCardholderName] =
    useState("");

  const [cardNumber, setCardNumber] =
    useState("");

  const [expiryDate, setExpiryDate] =
    useState("");

  const [cvv, setCvv] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [completedOrder, setCompletedOrder] =
    useState(null);

  // ==========================================
  // Read localStorage safely
  // ==========================================

  const getSavedData = (key, fallback) => {
    try {
      const savedData = localStorage.getItem(key);

      if (!savedData) {
        return fallback;
      }

      return JSON.parse(savedData);
    } catch (error) {
      console.error(
        `Could not load ${key}:`,
        error
      );

      return fallback;
    }
  };

  // ==========================================
  // Order data
  // ==========================================

  const groceryItems =
    getSavedData("groceryItems", []);

  const selectedStore =
    getSavedData("selectedStore", null);

  const currentOrder =
    getSavedData("currentOrder", null);

  const deliverySlot =
    localStorage.getItem("deliverySlot") || "";

  const deliveryAddress =
    localStorage.getItem("deliveryAddress") || "";

  const savedOrderId =
    localStorage.getItem("orderId");

  // Support different possible backend property names
  const orderId = Number(
    currentOrder?.order_id ||
      currentOrder?.id ||
      savedOrderId
  );

  // ==========================================
  // Estimated total
  // ==========================================

  const estimatedTotal =
    groceryItems.reduce(
      (total, item) =>
        total +
        Number(item.estimatedPrice || 0) *
          Number(item.quantity || 0),
      0
    );

  // ==========================================
  // Format delivery date
  // ==========================================

  const formatDelivery = (slot) => {
    if (!slot) {
      return "Not selected";
    }

    const date = new Date(slot);

    if (Number.isNaN(date.getTime())) {
      return slot.replace("T", " ");
    }

    return date.toLocaleString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ==========================================
  // Card Number
  // ==========================================

  const handleCardNumberChange = (e) => {
    const numbersOnly =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 16);

    const formatted =
      numbersOnly.replace(
        /(\d{4})(?=\d)/g,
        "$1 "
      );

    setCardNumber(formatted);
    setError("");
  };

  // ==========================================
  // Expiry Date MM/YY
  // ==========================================

  const handleExpiryChange = (e) => {
    let value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 4);

    if (value.length >= 3) {
      value =
        value.slice(0, 2) +
        "/" +
        value.slice(2);
    }

    setExpiryDate(value);
    setError("");
  };

  // ==========================================
  // CVV
  // ==========================================

  const handleCvvChange = (e) => {
    const value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 3);

    setCvv(value);
    setError("");
  };

  // ==========================================
  // Pay Now
  // ==========================================

  const handlePayment = async () => {
    setError("");

    // ------------------------------------------
    // Order validation
    // ------------------------------------------

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      setError(
        "Order information is not available. Please return to Order Summary."
      );

      return;
    }

    // ------------------------------------------
    // Grocery validation
    // ------------------------------------------

    if (groceryItems.length === 0) {
      setError(
        "No grocery items were found for this order."
      );

      return;
    }

    // ------------------------------------------
    // Store validation
    // ------------------------------------------

    if (!selectedStore) {
      setError("No store was selected.");
      return;
    }

    // ------------------------------------------
    // Delivery validation
    // ------------------------------------------

    if (!deliverySlot) {
      setError(
        "No delivery time was selected."
      );

      return;
    }

    // ------------------------------------------
    // Cardholder validation
    // ------------------------------------------

    if (!cardholderName.trim()) {
      setError(
        "Please enter the cardholder name."
      );

      return;
    }

    // ------------------------------------------
    // Card number validation
    // ------------------------------------------

    const rawCardNumber =
      cardNumber.replace(/\s/g, "");

    if (!/^\d{16}$/.test(rawCardNumber)) {
      setError(
        "Please enter a valid 16-digit card number."
      );

      return;
    }

    // ------------------------------------------
    // Expiry validation
    // ------------------------------------------

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError(
        "Please enter the expiry date in MM/YY format."
      );

      return;
    }

    const [month, year] =
      expiryDate
        .split("/")
        .map(Number);

    if (month < 1 || month > 12) {
      setError(
        "Please enter a valid expiry month."
      );

      return;
    }

    const currentDate = new Date();

    const currentMonth =
      currentDate.getMonth() + 1;

    const currentYear =
      currentDate.getFullYear() % 100;

    if (
      year < currentYear ||
      (year === currentYear &&
        month < currentMonth)
    ) {
      setError("The card has expired.");
      return;
    }

    // ------------------------------------------
    // CVV validation
    // ------------------------------------------

    if (!/^\d{3}$/.test(cvv)) {
      setError(
        "Please enter a valid 3-digit CVV."
      );

      return;
    }

    // ==========================================
    // Create demo transaction reference
    // ==========================================

    const transactionRef =
      `TXN-${orderId}-${Date.now()}`;

    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      // ========================================
      // REAL PAYMENT API
      // ========================================

      const response = await fetch(
        `${API_BASE}/api/payments`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            order_id: orderId,
            transaction_ref:
              transactionRef,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // ========================================
      // Backend error
      // ========================================

      if (!response.ok) {
        const message =
          data?.errors?.[0] ||
          data?.error ||
          data?.message ||
          "Payment could not be completed.";

        throw new Error(message);
      }

      // ========================================
      // Payment successful
      // ========================================

      /*
       * IMPORTANT:
       * Keep the original order creation time
       * from the backend if it exists.
       *
       * Only use the current time as a fallback
       * if the order does not contain a date.
       */

      const orderCreatedAt =
        currentOrder?.createdAt ||
        currentOrder?.created_at ||
        currentOrder?.orderDate ||
        currentOrder?.order_date ||
        new Date().toISOString();

      const completed = {
        ...(currentOrder || {}),

        id: orderId,
        order_id: orderId,

        items: groceryItems,

        store: selectedStore,

        deliverySlot,

        deliveryAddress,

        total: estimatedTotal,

        paymentMethod,

        paymentStatus: "Paid",

        status:
          currentOrder?.status ||
          currentOrder?.orderStatus ||
          currentOrder?.order_status ||
          "Pending",

        payment: data,

        transactionRef,

        // Preserve order creation time
        createdAt: orderCreatedAt,
      };

      // ========================================
      // Save current completed order
      // ========================================

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(completed)
      );

      // Keep orderId available
      localStorage.setItem(
        "orderId",
        String(orderId)
      );

      // ========================================
      // Update frontend Orders list
      // ========================================

      const savedOrders =
        getSavedData("orders", []);

      let updatedOrders =
        Array.isArray(savedOrders)
          ? [...savedOrders]
          : [];

      const existingOrderIndex =
        updatedOrders.findIndex(
          (order) =>
            String(
              order.id ||
                order.order_id
            ) === String(orderId)
        );

      if (existingOrderIndex >= 0) {
        updatedOrders[
          existingOrderIndex
        ] = completed;
      } else {
        updatedOrders.unshift(
          completed
        );
      }

      localStorage.setItem(
        "orders",
        JSON.stringify(updatedOrders)
      );

      // ========================================
      // Clear sensitive card fields
      // ========================================

      setCardNumber("");
      setExpiryDate("");
      setCvv("");

      setCompletedOrder(completed);
      setSuccess(true);
    } catch (error) {
      console.error(
        "Payment failed:",
        error
      );

      setError(
        error.message ||
          "Payment could not be completed."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // View completed order
  // ==========================================

  const handleViewOrder = () => {
    if (!completedOrder) {
      return;
    }

    navigate(
      `/order-details/${completedOrder.id}`
    );
  };

  // ==========================================
  // Dashboard
  // ==========================================

  const handleDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="payment-page">
      {/* ==============================
          Header
      ============================== */}

      <header className="payment-header">
        <h1>
          Grocery Link Helper
        </h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/grocery-list">
            Grocery List
          </Link>

          <Link to="/orders">
            Orders
          </Link>
        </nav>
      </header>

      <main className="payment-content">
        {/* ==============================
            Title
        ============================== */}

        <div className="payment-title">
          <p>Checkout</p>

          <h2>Payment</h2>

          <span>
            Review your order and complete payment.
          </span>
        </div>

        {/* ==============================
            SUCCESS
        ============================== */}

        {success ? (
          <section className="payment-success-box">
            <div className="success-icon">
              ✓
            </div>

            <h3>
              Payment Successful!
            </h3>

            <p>
              Your payment has been submitted successfully.
            </p>

            {completedOrder && (
              <div className="payment-success-order">
                <span>
                  Order Number
                </span>

                <strong>
                  #{completedOrder.id}
                </strong>
              </div>
            )}

            <div className="success-actions">
              <button
                type="button"
                className="view-order-button"
                onClick={handleViewOrder}
              >
                View Order
              </button>

              <button
                type="button"
                className="dashboard-button"
                onClick={handleDashboard}
              >
                Back to Dashboard
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* ==============================
                ORDER DETAILS
            ============================== */}

            <section className="payment-card">
              <h3>
                Order Details
              </h3>

              {/* Order ID */}

              {Number.isInteger(orderId) &&
                orderId > 0 && (
                  <div className="payment-summary-row">
                    <span>
                      Order
                    </span>

                    <strong>
                      #{orderId}
                    </strong>
                  </div>
                )}

              {/* Grocery Items */}

              <div className="payment-summary-section">
                <h4>
                  Grocery Items
                </h4>

                {groceryItems.length === 0 ? (
                  <p className="payment-empty">
                    No grocery items found.
                  </p>
                ) : (
                  groceryItems.map(
                    (item) => (
                      <div
                        className="payment-summary-row"
                        key={item.id}
                      >
                        <span>
                          {item.name}
                        </span>

                        <strong>
                          {item.quantity} × $
                          {Number(
                            item.estimatedPrice ||
                              0
                          ).toFixed(2)}
                        </strong>
                      </div>
                    )
                  )
                )}
              </div>

              {/* Store */}

              <div className="payment-summary-row">
                <span>
                  Store
                </span>

                <strong>
                  {selectedStore
                    ? selectedStore.name ||
                      selectedStore.store_name
                    : "Not selected"}
                </strong>
              </div>

              {/* Delivery */}

              <div className="payment-summary-row">
                <span>
                  Delivery
                </span>

                <strong>
                  {formatDelivery(
                    deliverySlot
                  )}
                </strong>
              </div>

              {/* Delivery Address */}

              {deliveryAddress && (
                <div className="payment-summary-row">
                  <span>
                    Delivery Address
                  </span>

                  <strong>
                    {deliveryAddress}
                  </strong>
                </div>
              )}

              {/* Total */}

              <div className="payment-summary-row payment-total">
                <span>
                  Estimated Total
                </span>

                <strong>
                  $
                  {estimatedTotal.toFixed(2)}
                </strong>
              </div>
            </section>

            {/* ==============================
                PAYMENT METHOD
            ============================== */}

            <section className="payment-card">
              <h3>
                Payment Method
              </h3>

              <div className="payment-methods">
                {/* Credit Card */}

                <label
                  className={`payment-method ${
                    paymentMethod === "credit"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit"
                    checked={
                      paymentMethod === "credit"
                    }
                    onChange={(e) => {
                      setPaymentMethod(
                        e.target.value
                      );

                      setError("");
                    }}
                  />

                  <span>
                    Credit Card
                  </span>
                </label>

                {/* Debit Card */}

                <label
                  className={`payment-method ${
                    paymentMethod === "debit"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit"
                    checked={
                      paymentMethod === "debit"
                    }
                    onChange={(e) => {
                      setPaymentMethod(
                        e.target.value
                      );

                      setError("");
                    }}
                  />

                  <span>
                    Debit Card
                  </span>
                </label>
              </div>

              {/* Cardholder */}

              <div className="payment-form-group">
                <label htmlFor="cardholder-name">
                  Cardholder Name
                </label>

                <input
                  id="cardholder-name"
                  type="text"
                  placeholder="Enter cardholder name"
                  value={cardholderName}
                  onChange={(e) => {
                    setCardholderName(
                      e.target.value
                    );

                    setError("");
                  }}
                />
              </div>

              {/* Card Number */}

              <div className="payment-form-group">
                <label htmlFor="card-number">
                  Card Number
                </label>

                <input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={
                    handleCardNumberChange
                  }
                />
              </div>

              {/* Expiry / CVV */}

              <div className="payment-form-row">
                <div className="payment-form-group">
                  <label htmlFor="expiry-date">
                    Expiry Date
                  </label>

                  <input
                    id="expiry-date"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={
                      handleExpiryChange
                    }
                  />
                </div>

                <div className="payment-form-group">
                  <label htmlFor="cvv">
                    CVV
                  </label>

                  <input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvv}
                    onChange={
                      handleCvvChange
                    }
                  />
                </div>
              </div>

              <p className="payment-demo-note">
                Demo payment form only. Card information
                is not stored or sent to the backend.
              </p>

              {/* Error */}

              {error && (
                <p className="payment-error">
                  {error}
                </p>
              )}
            </section>

            {/* ==============================
                ACTIONS
            ============================== */}

            <div className="payment-actions">
              <Link
                to="/order-summary"
                className="payment-back"
              >
                Back to Order Summary
              </Link>

              <button
                type="button"
                className="payment-button"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : "Pay Now"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Payment;