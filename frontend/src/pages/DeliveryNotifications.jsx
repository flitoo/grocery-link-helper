
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./DeliveryNotifications.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

// Notification messages for each delivery status
const MESSAGES = {
  Assigned: {
    title: "Helper Assigned",
    message: "A helper has accepted your order.",
  },
  Shopping: {
    title: "Shopping Started",
    message: "Your helper is shopping for your groceries.",
  },
  Out_for_Delivery: {
    title: "Out for Delivery",
    message: "Your order is on the way!",
  },
  Delivered: {
    title: "Order Delivered",
    message: "Your groceries have been delivered.",
  },
};

// Read data from localStorage
function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

// Get only real backend order IDs
function getOrderIds(userId) {
  const saved = readJSON("orders", []);
  const current = readJSON("currentOrder", null);

  const orders = [
    ...(Array.isArray(saved) ? saved : []),
    ...(current ? [current] : []),
  ];

  return [
    ...new Set(
      orders
        .filter((order) => {
          const customerId =
            order?.customer_id ?? order?.customerId;

          return (
            customerId == null ||
            Number(customerId) === userId
          );
        })
        // Only use order_id from backend
        .map((order) => Number(order?.order_id))
        .filter(
          (id) =>
            Number.isSafeInteger(id) && id > 0
        )
    ),
  ];
}

function DeliveryNotifications() {
  const user = readJSON("user", null);
  const userId = Number(user?.id ?? user?.user_id);

  const validUser =
    Number.isInteger(userId) && userId > 0;

  const storageKey = `deliveryNotifications:${userId}`;

  const [notifications, setNotifications] = useState(
    () => {
      if (!validUser) return [];

      const saved = readJSON(storageKey, []);
      return Array.isArray(saved) ? saved : [];
    }
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFoundCount, setNotFoundCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check order statuses from backend
  useEffect(() => {
    if (!validUser) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isChecking = false;

    async function checkOrders() {
      if (isChecking) return;

      isChecking = true;

      try {
        const ids = getOrderIds(userId);
        const token = localStorage.getItem("token");

        if (ids.length === 0) {
          setError("");
          setNotFoundCount(0);
          return;
        }

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const response = await fetch(
                `${API_BASE}/api/orders/${id}`,
                {
                  headers: token
                    ? {
                        Authorization: `Bearer ${token}`,
                      }
                    : {},
                  signal: controller.signal,
                  cache: "no-store",
                }
              );

              if (response.status === 404) {
                return {
                  type: "not-found",
                  id,
                };
              }

              if (!response.ok) {
                return {
                  type: "error",
                  id,
                  status: response.status,
                };
              }

              const order = await response.json();

              return {
                type: "success",
                order,
              };
            } catch {
              return {
                type: "network-error",
                id,
              };
            }
          })
        );

        if (controller.signal.aborted) return;

        // Load existing notifications
        const existing = readJSON(storageKey, []);

        const updated = Array.isArray(existing)
          ? [...existing]
          : [];

        // Create notifications for current statuses
        for (const result of results) {
          if (result.type !== "success") {
            continue;
          }

          const order = result.order;

          // Only show orders belonging to this customer
          if (Number(order.customer_id) !== userId) {
            continue;
          }

          const info = MESSAGES[order.status];

          if (!info) continue;

          const id =
            `${order.order_id}:${order.status}`;

          const alreadyExists = updated.some(
            (item) => item.id === id
          );

          if (!alreadyExists) {
            updated.unshift({
              id,
              orderId: order.order_id,
              title: info.title,
              message: info.message,
              detectedAt: new Date().toISOString(),
              read: false,
            });
          }
        }

        // Show newest notifications first
        updated.sort(
          (a, b) =>
            new Date(b.detectedAt) -
            new Date(a.detectedAt)
        );

        // Save notifications
        localStorage.setItem(
          storageKey,
          JSON.stringify(updated)
        );

        setNotifications(updated);

        // Count orders missing from backend
        const missing = results.filter(
          (result) => result.type === "not-found"
        );

        setNotFoundCount(missing.length);

        // Check actual request errors
        const failed = results.filter(
          (result) =>
            result.type === "error" ||
            result.type === "network-error"
        );

        if (failed.length > 0) {
          const unauthorized = failed.some(
            (result) =>
              result.status === 401 ||
              result.status === 403
          );

          const networkProblem = failed.some(
            (result) =>
              result.type === "network-error"
          );

          let message =
            `Could not check ${failed.length} order(s).`;

          if (unauthorized) {
            message +=
              " Please check your login session.";
          } else if (networkProblem) {
            message +=
              " Please check the backend connection.";
          } else {
            message +=
              " Please check the server response.";
          }

          setError(message);
        } else {
          setError("");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }

        isChecking = false;
      }
    }

    // Check immediately
    checkOrders();

    // Check every 15 seconds
    const interval = setInterval(
      checkOrders,
      15000
    );

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [refreshKey, storageKey, userId, validUser]);

  // Save notification changes
  function saveNotifications(updateFn) {
    setNotifications((previous) => {
      const updated = updateFn(previous);

      localStorage.setItem(
        storageKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  // Mark one notification as read
  function markAsRead(id) {
    saveNotifications((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, read: true }
          : item
      )
    );
  }

  // Mark all notifications as read
  function markAllAsRead() {
    saveNotifications((previous) =>
      previous.map((item) => ({
        ...item,
        read: true,
      }))
    );
  }

  // Count unread notifications
  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  return (
    <div className="notifications-page">
      {/* Header */}
      <header className="notifications-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/orders">
            Orders
          </Link>

          <Link to="/notifications">
            🔔 Notifications
          </Link>
        </nav>
      </header>

      <main className="notifications-content">
        {/* Page Title */}
        <div className="notifications-title">
          <p>Delivery Updates</p>

          <h2>Notifications</h2>

          <span>
            Stay updated on your grocery deliveries.
          </span>
        </div>

        {/* Toolbar */}
        <div className="notifications-toolbar">
          <strong>
            {unreadCount} unread notifications
          </strong>

          <div className="notifications-buttons">
            <button
              type="button"
              onClick={() =>
                setRefreshKey((n) => n + 1)
              }
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All as Read
            </button>
          </div>
        </div>

        {/* Login Check */}
        {!validUser ? (
          <div className="notifications-empty">
            Please log in to view notifications.
          </div>
        ) : loading ? (
          <div className="notifications-empty">
            Loading notifications...
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <p
                className="notifications-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Orders not found */}
            {notFoundCount > 0 && (
              <p className="notifications-info">
                {notFoundCount} saved order(s) were
                not found in the backend.
              </p>
            )}

            {/* Empty Notifications */}
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="empty-icon">
                  🔔
                </div>

                <h3>No notifications yet</h3>

                <p>
                  Delivery updates will appear
                  here when your order status
                  changes.
                </p>
              </div>
            ) : (
              /* Notification List */
              <div className="notifications-list">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-card ${
                      item.read ? "read" : "unread"
                    }`}
                  >
                    {/* Notification Icon */}
                    <div className="notification-icon">
                      🔔
                    </div>

                    {/* Notification Content */}
                    <div className="notification-body">
                      <h3>{item.title}</h3>

                      <p>{item.message}</p>

                      <small>
                        Order #{item.orderId} ·
                        First seen{" "}
                        {new Date(
                          item.detectedAt
                        ).toLocaleString("en-CA")}
                      </small>

                      {/* Notification Actions */}
                      <div className="notification-actions">
                        <Link
                          to={`/order-details/${item.orderId}`}
                        >
                          View Order
                        </Link>

                        {!item.read && (
                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(item.id)
                            }
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default DeliveryNotifications;
