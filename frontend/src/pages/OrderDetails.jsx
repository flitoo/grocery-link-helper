import { Link } from "react-router-dom";
import "./OrderDetails.css";

function OrderDetails() {
  const getSavedOrder = () => {
    try {
      const savedOrder =
        localStorage.getItem("currentOrder");

      if (!savedOrder) {
        return null;
      }

      return JSON.parse(savedOrder);
    } catch (error) {
      console.error(
        "Could not load current order:",
        error
      );

      return null;
    }
  };

  const order = getSavedOrder();

  const formatDelivery = (slot) => {
    if (!slot) {
      return "Not available";
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

  const formatOrderDate = (dateString) => {
    if (!dateString) {
      return "Not available";
    }

    const date = new Date(dateString);

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
    <div className="order-details-page">
      <header className="order-details-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/grocery-list">
            Grocery List
          </Link>
        </nav>
      </header>

      <main className="order-details-content">
        <div className="order-details-title">
          <p>Order</p>

          <h2>Order Details</h2>

          <span>
            View your order information and delivery details.
          </span>
        </div>

        {!order ? (
          <section className="order-details-card">
            <div className="no-order">
              <h3>No Order Found</h3>

              <p>
                There is no recent order available.
              </p>

              <Link
                to="/dashboard"
                className="order-dashboard-button"
              >
                Back to Dashboard
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Order Information */}
            <section className="order-details-card">
              <div className="order-top">
                <div>
                  <span>Order Number</span>

                  <h3>#{order.id}</h3>
                </div>

                <div className="order-status">
                  {order.orderStatus}
                </div>
              </div>

              <div className="order-info-row">
                <span>Order Date</span>

                <strong>
                  {formatOrderDate(
                    order.createdAt
                  )}
                </strong>
              </div>
            </section>

            {/* Grocery Items */}
            <section className="order-details-card">
              <h3>Grocery Items</h3>

              {order.items?.map((item) => (
                <div
                  className="order-info-row"
                  key={item.id}
                >
                  <span>{item.name}</span>

                  <strong>
                    Quantity: {item.quantity}
                  </strong>
                </div>
              ))}
            </section>

            {/* Store */}
            <section className="order-details-card">
              <h3>Store</h3>

              <div className="order-info-row">
                <span>Selected Store</span>

                <strong>
                  {order.store?.name ||
                    order.store?.store_name ||
                    "Not available"}
                </strong>
              </div>

              {order.store?.address && (
                <div className="order-info-row">
                  <span>Address</span>

                  <strong>
                    {order.store.address}
                  </strong>
                </div>
              )}
            </section>

            {/* Delivery */}
            <section className="order-details-card">
              <h3>Delivery</h3>

              <div className="order-info-row">
                <span>
                  Delivery Date & Time
                </span>

                <strong>
                  {formatDelivery(
                    order.deliverySlot
                  )}
                </strong>
              </div>
            </section>

            {/* Payment */}
            <section className="order-details-card">
              <h3>Payment</h3>

              <div className="order-info-row">
                <span>Payment Method</span>

                <strong>
                  {order.paymentMethod}
                </strong>
              </div>

              <div className="order-info-row">
                <span>Payment Status</span>

                <strong className="paid-status">
                  {order.paymentStatus}
                </strong>
              </div>
            </section>

            <div className="order-details-actions">
              <Link
                to="/dashboard"
                className="order-dashboard-button"
              >
                Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default OrderDetails;