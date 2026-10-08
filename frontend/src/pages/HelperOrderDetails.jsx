import { Link, useParams } from "react-router-dom";
import "./OrderDetails.css";

const sampleOrders = [
  {
    id: 1,
    customer: "Sarah Chen",
    store: "No Frills",
    address: "Toronto, ON",
    deliveryTime: "2:00 PM",
    status: "Assigned",
    items: [
      { name: "Milk", quantity: 2 },
      { name: "Bread", quantity: 1 },
    ],
  },
  {
    id: 2,
    customer: "Michael Brown",
    store: "FreshCo",
    address: "North York, ON",
    deliveryTime: "4:00 PM",
    status: "In Progress",
    items: [
      { name: "Eggs", quantity: 1 },
      { name: "Apples", quantity: 5 },
    ],
  },
];

function HelperOrderDetails() {
  const { orderId } = useParams();

  const order = sampleOrders.find(
    (item) => String(item.id) === String(orderId)
  );

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
          <span>View your assigned delivery information.</span>
        </div>

        {!order ? (
          <section className="order-details-card">
            <h3>Order Not Found</h3>
            <p>This order is not available.</p>
          </section>
        ) : (
          <>
            <section className="order-details-card">
              <div className="order-top">
                <div>
                  <span>Order Number</span>
                  <h3>#{order.id}</h3>
                </div>

                <div className="order-status">
                  {order.status}
                </div>
              </div>

              <div className="order-info-row">
                <span>Customer</span>
                <strong>{order.customer}</strong>
              </div>
            </section>

            <section className="order-details-card">
              <h3>Grocery Items</h3>

              {order.items.map((item, index) => (
                <div className="order-info-row" key={index}>
                  <span>{item.name}</span>
                  <strong>Quantity: {item.quantity}</strong>
                </div>
              ))}
            </section>

            <section className="order-details-card">
              <h3>Store</h3>

              <div className="order-info-row">
                <span>Store Name</span>
                <strong>{order.store}</strong>
              </div>
            </section>

            <section className="order-details-card">
              <h3>Delivery</h3>

              <div className="order-info-row">
                <span>Delivery Address</span>
                <strong>{order.address}</strong>
              </div>

              <div className="order-info-row">
                <span>Delivery Time</span>
                <strong>{order.deliveryTime}</strong>
              </div>
            </section>
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