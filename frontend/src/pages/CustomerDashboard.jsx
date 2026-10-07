import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import "./CustomerDashboard.css";

function CustomerDashboard() {
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

  const user = getSavedData("user", null);
  const firstName = user?.name?.split(" ")[0] || "";

  // Get grocery items from localStorage
  const groceryItems = getSavedData("groceryItems", []);

  // Get completed orders from localStorage
  const orders = getSavedData("orders", []);

  const groceryItemCount = groceryItems.length;

  // Show newest orders first
  const recentOrders = [...orders]
    .reverse()
    .slice(0, 3);

  const formatDelivery = (slot) => {
    if (!slot) {
      return "";
    }

    const date = new Date(slot);

    if (Number.isNaN(date.getTime())) {
      return slot.replace("T", " ");
    }

    return date.toLocaleString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="dashboard-page">
      <AppHeader />

      <main className="container page-body">
        {/* Start an order */}
        <section className="start-panel">
          <div>
            <h1>
              {firstName
                ? `Hi, ${firstName}. What do you need today?`
                : "What do you need today?"}
            </h1>

            <p>
              {groceryItemCount > 0
                ? `You have ${groceryItemCount} ${
                    groceryItemCount === 1 ? "item" : "items"
                  } on your list. Pick up where you left off.`
                : "Make a list, choose a store and a delivery time. A helper does the rest."}
            </p>
          </div>

          <Link to="/grocery-list" className="btn btn-lemon">
            <Icon name={groceryItemCount > 0 ? "cart" : "plus"} />
            {groceryItemCount > 0
              ? "Continue your list"
              : "Start a list"}
          </Link>
        </section>

        {/* Recent orders */}
        <section className="dashboard-section">
          <div className="section-head">
            <h2>Recent orders</h2>

            {orders.length > 0 && (
              <Link to="/orders">See all orders</Link>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <div className="panel empty">
              <Icon name="box" size={44} />

              <h3>No orders yet</h3>

              <p>
                Orders you place will show up here once you
                have paid.
              </p>

              <Link to="/grocery-list" className="btn btn-primary">
                Start a list
              </Link>
            </div>
          ) : (
            <ul className="panel rows">
              {recentOrders.map((order) => (
                <li className="row" key={order.id}>
                  <div className="row-main">
                    <h3>Order #{order.id}</h3>

                    <p>
                      {order.store?.name ||
                        order.store?.store_name ||
                        "Store"}
                      {order.deliverySlot
                        ? `, ${formatDelivery(order.deliverySlot)}`
                        : ""}
                    </p>
                  </div>

                  <span className="badge">
                    {order.status || "Order placed"}
                  </span>

                  <Link
                    to={`/order-details/${order.id}`}
                    className="btn btn-secondary dashboard-details"
                  >
                    Details
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default CustomerDashboard;
