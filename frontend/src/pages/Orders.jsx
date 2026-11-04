import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Orders.css";
import { formatOrderStatus, formatPaymentStatus } from "../constants/orderStatus";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getSavedOrders() {
  try {
    const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    return Array.isArray(savedOrders) ? savedOrders : [];
  } catch (error) {
    console.error("Could not load orders:", error);
    return [];
  }
}

// Fetches the current status of one order; null if it can't be loaded.
async function fetchStatus(orderId, signal) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.status || null;
  } catch {
    return null;
  }
}

// Saves fresh statuses so other screens (e.g. the dashboard) show them too.
function saveStatuses(statuses) {
  const updated = getSavedOrders().map((order) => {
    const status = statuses[order.order_id ?? order.id];
    return status ? { ...order, status } : order;
  });
  localStorage.setItem("orders", JSON.stringify(updated));
}

function Orders() {
  const [orders] = useState(() => getSavedOrders().reverse());
  // Live statuses from the backend, keyed by order id. The saved copy is
  // only a snapshot from payment time, so it would stay "Paid" forever.
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const ids = orders.map((order) => order.order_id ?? order.id).filter(Boolean);

    Promise.all(ids.map((id) => fetchStatus(id, controller.signal))).then((results) => {
      if (controller.signal.aborted) return;
      const fresh = {};
      ids.forEach((id, index) => {
        if (results[index]) fresh[id] = results[index];
      });
      setStatuses(fresh);
      saveStatuses(fresh);
    });

    return () => controller.abort();
  }, [orders]);

  const getStatus = (order) => {
    const status = statuses[order.order_id ?? order.id] || order.status;
    return formatOrderStatus(status, "Order Placed");
  };

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

  return (
    <div className="orders-page">
      <header className="orders-header">
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

      <main className="orders-content">
        <div className="orders-title">
          <p>Order History</p>

          <h2>My Orders</h2>

          <span>
            View your previous grocery orders.
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="orders-empty">
            <div className="orders-empty-icon">
              📦
            </div>

            <h3>No orders yet</h3>

            <p>
              Your completed orders will appear
              here after payment.
            </p>

            <Link
              to="/grocery-list"
              className="orders-start-button"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div
                className="order-card"
                key={order.id}
              >
                <div className="order-card-header">
                  <div>
                    <span>Order</span>

                    <h3>
                      #{order.id}
                    </h3>
                  </div>

                  <span className="order-status">
                    {getStatus(order)}
                  </span>
                </div>

                <div className="order-information">
                  <div>
                    <span>Store</span>

                    <strong>
                      {order.store?.name ||
                        order.store?.store_name ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Items</span>

                    <strong>
                      {order.items?.length || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Delivery</span>

                    <strong>
                      {formatDelivery(
                        order.deliverySlot
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Payment</span>

                    <strong className="paid-status">
                      {formatPaymentStatus(
                        order.paymentStatus ?? order.payment?.payment_status
                      )}
                    </strong>
                  </div>
                </div>

                <div className="order-card-actions">
                  <Link
                    to={`/order-details/${order.id}`}
                    className="view-details-button"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;