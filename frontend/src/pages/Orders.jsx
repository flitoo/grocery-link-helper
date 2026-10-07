import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
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
      <AppHeader />

      <main className="container-narrow page-body">
        <div className="page-title">
          <h1>Your orders</h1>
          <p>Everything you have ordered, newest first.</p>
        </div>

        {orders.length === 0 ? (
          <div className="panel empty">
            <Icon name="box" size={44} />

            <h3>No orders yet</h3>

            <p>Orders you place will show up here once you have paid.</p>

            <Link to="/grocery-list" className="btn btn-primary">
              Start a list
            </Link>
          </div>
        ) : (
          <ul className="panel rows orders-list">
            {orders.map((order) => (
              <li className="row order-row" key={order.id}>
                <div className="row-main">
                  <h3>
                    Order #{order.id}
                    {" "}
                    <span className="badge">
                      {order.status || "Order placed"}
                    </span>
                  </h3>

                  <p>
                    {order.store?.name ||
                      order.store?.store_name ||
                      "Store not available"}
                    {", "}
                    {order.items?.length || 0}{" "}
                    {(order.items?.length || 0) === 1
                      ? "item"
                      : "items"}
                  </p>

                  <p>Delivery: {formatDelivery(order.deliverySlot)}</p>
                </div>

                <Link
                  to={`/order-details/${order.id}`}
                  className="btn btn-secondary"
                >
                  View details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default Orders;