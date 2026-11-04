import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HelperDashboard.css";
import { formatOrderStatus } from "../constants/orderStatus";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function fetchOrders(path, token, signal) {
  const response = await fetch(`${API_BASE}/api/orders/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.errors?.[0] || data.error || `Request failed (${response.status}).`);
  }
  return Array.isArray(data.orders) ? data.orders : [];
}

function formatDeliveryTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-CA", {
        timeZone: "America/Toronto",
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function OrderCard({ order, onOpen }) {
  return (
    <div className="helper-order-card">
      <h4>Order #{order.order_id}</h4>
      <p><strong>Store:</strong> {order.store_name || "Not available"}</p>
      <p><strong>Delivery Address:</strong> {order.delivery_address || "Not available"}</p>
      <p><strong>Delivery Time:</strong> {formatDeliveryTime(order.delivery_slot)}</p>
      <p><strong>Status:</strong> {formatOrderStatus(order.status)}</p>
      <button className="helper-details-button" onClick={() => onOpen(order.order_id)}>
        View Details
      </button>
    </div>
  );
}

function OrderSection({ title, orders, emptyText, onOpen }) {
  return (
    <section className="helper-orders">
      <h3>{title}</h3>
      {orders.length === 0 ? (
        <div className="helper-order-card">
          <p>{emptyText}</p>
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard key={order.order_id} order={order} onOpen={onOpen} />
        ))
      )}
    </section>
  );
}

function HelperDashboard() {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [token] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in as a helper to see orders.");

  // Bumped by Refresh to re-run the load effect.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      fetchOrders("assigned", token, signal),
      fetchOrders("available", token, signal),
    ])
      .then(([mine, open]) => {
        if (signal.aborted) return;
        setAssigned(mine);
        setAvailable(open);
        setError("");
      })
      .catch((err) => {
        if (!signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey]);

  function handleRefresh() {
    if (!token) return;
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  const openOrder = (orderId) => navigate(`/helper/orders/${orderId}`);

  return (
    <div className="helper-page">
      <header className="helper-header">
        <h1>Grocery Helper</h1>
        <nav>
          <button onClick={handleRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      <main className="helper-content">
        <h2>Helper Dashboard</h2>
        <p>Claim a paid order, then update its status as you shop and deliver.</p>

        {error && (
          <section className="helper-orders">
            <div className="helper-order-card">
              <p role="alert">{error}</p>
            </div>
          </section>
        )}

        {!error && (
          <>
            <OrderSection
              title="My Active Order"
              orders={assigned}
              emptyText="You have no active orders."
              onOpen={openOrder}
            />
            <OrderSection
              title="Available Orders"
              orders={available}
              emptyText="No orders are waiting for a helper."
              onOpen={openOrder}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default HelperDashboard;
