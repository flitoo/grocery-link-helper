
import { useNavigate } from "react-router-dom";
import "./HelperDashboard.css";

function HelperDashboard() {
  const navigate = useNavigate();

  const getSavedOrders = () => {
    try {
      const saved = localStorage.getItem("orders");
      const orders = saved ? JSON.parse(saved) : [];

      return Array.isArray(orders) ? orders : [];
    } catch (error) {
      console.error("Failed to load orders:", error);
      return [];
    }
  };

  const orders = getSavedOrders();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getOrderId = (order) =>
    order.order_id ?? order.orderId ?? order.id;

  const formatDeliveryTime = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("en-CA");
  };

  return (
    <div className="helper-page">
      <header className="helper-header">
        <h1>Grocery Helper</h1>

        <nav>
          <button
            onClick={() => navigate("/dashboard")}
          >
            Customer Dashboard
          </button>

          <button onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <main className="helper-content">
        <h2>Helper Dashboard</h2>

        <p>View grocery orders for development testing.</p>

        <section className="helper-orders">
          <h3>Orders</h3>

          {orders.length === 0 ? (
            <div className="helper-order-card">
              <p>No orders available.</p>
            </div>
          ) : (
            [...orders].reverse().map((order, index) => {
              const orderId = getOrderId(order);

              const store =
                order.store?.name ||
                order.store?.store_name ||
                order.store_name ||
                "Not available";

              const address =
                order.delivery_address ||
                order.deliveryAddress ||
                "Not available";

              const deliveryTime =
                order.delivery_slot ||
                order.deliverySlot;

              return (
                <div
                  className="helper-order-card"
                  key={orderId ?? index}
                >
                  <h4>
                    Order #{orderId ?? "Unknown"}
                  </h4>

                  <p>
                    <strong>Store:</strong> {store}
                  </p>

                  <p>
                    <strong>Delivery Address:</strong>{" "}
                    {address}
                  </p>

                  <p>
                    <strong>Delivery Time:</strong>{" "}
                    {formatDeliveryTime(deliveryTime)}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {order.status || "Pending"}
                  </p>

                  <button
                    className="helper-details-button"
                    disabled={!orderId}
                    onClick={() =>
                      navigate(`/helper/orders/${orderId}`)
                    }
                  >
                    View Details
                  </button>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}

export default HelperDashboard;
