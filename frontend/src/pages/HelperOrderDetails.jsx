
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
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.errors?.[0] ||
              "Failed to load order details."
          );
        }

        if (controller.signal.aborted) return;

        setOrder(data);

        const storesResponse = await fetch(
          `${API_BASE}/api/stores`,
          { signal: controller.signal }
        );

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();

          const store = storesData.stores?.find(
            (item) =>
              Number(item.store_id) ===
              Number(data.store_id)
          );

          if (!controller.signal.aborted) {
            setStoreName(store?.store_name || "");
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
            "Failed to claim this order."
        );
      }

      setMessage("Order claimed successfully!");

      setOrder((previous) => ({
        ...previous,
        status: "Assigned",
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

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
      <header className="order-details-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/helper-dashboard">
            Helper Dashboard
          </Link>
        </nav>
      </header>

      <main className="order-details-content">
        <div className="order-details-title">
          <h2>Helper Order Details</h2>
          <span>
            View and manage delivery information.
          </span>
        </div>

        {loading && (
          <section className="order-details-card">
            <p>Loading order details...</p>
          </section>
        )}

        {error && (
          <section className="order-details-card">
            <p style={{ color: "red" }}>{error}</p>
          </section>
        )}

        {message && (
          <section className="order-details-card">
            <p style={{ color: "green" }}>{message}</p>
          </section>
        )}

        {!loading && order && (
          <>
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
                <strong>#{order.customer_id}</strong>
              </div>

              <div className="order-info-row">
                <span>Order Date</span>
                <strong>
                  {formatDate(order.created_at)}
                </strong>
              </div>
            </section>

            <section className="order-details-card">
              <h3>Grocery Items</h3>

              {order.items?.map((item) => (
                <div
                  className="order-info-row"
                  key={item.item_id}
                >
                  <span>{item.item_name}</span>
                  <strong>
                    Quantity: {item.quantity}
                  </strong>
                </div>
              ))}
            </section>

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

            <section className="order-details-card">
              <h3>Delivery</h3>

              <div className="order-info-row">
                <span>Delivery Address</span>
                <strong>
                  {order.delivery_address}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Delivery Time</span>
                <strong>
                  {formatDate(order.delivery_slot)}
                </strong>
              </div>
            </section>

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

            {order.status === "Paid" &&
              order.helper_id == null && (
                <section className="order-details-card">
                  <h3>Available Delivery</h3>

                  <p>
                    This order is available for a
                    helper to claim.
                  </p>

                  <button
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
          </>
        )}

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
