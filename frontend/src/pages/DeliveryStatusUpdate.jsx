import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./DeliveryStatusUpdate.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ORDER_STEPS = [
  "Pending",
  "Paid",
  "Assigned",
  "Shopping",
  "Out_for_Delivery",
  "Delivered",
];

const STATUS_LABELS = {
  Pending: "Pending",
  Paid: "Paid",
  Assigned: "Assigned to Helper",
  Shopping: "Shopping",
  Out_for_Delivery: "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

const NEXT_STATUS = {
  Assigned: "Shopping",
  Shopping: "Out_for_Delivery",
  Out_for_Delivery: "Delivered",
};

const ACTION_LABELS = {
  Shopping: "Start Shopping",
  Out_for_Delivery: "Start Delivery",
  Delivered: "Mark as Delivered",
};

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.errors?.[0] || data.error || data.message ||
        `Request failed (${response.status}).`
    );
  }
  return data;
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DeliveryStatusUpdate() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchOrder = useCallback(async (signal) => {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      signal,
      cache: "no-store",
    });
    return parseResponse(response);
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setOrder(null);
    setError("");
    setMessage("");

    fetchOrder(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOrder(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [fetchOrder]);

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setMessage("");
    try {
      setOrder(await fetchOrder());
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const currentStatus = order?.status || "Unknown";
  const currentIndex = ORDER_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "Cancelled";
  const isDelivered = currentStatus === "Delivered";
  const isAssigned = order?.helper_id != null;
  const nextStatus = NEXT_STATUS[currentStatus] || null;

  async function handleUpdateStatus() {
    if (!order || !isAssigned || !nextStatus || updating) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in as the assigned helper before updating this order.");
      return;
    }

    setUpdating(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      await parseResponse(response);
      // Refresh from the database instead of trusting a local status change.
      const updatedOrder = await fetchOrder();
      setOrder(updatedOrder);
      setMessage(`Order #${orderId} updated to ${STATUS_LABELS[updatedOrder.status] || updatedOrder.status}.`);
    } catch (err) {
      setError(err.message);
      // The server might have saved the change even if the follow-up GET failed.
      // Refresh before retrying so the next request uses the real status.
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="delivery-status-page">
      <header className="delivery-status-header">
        <h1>Grocery Link Helper</h1>
        <nav><Link to="/helper-dashboard">Helper Dashboard</Link></nav>
      </header>

      <main className="delivery-status-content">
        <div className="delivery-status-title">
          <p>Delivery Management</p>
          <h2>Delivery Status Update</h2>
          <span>Order #{orderId}</span>
        </div>

        {loading && (
          <section className="delivery-status-card">
            <p>Loading delivery information...</p>
          </section>
        )}

        {error && (
          <section className="delivery-status-card">
            <p className="delivery-status-error" role="alert">{error}</p>
          </section>
        )}

        {message && (
          <section className="delivery-status-card">
            <p className="delivery-status-note" role="status">{message}</p>
          </section>
        )}

        {!loading && order && (
          <>
            <section className="delivery-status-card">
              <div className="delivery-status-card-top">
                <div>
                  <h3>Order #{order.order_id}</h3>
                  <p>Current delivery information</p>
                </div>
                <button
                  type="button"
                  className="delivery-refresh-button"
                  onClick={handleRefresh}
                  disabled={refreshing || updating}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="delivery-status-info">
                <span>Order Status</span>
                <strong>{STATUS_LABELS[currentStatus] || currentStatus}</strong>
              </div>
              <div className="delivery-status-info">
                <span>Helper</span>
                <strong>{isAssigned ? `Helper #${order.helper_id}` : "Not assigned"}</strong>
              </div>
              <div className="delivery-status-info">
                <span>Delivery Time</span>
                <strong>{formatDate(order.delivery_slot)}</strong>
              </div>
              <div className="delivery-status-info">
                <span>Delivery Address</span>
                <strong>{order.delivery_address || "Not available"}</strong>
              </div>
            </section>

            <section className="delivery-status-card">
              <h3>Delivery Progress</h3>
              {isCancelled ? (
                <p className="delivery-status-error">This order has been cancelled.</p>
              ) : (
                <div className="delivery-progress-list">
                  {ORDER_STEPS.map((step, index) => {
                    const completed = currentIndex >= index;
                    const active = currentStatus === step;
                    return (
                      <div
                        className={`delivery-progress-step ${completed ? "completed" : ""} ${active ? "active" : ""}`}
                        key={step}
                      >
                        <span className="delivery-step-circle">
                          {completed ? "✓" : index + 1}
                        </span>
                        <div>
                          <strong>{STATUS_LABELS[step]}</strong>
                          {active && <p>Current status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="delivery-status-card">
              <h3>Update Delivery Status</h3>
              {!isAssigned ? (
                <p className="delivery-status-note">
                  A helper must claim this order before updating its delivery status.
                </p>
              ) : isCancelled ? (
                <p className="delivery-status-note">Cancelled orders cannot be updated.</p>
              ) : isDelivered ? (
                <p className="delivery-status-note">Delivery Completed! This order has already been delivered.</p>
              ) : nextStatus ? (
                <>
                  <label className="delivery-status-label" htmlFor="next-delivery-status">
                    Next Status
                  </label>
                  <select
                    id="next-delivery-status"
                    className="delivery-status-select"
                    value={nextStatus}
                    disabled
                    readOnly
                  >
                    <option value={nextStatus}>{STATUS_LABELS[nextStatus]}</option>
                  </select>
                  <p className="delivery-status-note">
                    Only the assigned helper can move this order to the next status.
                  </p>
                  <button
                    type="button"
                    className="delivery-update-button"
                    onClick={handleUpdateStatus}
                    disabled={updating || refreshing}
                  >
                    {updating ? "Updating..." : ACTION_LABELS[nextStatus]}
                  </button>
                </>
              ) : (
                <p className="delivery-status-note">
                  This order is not ready for a helper status update.
                </p>
              )}
            </section>
          </>
        )}

        <div className="delivery-status-actions">
          <Link to={`/helper/orders/${orderId}`} className="delivery-back-button">
            Back to Order Details
          </Link>
          <Link to="/helper-dashboard" className="delivery-back-button">
            Helper Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default DeliveryStatusUpdate;
