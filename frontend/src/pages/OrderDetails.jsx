import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./OrderDetails.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function getLocalOrder(id) {
  const candidates = [readJSON("currentOrder", null), ...(
    Array.isArray(readJSON("orders", [])) ? readJSON("orders", []) : []
  )];
  return candidates.find((o) => String(o?.order_id ?? o?.id ?? o?.orderId) === String(id)) || null;
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).replace("T", " ") : date.toLocaleString("en-CA", {
    year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setOrder(null);
      setStore(null);
      setPayment(null);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`, { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.errors?.[0] || data?.error || `Could not load order (${response.status}).`);
        if (!active) return;
        setOrder(data);
        // Store and payment are optional; the order itself is the source of truth.
        const [storesResult, paymentResult] = await Promise.allSettled([
          fetch(`${API_BASE}/api/stores`, { headers }).then(async r => r.ok ? r.json() : null),
          fetch(`${API_BASE}/api/payments/${encodeURIComponent(orderId)}`, { headers }).then(async r => r.ok ? r.json() : null),
        ]);
        if (!active) return;
        if (storesResult.status === "fulfilled") {
          const result = storesResult.value;
          const stores = Array.isArray(result) ? result : (result?.stores ?? result?.data ?? []);
          if (Array.isArray(stores)) setStore(stores.find(s => String(s.store_id ?? s.id) === String(data.store_id)) || null);
        }
        if (paymentResult.status === "fulfilled") setPayment(paymentResult.value);
      } catch (e) {
        if (active) setError(e.message || "Unable to load order.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [orderId]);

  const local = getLocalOrder(orderId);
  const localStore = local?.store ?? local?.selectedStore;
  const items = Array.isArray(order?.items) ? order.items : [];
  const storeName = store?.store_name ?? store?.name ?? (
    String(local?.store_id ?? localStore?.store_id ?? localStore?.id) === String(order?.store_id)
      ? localStore?.name ?? localStore?.store_name : null
  ) ?? (order?.store_id ? `Store #${order.store_id}` : "Not available");
  const storeAddress = store?.address ?? (String(localStore?.store_id ?? localStore?.id) === String(order?.store_id) ? localStore?.address : null);
  const status = order?.status ?? "Not available";
  const paymentStatus = payment?.payment_status ?? "Not available";
  const paymentMethod = payment?.payment_method === "debit" ? "Debit Card" : payment?.payment_method === "credit" ? "Credit Card" : "Not recorded";
  const total = Number(order?.total_amount);

  return (
    <div className="order-details-page">
      <header className="order-details-header">
        <h1>Grocery Link Helper</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
          <Link to="/orders">Orders</Link>
        </nav>
      </header>
      <main className="order-details-content">
        <div className="order-details-title">
          <p>Order #{orderId}</p>
          <h2>Order Details</h2>
          <span>View your order information and delivery details.</span>
        </div>
        {loading ? (
          <section className="order-details-card"><p>Loading order details...</p></section>
        ) : error ? (
          <section className="order-details-card"><h3>Unable to load order</h3><p role="alert">{error}</p><Link to="/orders">Back to Orders</Link></section>
        ) : order ? (
          <>
            <section className="order-details-card">
              <div className="order-top">
                <div><span>Order Number</span><h3>#{order.order_id ?? orderId}</h3></div>
                <div className="order-status">{status.replaceAll("_", " ")}</div>
              </div>
              <div className="order-info-row"><span>Order Date</span><strong>{formatDate(order.created_at)}</strong></div>
              <div className="order-info-row"><span>Assigned Helper</span><strong>{order.helper_id != null ? `Helper #${order.helper_id}` : "Not assigned"}</strong></div>
            </section>
            <section className="order-details-card">
              <h3>Grocery Items</h3>
              {items.length ? items.map((item, i) => (
                <div className="order-info-row" key={item.item_id ?? i}>
                  <span>{item.item_name ?? item.name ?? "Item"}</span>
                  <strong>Quantity: {item.quantity ?? 1}{item.estimated_price != null ? ` · $${Number(item.estimated_price).toFixed(2)} each` : ""}</strong>
                </div>
              )) : <p>No grocery items available.</p>}
              {Number.isFinite(total) && <div className="order-info-row"><span>Total Amount</span><strong>${total.toFixed(2)}</strong></div>}
            </section>
            <section className="order-details-card">
              <h3>Store</h3>
              <div className="order-info-row"><span>Selected Store</span><strong>{storeName}</strong></div>
              {storeAddress && <div className="order-info-row"><span>Store Address</span><strong>{storeAddress}</strong></div>}
            </section>
            <section className="order-details-card">
              <h3>Delivery</h3>
              <div className="order-info-row"><span>Delivery Date &amp; Time</span><strong>{formatDate(order.delivery_slot)}</strong></div>
              <div className="order-info-row"><span>Delivery Address</span><strong>{order.delivery_address || "Not available"}</strong></div>
            </section>
            <section className="order-details-card">
              <h3>Payment</h3>
              <div className="order-info-row"><span>Payment Status</span><strong className={paymentStatus === "Verified" ? "paid-status" : ""}>{paymentStatus === "Verified" ? "Paid" : paymentStatus}</strong></div>
              <div className="order-info-row"><span>Payment Method</span><strong>{paymentMethod}</strong></div>
            </section>
            <div className="order-details-actions">
              <Link to="/orders" className="order-dashboard-button">Back to Orders</Link>
              <Link to={`/orders/${orderId}/chat`} className="order-dashboard-button">Order Chat</Link>
              <Link to="/dashboard" className="order-dashboard-button">Back to Dashboard</Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default OrderDetails;
