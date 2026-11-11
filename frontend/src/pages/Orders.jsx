
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Orders.css";

import {
  formatOrderStatus,
  formatPaymentStatus,
} from "../constants/orderStatus";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

// Get saved orders from localStorage
function getSavedOrders() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("orders") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Check if an order has a real backend ID
function hasBackendOrderId(order) {
  if (order.order_id == null) {
    return false;
  }

  const id = Number(order.order_id);

  return Number.isSafeInteger(id) && id > 0;
}

// Get latest order status from backend
async function fetchStatus(orderId, signal) {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
      {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        signal,
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return data.status || null;
  } catch {
    return null;
  }
}

// Save updated statuses
function saveStatuses(statuses) {
  const updated = getSavedOrders().map((order) => {
    const id = order.order_id ?? order.id;

    return statuses[id]
      ? { ...order, status: statuses[id] }
      : order;
  });

  localStorage.setItem(
    "orders",
    JSON.stringify(updated)
  );
}

// Format delivery date
function formatDelivery(slot) {
  if (!slot) return "Not selected";

  const date = new Date(slot);

  if (Number.isNaN(date.getTime())) {
    return String(slot).replace("T", " ");
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

function Orders() {
  // Load saved orders
  const [orders] = useState(() =>
    getSavedOrders().reverse()
  );

  const [statuses, setStatuses] = useState({});

  // Fetch latest statuses for real backend orders
  useEffect(() => {
    const controller = new AbortController();

    const ids = orders
      .filter(hasBackendOrderId)
      .map((order) => order.order_id);

    Promise.all(
      ids.map((id) =>
        fetchStatus(id, controller.signal)
      )
    ).then((results) => {
      if (controller.signal.aborted) return;

      const fresh = {};

      ids.forEach((id, index) => {
        if (results[index]) {
          fresh[id] = results[index];
        }
      });

      setStatuses(fresh);
      saveStatuses(fresh);
    });

    return () => controller.abort();
  }, [orders]);

  // Display order status
  function getStatus(order) {
    const id = order.order_id ?? order.id;

    return formatOrderStatus(
      statuses[id] || order.status,
      "Order Placed"
    );
  }

  return (
    <div className="orders-page">
      {/* Header */}
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

          <Link to="/notifications">
            🔔 Notifications
          </Link>
        </nav>
      </header>

      <main className="orders-content">
        {/* Page Title */}
        <div className="orders-title">
          <p>Order History</p>

          <h2>My Orders</h2>

          <span>
            View your previous grocery orders,
            repeat an order, or rate a delivery.
          </span>
        </div>

        {/* Empty Order History */}
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
          /* Order History List */
          <div className="orders-list">
            {orders.map((order) => {
              const id =
                order.order_id ?? order.id;

              const currentStatus =
                statuses[id] || order.status;

              const isDelivered =
                currentStatus === "Delivered";

              const canOpenRating =
                hasBackendOrderId(order) &&
                isDelivered;

              return (
                <div
                  className="order-card"
                  key={id}
                >
                  {/* Order Header */}
                  <div className="order-card-header">
                    <div>
                      <span>Order</span>

                      <h3>#{id}</h3>
                    </div>

                    <span className="order-status">
                      {getStatus(order)}
                    </span>
                  </div>

                  {/* Order Information */}
                  <div className="order-information">
                    {/* Store */}
                    <div>
                      <span>Store</span>

                      <strong>
                        {order.store?.name ||
                          order.store?.store_name ||
                          "Not available"}
                      </strong>
                    </div>

                    {/* Items */}
                    <div>
                      <span>Items</span>

                      <strong>
                        {order.items?.length || 0}
                      </strong>
                    </div>

                    {/* Delivery */}
                    <div>
                      <span>Delivery</span>

                      <strong>
                        {formatDelivery(
                          order.deliverySlot ??
                            order.delivery_slot
                        )}
                      </strong>
                    </div>

                    {/* Payment */}
                    <div>
                      <span>Payment</span>

                      <strong className="paid-status">
                        {formatPaymentStatus(
                          order.paymentStatus ??
                            order.payment
                              ?.payment_status
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="order-card-actions">
                    {/* View Details */}
                    <Link
                      to={`/order-details/${id}`}
                      className="view-details-button"
                    >
                      View Details
                    </Link>

                    {/* Repeat Order */}
                    <Link
                      to={`/orders/${id}/repeat`}
                      className="repeat-order-button"
                    >
                      Repeat Order
                    </Link>

                    {/* Rating & Feedback */}
                    {canOpenRating && (
                      <Link
                        to={`/orders/${id}/rate`}
                        className="view-details-button"
                      >
                        ⭐ Rate Delivery
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;
