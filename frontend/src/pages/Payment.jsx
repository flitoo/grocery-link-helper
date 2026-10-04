import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Payment.css";

function Payment() {
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Get saved data from localStorage
  const getSavedData = (key, fallback) => {
    try {
      const savedData = localStorage.getItem(key);

      if (!savedData) {
        return fallback;
      }

      return JSON.parse(savedData);
    } catch (error) {
      console.error(`Could not load ${key}:`, error);
      return fallback;
    }
  };

  // Get current order information
  const groceryItems = getSavedData("groceryItems", []);
  const selectedStore = getSavedData("selectedStore", null);
  const deliverySlot =
    localStorage.getItem("deliverySlot") || "";

  // Format delivery date and time
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

  // Format card number:
  // 1234 5678 9012 3456
  const handleCardNumberChange = (e) => {
    const numbersOnly = e.target.value
      .replace(/\D/g, "")
      .slice(0, 16);

    const formatted = numbersOnly.replace(
      /(\d{4})(?=\d)/g,
      "$1 "
    );

    setCardNumber(formatted);
    setError("");
  };

  // Format expiry date: MM/YY
  const handleExpiryChange = (e) => {
    let value = e.target.value
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

  // CVV numbers only
  const handleCvvChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 3);

    setCvv(value);
    setError("");
  };

  const handlePayment = () => {
    setError("");

    // Check grocery items
    if (groceryItems.length === 0) {
      setError(
        "No grocery items were found for this order."
      );
      return;
    }

    // Check store
    if (!selectedStore) {
      setError("No store was selected.");
      return;
    }

    // Check delivery
    if (!deliverySlot) {
      setError("No delivery time was selected.");
      return;
    }

    // Check cardholder name
    if (!cardholderName.trim()) {
      setError("Please enter the cardholder name.");
      return;
    }

    // Check card number
    const rawCardNumber =
      cardNumber.replace(/\s/g, "");

    if (!/^\d{16}$/.test(rawCardNumber)) {
      setError(
        "Please enter a valid 16-digit card number."
      );
      return;
    }

    // Check expiry format MM/YY
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError(
        "Please enter the expiry date in MM/YY format."
      );
      return;
    }

    const [month, year] = expiryDate
      .split("/")
      .map(Number);

    if (month < 1 || month > 12) {
      setError("Please enter a valid expiry month.");
      return;
    }

    // Check whether card is expired
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
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

    // Check CVV
    if (!/^\d{3}$/.test(cvv)) {
      setError("Please enter a valid 3-digit CVV.");
      return;
    }

    // Create frontend demo order
    const newOrder = {
      id: Date.now(),

      items: groceryItems,

      store: selectedStore,

      deliverySlot: deliverySlot,

      paymentMethod:
        paymentMethod === "credit"
          ? "Credit Card"
          : "Debit Card",

      paymentStatus: "Paid",

      orderStatus: "Placed",

      createdAt: new Date().toISOString(),
    };

    // Get previous orders
    let existingOrders = [];

    try {
      existingOrders = JSON.parse(
        localStorage.getItem("orders") || "[]"
      );

      if (!Array.isArray(existingOrders)) {
        existingOrders = [];
      }
    } catch (error) {
      console.error(
        "Could not load orders:",
        error
      );

      existingOrders = [];
    }

    // Add new order
    const updatedOrders = [
      ...existingOrders,
      newOrder,
    ];

    // Save all orders
    localStorage.setItem(
      "orders",
      JSON.stringify(updatedOrders)
    );

    // Save current order
    localStorage.setItem(
      "currentOrder",
      JSON.stringify(newOrder)
    );

    // Keep current order in state
    // so View Order knows which order to open
    setCompletedOrder(newOrder);

    // IMPORTANT:
    // Never save card number, expiry date or CVV
    setCardNumber("");
    setExpiryDate("");
    setCvv("");

    // Show payment successful
    setSuccess(true);
  };

  const handleViewOrder = () => {
    if (!completedOrder) {
      return;
    }

    navigate(
      `/order-details/${completedOrder.id}`
    );
  };

  return (
    <div className="payment-page">
      {/* Header */}
      <header className="payment-header">
        <h1>Grocery Link Helper</h1>

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
        {/* Title */}
        <div className="payment-title">
          <p>Checkout</p>

          <h2>Payment</h2>

          <span>
            Review your order and complete payment.
          </span>
        </div>

        {/* Order Details */}
        <section className="payment-card">
          <h3>Order Details</h3>

          {/* Grocery Items */}
          <div className="payment-summary-section">
            <h4>Grocery Items</h4>

            {groceryItems.length === 0 ? (
              <p className="payment-empty">
                No grocery items found.
              </p>
            ) : (
              groceryItems.map((item) => (
                <div
                  className="payment-summary-row"
                  key={item.id}
                >
                  <span>
                    {item.name}
                  </span>

                  <strong>
                    Quantity: {item.quantity}
                  </strong>
                </div>
              ))
            )}
          </div>

          {/* Store */}
          <div className="payment-summary-row">
            <span>Store</span>

            <strong>
              {selectedStore
                ? selectedStore.name ||
                  selectedStore.store_name
                : "Not selected"}
            </strong>
          </div>

          {/* Delivery */}
          <div className="payment-summary-row">
            <span>Delivery Slot</span>

            <strong>
              {formatDelivery(deliverySlot)}
            </strong>
          </div>
        </section>

        {/* Payment Form */}
        {!success && (
          <section className="payment-card">
            <h3>Payment Method</h3>

            {/* Credit / Debit */}
            <div className="payment-methods">
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

                <span>Credit Card</span>
              </label>

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

                <span>Debit Card</span>
              </label>
            </div>

            {/* Cardholder Name */}
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

            {/* Expiry + CVV */}
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
                  onChange={handleCvvChange}
                />
              </div>
            </div>

            <p className="payment-demo-note">
              Demo payment form only. No card
              information will be stored or
              processed.
            </p>

            {error && (
              <p className="payment-error">
                {error}
              </p>
            )}
          </section>
        )}

        {/* Payment Buttons */}
        {!success && (
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
            >
              Pay Now
            </button>
          </div>
        )}

        {/* Payment Success */}
        {success && (
          <div className="payment-success-box">
            <div className="success-icon">
              ✓
            </div>

            <h3>
              Payment Successful!
            </h3>

            <p>
              Your order has been placed
              successfully.
            </p>

            {completedOrder && (
              <p>
                Order #{completedOrder.id}
              </p>
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
                onClick={() =>
                  navigate("/dashboard")
                }
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Payment;