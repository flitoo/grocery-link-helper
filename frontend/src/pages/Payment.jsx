import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CheckoutSteps from "../components/CheckoutSteps";
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
      <AppHeader />

      <main className="container-narrow page-body">
        {success ? (
          <section className="payment-success" role="status">
            <span className="success-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40">
                <path
                  d="m5 12.5 4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <h1>Payment successful</h1>

            <p>
              Your order is in. We will let you know when a helper
              picks it up.
            </p>

            {completedOrder && (
              <p className="success-order">
                Order <strong>#{completedOrder.id}</strong>
              </p>
            )}

            <div className="success-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleViewOrder}
              >
                View order
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDashboard}
              >
                Back to home
              </button>
            </div>
          </section>
        ) : (
          <>
            <CheckoutSteps current={4} />

            <div className="page-title">
              <h1>Pay for your order</h1>
              <p>Check the total, then enter your card details.</p>
            </div>

            <div className="receipt-wrap">
              <section className="receipt" aria-label="Order details">
                <h2>
                  {selectedStore
                    ? selectedStore.name || selectedStore.store_name
                    : "No store selected"}
                </h2>

                {Number.isInteger(orderId) && orderId > 0 && (
                  <p className="receipt-meta">Order #{orderId}</p>
                )}

                <div className="receipt-section">
                  {groceryItems.length === 0 ? (
                    <p className="receipt-meta">
                      No grocery items found.
                    </p>
                  ) : (
                    groceryItems.map((item) => (
                      <div className="receipt-line" key={item.id}>
                        <span>
                          {item.name}
                          {" "}
                          <small>
                            {item.quantity} × $
                            {Number(item.estimatedPrice || 0).toFixed(2)}
                          </small>
                        </span>

                        <strong className="num">
                          $
                          {(
                            Number(item.estimatedPrice || 0) *
                            Number(item.quantity || 0)
                          ).toFixed(2)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>

                <div className="receipt-section">
                  <div className="receipt-line">
                    <span>Delivery time</span>
                    <strong>{formatDelivery(deliverySlot)}</strong>
                  </div>

                  {deliveryAddress && (
                    <div className="receipt-line">
                      <span>Address</span>
                      <strong>{deliveryAddress}</strong>
                    </div>
                  )}
                </div>

                <div className="receipt-total">
                  <span>Estimated total</span>
                  <strong>${estimatedTotal.toFixed(2)}</strong>
                </div>
              </section>
            </div>

            <section className="panel payment-form">
              <h2>Card details</h2>

              <div
                className="payment-methods"
                role="radiogroup"
                aria-label="Card type"
              >
                <label
                  className={`payment-method ${
                    paymentMethod === "credit" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit"
                    checked={paymentMethod === "credit"}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);

                      setError("");
                    }}
                  />

                  <span>Credit card</span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "debit" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit"
                    checked={paymentMethod === "debit"}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);

                      setError("");
                    }}
                  />

                  <span>Debit card</span>
                </label>
              </div>

              <div className="field">
                <label htmlFor="cardholder-name">Name on card</label>

                <input
                  id="cardholder-name"
                  type="text"
                  autoComplete="cc-name"
                  placeholder="As shown on the card"
                  value={cardholderName}
                  onChange={(e) => {
                    setCardholderName(e.target.value);

                    setError("");
                  }}
                />
              </div>

              <div className="field">
                <label htmlFor="card-number">Card number</label>

                <input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="expiry-date">Expiry (MM/YY)</label>

                  <input
                    id="expiry-date"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="cvv">Security code (CVV)</label>

                  <input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                  />
                </div>
              </div>

              <p className="notice notice-info">
                This is a demo form. Card details are not stored or
                sent to the server.
              </p>

              {error && (
                <p className="notice notice-error payment-error" role="alert">
                  {error}
                </p>
              )}
            </section>

            <div className="action-bar">
              <Link to="/order-summary" className="btn btn-secondary">
                Back to review
              </Link>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : `Pay $${estimatedTotal.toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Payment;