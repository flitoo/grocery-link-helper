import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./DeliveryTimeSlot.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

// Matches the backend default (SLOT_TIMEZONE); /api/slots does not return it
const TIME_ZONE = "America/Toronto";

function DeliveryTimeSlot() {
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [error, setError] = useState("");

  // Load available slots from the backend (US-07)
  useEffect(() => {
    let cancelled = false;

    const loadSlots = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/slots`);

        if (!response.ok) {
          throw new Error("Unable to load delivery slots.");
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        setSlots(data.slots);

        // Restore a previously chosen slot if it is still available
        const saved = localStorage.getItem("deliverySlot");
        const savedSlot = data.slots.find(
          (slot) => slot.start === saved && slot.available
        );
        const firstOpen = data.slots.find((slot) => slot.available);
        const initial = savedSlot || firstOpen;

        if (initial) {
          setSelectedDate(initial.date);
          setSelectedSlot(savedSlot ? savedSlot.start : "");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.message || "Unable to load delivery slots."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, []);

  // Group slots by date, keeping the API's chronological order
  const days = useMemo(() => {
    const byDate = new Map();

    slots.forEach((slot) => {
      if (!byDate.has(slot.date)) {
        byDate.set(slot.date, []);
      }
      byDate.get(slot.date).push(slot);
    });

    return [...byDate.entries()].map(([date, daySlots]) => ({
      date,
      slots: daySlots,
      hasAvailability: daySlots.some((slot) => slot.available),
    }));
  }, [slots]);

  const visibleSlots =
    days.find((day) => day.date === selectedDate)?.slots || [];

  // Example: Tue, Oct 6
  const formatDay = (date) => {
    const [year, month, day] = date.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Example: 4:00 PM to 5:00 PM (in the delivery time zone)
  const formatRange = (start) => {
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const options = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: TIME_ZONE,
    };

    return `${startDate.toLocaleTimeString(
      "en-CA",
      options
    )} to ${endDate.toLocaleTimeString("en-CA", options)}`;
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot("");
    setError("");
  };

  const handleSelectSlot = (slot) => {
    if (!slot.available) {
      return;
    }

    setSelectedSlot(slot.start);
    setError("");
  };

  const handleContinue = () => {
    if (!selectedSlot) {
      setError("Please select a delivery time.");
      return;
    }

    // ISO timestamp exactly as returned by /api/slots,
    // which is what POST /api/orders expects
    localStorage.setItem("deliverySlot", selectedSlot);

    setError("");

    navigate("/order-summary");
  };

  const renderSlots = () => {
    if (loading) {
      return <p className="slot-message">Loading delivery times...</p>;
    }

    if (loadError) {
      return (
        <p className="delivery-error" role="alert">
          {loadError} Check that the server is running, then reload.
        </p>
      );
    }

    if (!days.some((day) => day.hasAvailability)) {
      return (
        <p className="slot-message">
          No delivery times are open right now. Please check back
          later.
        </p>
      );
    }

    return (
      <>
        <h3 className="slot-heading" id="slot-day-label">
          Day
        </h3>

        <div
          className="slot-days"
          role="radiogroup"
          aria-labelledby="slot-day-label"
        >
          {days.map((day) => (
            <button
              key={day.date}
              type="button"
              role="radio"
              aria-checked={day.date === selectedDate}
              className={`slot-day${
                day.date === selectedDate ? " selected" : ""
              }`}
              disabled={!day.hasAvailability}
              onClick={() => handleSelectDate(day.date)}
            >
              {formatDay(day.date)}
            </button>
          ))}
        </div>

        <h3 className="slot-heading" id="slot-time-label">
          Time
        </h3>

        <div
          className="slot-times"
          role="radiogroup"
          aria-labelledby="slot-time-label"
        >
          {visibleSlots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              role="radio"
              aria-checked={slot.start === selectedSlot}
              className={`slot-time${
                slot.start === selectedSlot ? " selected" : ""
              }`}
              disabled={!slot.available}
              onClick={() => handleSelectSlot(slot)}
            >
              {formatRange(slot.start)}
              {!slot.available && <small>Full</small>}
            </button>
          ))}
        </div>

        {selectedSlot && (
          <div className="selected-delivery" role="status">
            <span>Selected delivery</span>

            <strong>
              {formatDay(selectedDate)}
              {", "}
              {formatRange(selectedSlot)}
            </strong>
          </div>
        )}
      </>
    );
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
            Pick a one-hour window in the next 7 days. Times that
            are full can't be chosen.
          </span>
        </div>

        <div className="delivery-card">
          {renderSlots()}

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
            disabled={loading || Boolean(loadError)}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}

export default DeliveryTimeSlot;
