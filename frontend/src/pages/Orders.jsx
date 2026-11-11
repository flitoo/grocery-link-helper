import { api } from '../lib/api';
import AppHeader from '../components/AppHeader';

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Orders.css";

import {
  formatOrderStatus,
  formatPaymentStatus,
} from "../constants/orderStatus";



function hasBackendOrderId(order) {
  return Number.isSafeInteger(Number(order.order_id)) && Number(order.order_id) > 0;
}

// Format delivery date
function formatDelivery(slot) {
  if (!slot) return "Not selected";

  const date = new Date(slot);

  if (Number.isNaN(date.getTime())) {
    return String(slot).replace("T", " ");
  }

  return date.toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api('/orders', { signal: controller.signal, cache: 'no-store' })
      .then(data => { if (!controller.signal.aborted) setOrders(data.orders); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  // Display order status
  function getStatus(order) {
    return formatOrderStatus(
      order.status,
      "Order Placed"
    );
  }

  return (
    <div className="orders-page">
      {/* Header */}
      <AppHeader />

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
        {loading ? <p role="status">Loading orders...</p> : error ? <p className="app-error" role="alert">{error}</p> : orders.length === 0 ? (
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
                order.status;

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
                        {order.store_name || order.store?.name ||
                          order.store?.store_name ||
                          "Not available"}
                      </strong>
                    </div>

                    {/* Items */}
                    <div>
                      <span>Items</span>

                      <strong>
                        {order.item_count ?? order.items?.length ?? 0}
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
                          order.payment_status ?? order.paymentStatus ??
                            order.payment
                              ?.payment_status
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="order-card-actions">
                    <Link to={`/orders/${id}/tracking`} className="view-details-button">Track Order</Link>
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
