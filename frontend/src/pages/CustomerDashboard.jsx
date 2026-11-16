import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import AppHeader from '../components/AppHeader';

import { Link } from "react-router-dom";
import "./CustomerDashboard.css";
import { formatOrderStatus } from "../constants/orderStatus";

function CustomerDashboard() {
  const customerName = "Customer";

  const getSavedData = (key, fallback) => {
    try {
      const savedData = localStorage.getItem(key);

      if (!savedData) {
        return fallback;
      }

      return JSON.parse(savedData);
    } catch (error) {
      console.error(`Could not load ${key}:`, error);
      return fallback;
    }
  };

  // Get grocery items from localStorage
  const groceryItems = getSavedData("groceryItems", []);

  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api('/orders', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setOrders(data.orders); })
      .catch(err => { if (!controller.signal.aborted) setOrdersError(err.message); });
    return () => controller.abort();
  }, []);

  const groceryItemCount = Array.isArray(groceryItems)
    ? groceryItems.length
    : 0;

  const recentOrderCount = orders.length;

  // Show newest orders first
  const recentOrders = orders.slice(0, 3);


  return (
    <div className="dashboard-page">
      {/* Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="dashboard-content">
        {ordersError && <p className="app-error" role="alert">{ordersError}</p>}
        {/* Welcome */}
        <section className="welcome-section">
          <div>
            <p className="welcome-label">
              Welcome back!
            </p>

            <h1>
              Hello, {customerName} 👋
            </h1>

            <p className="welcome-text">
              Manage your grocery list and keep
              track of your orders.
            </p>
          </div>

          <Link
            to="/grocery-list"
            className="primary-button"
          >
            + Add Grocery Item
          </Link>
        </section>

        {/* Dashboard Cards */}
        <section className="dashboard-cards">
          {/* Grocery List */}
          <div className="dashboard-card">
            <div className="card-icon">
              🛒
            </div>

            <div className="card-content">
              <p>Grocery List</p>

              <h2>{groceryItemCount}</h2>

              <span>
                Items in your list
              </span>
            </div>

            <Link
              to="/grocery-list"
              className="card-button"
            >
              View Grocery List
            </Link>
          </div>

          {/* Recent Orders */}
          <div className="dashboard-card">
            <div className="card-icon">
              📦
            </div>

            <div className="card-content">
              <p>Recent Orders</p>

              <h2>{recentOrderCount}</h2>

              <span>
                Orders placed
              </span>
            </div>

            <Link
              to="/orders"
              className="card-button"
            >
              View Orders
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <div className="section-heading">
            <p>Quick Actions</p>

            <h2>
              What would you like to do?
            </h2>
          </div>

          <div className="action-grid">
            <Link
              to="/grocery-list"
              className="action-card"
            >
              <span className="action-icon">
                🛒
              </span>

              <div>
                <h3>
                  Manage Grocery List
                </h3>

                <p>
                  Add or remove grocery items.
                </p>
              </div>
            </Link>

            <Link
              to="/orders"
              className="action-card"
            >
              <span className="action-icon">
                📋
              </span>

              <div>
                <h3>View Orders</h3>

                <p>
                  Check your previous orders.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Order History */}
        <section className="orders-section">
          <div className="section-heading">
            <p>Order History</p>

            <h2>Recent Orders</h2>
          </div>

          {recentOrders.length === 0 ? (
            <div className="empty-orders">
              <div className="empty-icon">
                📦
              </div>

              <h3>No recent orders</h3>

              <p>
                Your recent grocery orders will
                appear here.
              </p>
            </div>
          ) : (
            <div className="dashboard-order-list">
              {recentOrders.map((order, index) => {
                const orderId =
                  order.order_id ?? order.id;

                return (
                  <div
                    className="dashboard-order-item"
                    key={orderId ?? index}
                  >
                    {/* Order Information */}
                    <div>
                      <h3>
                        Order #{orderId ?? "Unknown"}
                      </h3>

                      <p>
                        {order.store?.name ||
                          order.store?.store_name ||
                          order.store_name ||
                          "Store"}
                      </p>
                    </div>

                    {/* Order Status */}
                    <div>
                      <strong>
                        {formatOrderStatus(order.status)}
                      </strong>

                      <p>
                        {(order.delivery_slot ?? order.deliverySlot)
                          ? String(
                              order.delivery_slot ?? order.deliverySlot
                            ).replace("T", " ")
                          : ""}
                      </p>
                    </div>

                    {/* Order Actions */}
                    <div>
                      <Link
                        to={`/order-details/${orderId}`}
                        className="card-button"
                      >
                        View Details
                      </Link>

                      <Link
                        to={`/orders/${orderId}/chat`}
                        className="card-button"
                      >
                        Chat with Helper
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CustomerDashboard;
