import AppHeader from '../components/AppHeader';
import { api } from '../lib/api';

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./DeliveryNotifications.css";



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

  const [loading, setLoading] = useState(validUser);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check order statuses from backend
  useEffect(() => {
    if (!validUser) return;

    const controller = new AbortController();
    let isChecking = false;

    async function checkOrders() {
      if (isChecking) return;

      isChecking = true;

      try {
        const [ordersData, alertsData] = await Promise.all([
          api('/orders', { signal: controller.signal, cache: 'no-store' }),
          api('/notifications', { signal: controller.signal, cache: 'no-store' }),
        ]);
        if (controller.signal.aborted) return;

        // Load existing notifications
        const existing = readJSON(storageKey, []);

        // Drop cached entries for orders the server no longer has (for
        // example after the database was cleaned), so they don't linger.
        const serverOrderIds = new Set(
          ordersData.orders.map(order => String(order.order_id))
        );

        const updated = Array.isArray(existing)
          ? existing.filter(item =>
              !item.notificationId && serverOrderIds.has(String(item.orderId)))
          : [];

        // Create notifications for current statuses
        for (const order of ordersData.orders) {
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

        for (const alert of alertsData.notifications) {
          updated.push({
            id: `delay:${alert.notification_id}`,
            notificationId: alert.notification_id,
            orderId: alert.order_id,
            title: 'Delivery Delayed',
            message: 'Your delivery is taking longer than scheduled. Open tracking for the latest update.',
            detectedAt: alert.created_at,
            read: Boolean(alert.read_at),
          });
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

        setError('');
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
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

  async function markAsRead(id) {
    if (updating) return;
    setUpdating(true);
    try {
      const notification = notifications.find(item => item.id === id);
      if (notification?.notificationId) await api(`/notifications/${notification.notificationId}/read`, { method: 'PATCH' });
      saveNotifications(previous => previous.map(item => item.id === id ? { ...item, read: true } : item));
      setRefreshKey(previous => previous + 1);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setUpdating(false); }
  }

  async function markAllAsRead() {
    if (updating) return;
    setUpdating(true);
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      saveNotifications(previous => previous.map(item => ({ ...item, read: true })));
      setRefreshKey(previous => previous + 1);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setUpdating(false); }
  }

  // Count unread notifications
  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  return (
    <div className="notifications-page">
      {/* Header */}
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="notifications-content">
        {/* Page Title */}
        <div className="notifications-title">
          <p>Delivery Updates</p>

          <h1>Notifications</h1>

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
              disabled={updating || unreadCount === 0}
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

            {/* Empty Notifications */}
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="empty-icon">
                  🔔
                </div>

                <h2>No notifications yet</h2>

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
                      <h2>{item.title}</h2>

                      <p>{item.message}</p>

                      <small>
                        Order #{item.orderId} ·
                        Detected{" "}
                        {new Date(
                          item.detectedAt
                        ).toLocaleString("en-CA")}
                      </small>

                      {/* Notification Actions */}
                      <div className="notification-actions">
                        <Link
                          to={`/orders/${item.orderId}/tracking`}
                        >
                          Track Order
                        </Link>

                        {!item.read && (
                          <button
                            type="button"
                            disabled={updating}
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
