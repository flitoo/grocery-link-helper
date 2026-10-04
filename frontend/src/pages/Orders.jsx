import { Link } from "react-router-dom";
import "./Orders.css";

function Orders() {
  const getOrders = () => {
    try {
      const savedOrders =
        localStorage.getItem("orders");

      if (!savedOrders) {
        return [];
      }

      return JSON.parse(savedOrders);
    } catch (error) {
      console.error(
        "Could not load orders:",
        error
      );

      return [];
    }
  };

  const orders = getOrders().reverse();

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
                    {order.status ||
                      "Order Placed"}
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
                      Paid
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