
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./RatingFeedback.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function RatingFeedback() {
  const { orderId } = useParams();

  const user = readJSON("user", null);
  const userId = Number(user?.id ?? user?.user_id);
  const token = localStorage.getItem("token");

  const feedbackKey = `orderFeedback:${userId}:${orderId}`;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setSavedFeedback(readJSON(feedbackKey, null));
    setRating(0);
    setHover(0);
    setComment("");
    setOrder(null);
    setError("");
    setLoading(true);

    async function loadOrder() {
      if (!Number.isInteger(userId) || userId <= 0 || !token) {
        setError("Please log in to rate your delivery.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Could not load this order.");
        }

        const data = await response.json();

        if (Number(data.customer_id) !== userId) {
          throw new Error("This order does not belong to your account.");
        }

        if (!controller.signal.aborted) {
          setOrder(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => controller.abort();
  }, [orderId, userId, token, feedbackKey]);

  const canRate =
    order?.status === "Delivered" &&
    order?.helper_id != null;

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!canRate || savedFeedback) return;

    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    const feedback = {
      orderId: Number(orderId),
      customerId: userId,
      helperId: order.helper_id,
      rating,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      feedbackKey,
      JSON.stringify(feedback)
    );

    setSavedFeedback(feedback);
  }

  return (
    <div className="rating-page">
      <header className="rating-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/notifications">Notifications</Link>
        </nav>
      </header>

      <main className="rating-content">
        <div className="rating-title">
          <p>Delivery Experience</p>
          <h2>Rating & Feedback</h2>
          <span>Share your experience with your helper.</span>
        </div>

        {loading ? (
          <div className="rating-card">
            <p>Loading order...</p>
          </div>
        ) : error && !order ? (
          <div className="rating-card">
            <p className="rating-error">{error}</p>
            <Link to="/orders">Back to Orders</Link>
          </div>
        ) : (
          <div className="rating-card">
            <div className="rating-order-info">
              <h3>Order #{orderId}</h3>
              <span>Status: {order.status}</span>
            </div>

            {savedFeedback ? (
              <div className="rating-success">
                <h3>Thank you for your feedback!</h3>

                <div className="rating-stars">
                  {"★".repeat(savedFeedback.rating)}
                  {"☆".repeat(5 - savedFeedback.rating)}
                </div>

                <p>
                  You rated this delivery{" "}
                  {savedFeedback.rating} out of 5 stars.
                </p>

                {savedFeedback.comment && (
                  <p className="saved-comment">
                    "{savedFeedback.comment}"
                  </p>
                )}

                <p className="rating-note">
                  Feedback saved in this browser (demo).
                </p>

                <Link to="/orders" className="rating-back">
                  Back to Orders
                </Link>
              </div>
            ) : !canRate ? (
              <div className="rating-message">
                <h3>Rating is not available yet</h3>

                <p>
                  You can rate your helper after your
                  order has been delivered and a helper
                  has been assigned.
                </p>

                <Link to="/orders" className="rating-back">
                  Back to Orders
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="rating-helper">
                  <span>Delivery Helper</span>
                  <h3>Helper #{order.helper_id}</h3>
                </div>

                <div className="rating-question">
                  <h3>How was your delivery?</h3>
                  <p>Select a rating from 1 to 5 stars.</p>
                </div>

                <div
                  className="rating-stars"
                  onMouseLeave={() => setHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={
                        star <= (hover || rating)
                          ? "star active"
                          : "star"
                      }
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      aria-label={`Rate ${star} stars`}
                      aria-pressed={rating === star}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="rating-comment">
                  <label htmlFor="feedback">
                    Your Feedback (Optional)
                  </label>

                  <textarea
                    id="feedback"
                    placeholder="Tell us about your delivery experience..."
                    value={comment}
                    onChange={(e) =>
                      setComment(e.target.value)
                    }
                    maxLength={500}
                    rows={5}
                  />

                  <small>{comment.length}/500 characters</small>
                </div>

                {error && (
                  <p className="rating-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="rating-actions">
                  <Link to="/orders" className="rating-cancel">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="rating-submit"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default RatingFeedback;
