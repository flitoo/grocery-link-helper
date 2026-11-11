import AppHeader from '../components/AppHeader';
import { API_BASE } from '../lib/api';

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./OrderDetails.css";



// Read data from localStorage
function readJSON(key, fallback) {
  try {
    return (
      JSON.parse(localStorage.getItem(key) || "null") ??
      fallback
    );
  } catch {
    return fallback;
  }
}

// Find a locally saved order
function getLocalOrder(id) {
  const savedOrders = readJSON("orders", []);

  const candidates = [
    readJSON("currentOrder", null),
    ...(Array.isArray(savedOrders) ? savedOrders : []),
  ];

  return (
    candidates.find(
      (order) =>
        String(
          order?.order_id ??
            order?.id ??
            order?.orderId
        ) === String(id)
    ) || null
  );
}

// Format date
function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function OrderDetails() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load order details from backend
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setOrder(null);
      setStore(null);
      setPayment(null);

      const token = localStorage.getItem("token");

      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      try {
        const response = await fetch(
          `${API_BASE}/api/orders/${encodeURIComponent(
            orderId
          )}`,
          { headers }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.errors?.[0] ||
              data?.error ||
              `Could not load order (${response.status}).`
          );
        }

        if (!active) return;

        setOrder(data);

        // Load store and payment information
        const [storesResult, paymentResult] =
          await Promise.allSettled([
            fetch(`${API_BASE}/api/stores`, {
              headers,
            }).then(async (response) =>
              response.ok ? response.json() : null
            ),

            fetch(
              `${API_BASE}/api/payments/${encodeURIComponent(
                orderId
              )}`,
              { headers }
            ).then(async (response) =>
              response.ok ? response.json() : null
            ),
          ]);

        if (!active) return;

        // Find selected store
        if (storesResult.status === "fulfilled") {
          const result = storesResult.value;

          const stores = Array.isArray(result)
            ? result
            : result?.stores ?? result?.data ?? [];

          if (Array.isArray(stores)) {
            const selectedStore = stores.find(
              (store) =>
                String(store.store_id ?? store.id) ===
                String(data.store_id)
            );

            setStore(selectedStore || null);
          }
        }

        // Set payment
        if (paymentResult.status === "fulfilled") {
          setPayment(paymentResult.value);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load order."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [orderId]);

  // Order information
  const local = getLocalOrder(orderId);

  const localStore =
    local?.store ?? local?.selectedStore;

  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  const storeName =
    store?.store_name ??
    store?.name ??
    (String(
      local?.store_id ??
        localStore?.store_id ??
        localStore?.id
    ) === String(order?.store_id)
      ? localStore?.name ?? localStore?.store_name
      : null) ??
    (order?.store_id
      ? `Store #${order.store_id}`
      : "Not available");

  const storeAddress =
    store?.address ??
    (String(
      localStore?.store_id ?? localStore?.id
    ) === String(order?.store_id)
      ? localStore?.address
      : null);

  const status = order?.status ?? "Not available";

  const paymentStatus =
    payment?.payment_status ?? "Not available";

  const paymentMethod =
    payment?.payment_method === "debit"
      ? "Debit Card"
      : payment?.payment_method === "credit"
        ? "Credit Card"
        : "Not recorded";

  const total =
    order?.total_amount != null
      ? Number(order.total_amount)
      : null;

  return (
    <div className="order-details-page">
      {/* Header */}
      <AppHeader />

      <main className="order-details-content">
        {/* Page Title */}
        <div className="order-details-title">
          <p>Order #{orderId}</p>

          <h2>Order Details</h2>

          <span>
            View your order information and
            delivery details.
          </span>
        </div>

        {loading ? (
          <section className="order-details-card">
            <p>Loading order details...</p>
          </section>
        ) : error ? (
          <section className="order-details-card">
            <h3>Unable to load order</h3>

            <p role="alert">{error}</p>

            <Link to="/orders">
              Back to Orders
            </Link>
          </section>
        ) : order ? (
          <>
            {/* Order Information */}
            <section className="order-details-card">
              <div className="order-top">
                <div>
                  <span>Order Number</span>

                  <h3>
                    #{order.order_id ?? orderId}
                  </h3>
                </div>

                <div className="order-status">
                  {String(status).replaceAll(
                    "_",
                    " "
                  )}
                </div>
              </div>

              <div className="order-info-row">
                <span>Order Date</span>

                <strong>
                  {formatDate(order.created_at)}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Assigned Helper</span>

                <strong>
                  {order.helper_id != null
                    ? order.helper_name ||
                      `Helper #${order.helper_id}`
                    : "Not assigned"}
                </strong>
              </div>
            </section>

            {/* Grocery Items */}
            <section className="order-details-card">
              <h3>Grocery Items</h3>

              {items.length > 0 ? (
                items.map((item, index) => (
                  <div
                    className="order-info-row"
                    key={item.item_id ?? index}
                  >
                    <span>
                      {item.item_name ??
                        item.name ??
                        "Item"}
                    </span>

                    <strong>
                      Quantity: {item.quantity ?? 1}

                      {item.estimated_price != null
                        ? ` · $${Number(
                            item.estimated_price
                          ).toFixed(2)} each`
                        : ""}
                    </strong>
                  </div>
                ))
              ) : (
                <p>No grocery items available.</p>
              )}

              {total !== null &&
                Number.isFinite(total) && (
                  <div className="order-info-row">
                    <span>Total Amount</span>

                    <strong>
                      ${total.toFixed(2)}
                    </strong>
                  </div>
                )}
            </section>

            {/* Store */}
            <section className="order-details-card">
              <h3>Store</h3>

              <div className="order-info-row">
                <span>Selected Store</span>

                <strong>{storeName}</strong>
              </div>

              {storeAddress && (
                <div className="order-info-row">
                  <span>Store Address</span>

                  <strong>{storeAddress}</strong>
                </div>
              )}
            </section>

            {/* Delivery */}
            <section className="order-details-card">
              <h3>Delivery</h3>

              <div className="order-info-row">
                <span>
                  Delivery Date &amp; Time
                </span>

                <strong>
                  {formatDate(order.delivery_slot)}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Delivery Address</span>

                <strong>
                  {order.delivery_address ||
                    "Not available"}
                </strong>
              </div>
            </section>

            {/* Payment */}
            <section className="order-details-card">
              <h3>Payment</h3>

              <div className="order-info-row">
                <span>Payment Status</span>

                <strong
                  className={
                    paymentStatus === "Verified"
                      ? "paid-status"
                      : ""
                  }
                >
                  {paymentStatus === "Verified"
                    ? "Paid"
                    : paymentStatus}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Payment Method</span>

                <strong>{paymentMethod}</strong>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="order-details-actions">
              <Link to={`/orders/${orderId}/tracking`} className="order-dashboard-button">Track Order</Link>
              <Link to={`/orders/${orderId}/substitutions`} className="order-dashboard-button">Substitution Requests</Link>
              <Link
                to="/orders"
                className="order-dashboard-button"
              >
                Back to Orders
              </Link>

              <Link
                to={`/orders/${orderId}/chat`}
                className="order-dashboard-button"
              >
                Order Chat
              </Link>

              <Link
                to="/dashboard"
                className="order-dashboard-button"
              >
                Back to Dashboard
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default OrderDetails;
