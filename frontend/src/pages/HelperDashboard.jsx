import AppHeader from '../components/AppHeader';
import { api } from '../lib/api';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HelperDashboard.css";
import { formatOrderStatus } from "../constants/orderStatus";



async function fetchOrders(path, signal) {
  const data = await api(`/orders/${path}`, {
    signal,
    cache: "no-store",
  });
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
      {order.delivery_address && <p><strong>Delivery Address:</strong> {order.delivery_address}</p>}
      <p><strong>Delivery Time:</strong> {formatDeliveryTime(order.delivery_slot)}</p>
      <p><strong>Status:</strong> {formatOrderStatus(order.status)}</p>
      {order.completed_at && <p><strong>Completed:</strong> {formatDeliveryTime(order.completed_at)}</p>}
      {order.rating != null && <p><strong>Rating:</strong> {order.rating} / 5</p>}
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
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
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
      fetchOrders("assigned", signal),
      fetchOrders("available", signal),
      api('/helpers/stats', { signal }),
      api(`/helpers/history?page=${page}`, { signal }),
    ])
      .then(([mine, open, summary, past]) => {
        if (signal.aborted) return;
        setAssigned(mine);
        setAvailable(open);
        setStats(summary.stats);
        setHistory(past.orders);
        setHasMore(past.has_more);
        setError("");
      })
      .catch((err) => {
        if (!signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, reloadKey, page]);

  function handleRefresh() {
    if (!token) return;
    setLoading(true);
    setReloadKey((key) => key + 1);
  }


  const openOrder = (orderId) => navigate(`/helper/orders/${orderId}`);

  return (
    <div className="helper-page">
      <AppHeader helper><button onClick={handleRefresh} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button></AppHeader>

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
            {loading && <p role="status">Loading dashboard...</p>}
            {stats && <section className="helper-stats" aria-label="Helper statistics">
              <div className="app-card"><span>Active orders</span><strong>{stats.active_orders}</strong></div>
              <div className="app-card"><span>Completed deliveries</span><strong>{stats.completed_orders}</strong></div>
              <div className="app-card"><span>Cancelled orders</span><strong>{stats.cancelled_orders}</strong></div>
              <div className="app-card"><span>Average rating</span><strong>{stats.average_rating == null ? 'No ratings' : `${stats.average_rating} / 5`}</strong><small>{stats.rating_count} ratings</small></div>
            </section>}
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
            <OrderSection title="Delivery History" orders={history} emptyText="No completed or cancelled deliveries yet." onOpen={openOrder} />
            <div className="helper-pagination" aria-label="History pages">
              <button disabled={loading || page === 1} onClick={() => { setLoading(true); setPage(value => value - 1); }}>Previous</button>
              <span>Page {page}</span>
              <button disabled={loading || !hasMore} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Next</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default HelperDashboard;
