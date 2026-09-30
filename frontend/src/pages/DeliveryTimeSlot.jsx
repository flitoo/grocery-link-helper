import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./DeliveryTimeSlot.css";

function DeliveryTimeSlot() {
  const navigate = useNavigate();

  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [error, setError] = useState("");

  // Get today's date in YYYY-MM-DD format
  const getToday = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Format selected date
  // Example: December 12, 2026
  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const [year, month, day] = date.split("-");

    const selectedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return selectedDate.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format selected time
  // Example: 16:00 -> 4:00 PM
  const formatTime = (time) => {
    if (!time) {
      return "";
    }

    const [hour, minute] = time.split(":");

    const selectedTime = new Date();

    selectedTime.setHours(
      Number(hour),
      Number(minute),
      0,
      0
    );

    return selectedTime.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleContinue = () => {
    if (!deliveryDate) {
      setError("Please select a delivery date.");
      return;
    }

    if (!deliveryTime) {
      setError("Please select a delivery time.");
      return;
    }

    const selectedDateTime = new Date(
      `${deliveryDate}T${deliveryTime}`
    );

    if (selectedDateTime <= new Date()) {
      setError(
        "Please select a future delivery date and time."
      );
      return;
    }

    // Keep ISO-like format for storage
    // Example: 2026-12-12T16:00
    const deliverySlot =
      `${deliveryDate}T${deliveryTime}`;

    localStorage.setItem(
      "deliverySlot",
      deliverySlot
    );

    setError("");

    navigate("/order-summary");
  };

  return (
    <div className="delivery-page">
      <header className="delivery-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/grocery-list">
            Grocery List
          </Link>
        </nav>
      </header>

      <main className="delivery-content">
        <div className="delivery-title">
          <p>Schedule Delivery</p>

          <h2>Choose Delivery Time</h2>

          <span>
            Select your preferred delivery date and time.
          </span>
        </div>

        <div className="delivery-card">

          {/* Delivery Date */}
          <div className="delivery-form-group">
            <label htmlFor="delivery-date">
              Delivery Date
            </label>

            <input
              id="delivery-date"
              type="date"
              min={getToday()}
              value={deliveryDate}
              onChange={(e) => {
                setDeliveryDate(e.target.value);
                setError("");
              }}
            />
          </div>

          {/* Delivery Time */}
          <div className="delivery-form-group">
            <label htmlFor="delivery-time">
              Delivery Time
            </label>

            <input
              id="delivery-time"
              type="time"
              value={deliveryTime}
              onChange={(e) => {
                setDeliveryTime(e.target.value);
                setError("");
              }}
            />
          </div>

          {/* Selected Delivery */}
          {deliveryDate && deliveryTime && (
            <div className="selected-delivery">
              <span>
                Selected delivery
              </span>

              <strong>
                {formatDate(deliveryDate)}
                {" at "}
                {formatTime(deliveryTime)}
              </strong>
            </div>
          )}

          {/* Validation Error */}
          {error && (
            <p className="delivery-error">
              {error}
            </p>
          )}
        </div>

        <div className="delivery-actions">
          <Link
            to="/store-selection"
            className="back-button"
          >
            Back to Store Selection
          </Link>

          <button
            type="button"
            className="delivery-continue"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}

export default DeliveryTimeSlot;