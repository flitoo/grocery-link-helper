
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./OrderDetails.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function HelperOrderDetails() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Load order details from backend
  useEffect(() => {
    const controller = new AbortController();

    async function loadOrder() {
      setLoading(true);
      setError("");
      setMessage("");
      setOrder(null);
      setStoreName("");

      try {
        const response = await fetch(
          `${API_BASE}/api/orders/${orderId}`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.errors?.[0] ||
              data.error ||
              "Failed to load order details."
          );
        }

        if (controller.signal.aborted) return;

        setOrder(data);

        // Load store information
        const storesResponse = await fetch(
          `${API_BASE}/api/stores`,
          {
            signal: controller.signal,
          }
        );

        if (storesResponse.ok) {
          const storesData =
            await storesResponse.json();

          const stores = Array.isArray(storesData)
            ? storesData
            : storesData.stores || [];

          const store = stores.find(
            (item) =>
              Number(item.store_id) ===
              Number(data.store_id)
          );

          if (!controller.signal.aborted) {
            setStoreName(
              store?.store_name || ""
            );
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => controller.abort();
  }, [orderId]);

  // Claim an available order
  async function handleClaimOrder() {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in as a helper first.");
      return;
    }

    setClaiming(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/deliveries/${orderId}/claim`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.errors?.[0] ||
            data.error ||
            "Failed to claim this order."
        );
      }

      setMessage("Order claimed successfully!");

      // Refresh order details after claiming
      const updatedResponse = await fetch(
        `${API_BASE}/api/orders/${orderId}`
      );

      if (updatedResponse.ok) {
        const updatedOrder =
          await updatedResponse.json();

        setOrder(updatedOrder);
      } else {
        setMessage(
          "Order claimed. Refresh the page to view updated details."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  // Format date and time
  function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="order-details-page">
      {/* Header */}
      <header className="order-details-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/helper-dashboard">
            Helper Dashboard
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="order-details-content">
        <div className="order-details-title">
          <h2>Helper Order Details</h2>

          <span>
            View and manage delivery information.
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <section className="order-details-card">
            <p>Loading order details...</p>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="order-details-card">
            <p style={{ color: "red" }}>
              {error}
            </p>
          </section>
        )}

        {/* Success Message */}
        {message && (
          <section className="order-details-card">
            <p style={{ color: "green" }}>
              {message}
            </p>
          </section>
        )}

        {/* Order Details */}
        {!loading && order && (
          <>
            {/* Order Information */}
            <section className="order-details-card">
              <div className="order-top">
                <div>
                  <span>Order Number</span>

                  <h3>#{order.order_id}</h3>
                </div>

                <div className="order-status">
                  {order.status}
                </div>
              </div>

              <div className="order-info-row">
                <span>Customer ID</span>

                <strong>
                  #{order.customer_id}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Order Date</span>

                <strong>
                  {formatDate(order.created_at)}
                </strong>
              </div>
            </section>

            {/* Grocery Items */}
            <section className="order-details-card">
              <h3>Grocery Items</h3>

              {order.items?.length > 0 ? (
                order.items.map((item, index) => (
                  <div
                    className="order-info-row"
                    key={item.item_id ?? index}
                  >
                    <span>
                      {item.item_name}
                    </span>

                    <strong>
                      Quantity: {item.quantity}
                    </strong>
                  </div>
                ))
              ) : (
                <p>
                  No grocery items available.
                </p>
              )}
            </section>

            {/* Store Information */}
            <section className="order-details-card">
              <h3>Store</h3>

              <div className="order-info-row">
                <span>Store Name</span>

                <strong>
                  {storeName ||
                    `Store #${order.store_id}`}
                </strong>
              </div>
            </section>

            {/* Delivery Information */}
            <section className="order-details-card">
              <h3>Delivery</h3>

              <div className="order-info-row">
                <span>Delivery Address</span>

                <strong>
                  {order.delivery_address ||
                    "Not available"}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Delivery Time</span>

                <strong>
                  {formatDate(order.delivery_slot)}
                </strong>
              </div>
            </section>

            {/* Order Total */}
            <section className="order-details-card">
              <h3>Order Total</h3>

              <div className="order-info-row">
                <span>Total Amount</span>

                <strong>
                  $
                  {Number(
                    order.total_amount || 0
                  ).toFixed(2)}
                </strong>
              </div>
            </section>

            {/* Claim Order */}
            {order.status === "Paid" &&
              order.helper_id == null && (
                <section className="order-details-card">
                  <h3>Available Delivery</h3>

                  <p>
                    This order is available for a
                    helper to claim.
                  </p>

                  <button
                    type="button"
                    onClick={handleClaimOrder}
                    disabled={claiming}
                    className="order-dashboard-button"
                  >
                    {claiming
                      ? "Claiming..."
                      : "Claim Order"}
                  </button>
                </section>
              )}

            {/* Delivery Management */}
            <section className="order-details-card">
              <h3>Delivery Management</h3>

              <p>
                View the delivery progress and
                manage the status of this order.
              </p>

              <div className="order-details-actions">
                <Link
                  to={`/helper/orders/${orderId}/status`}
                  className="order-dashboard-button"
                >
                  Update Delivery Status
                </Link>

                {/* Chat with Customer */}
                {order.helper_id != null && (
                  <Link
                    to={`/helper/orders/${orderId}/chat`}
                    className="order-dashboard-button"
                  >
                    Chat with Customer
                  </Link>
                )}
              </div>
            </section>
          </>
        )}

        {/* Back Button */}
        <div className="order-details-actions">
          <Link
            to="/helper-dashboard"
            className="order-dashboard-button"
          >
            Back to Helper Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default HelperOrderDetails;
