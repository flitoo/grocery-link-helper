import { useNavigate } from "react-router-dom";
import "./HelperDashboard.css";

const sampleOrders = [
  {
    id: 1,
    customer: "Sarah Chen",
    store: "No Frills",
    address: "Toronto, ON",
    deliveryTime: "2:00 PM",
    status: "Assigned",
  },
  {
    id: 2,
    customer: "Michael Brown",
    store: "FreshCo",
    address: "North York, ON",
    deliveryTime: "4:00 PM",
    status: "In Progress",
  },
];

function HelperDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="helper-page">
      <header className="helper-header">
        <h1>Grocery Helper</h1>

        <nav>
          <button onClick={() => navigate("/helper-dashboard")}>
            Dashboard
          </button>

          <button onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <main className="helper-content">
        <h2>Helper Dashboard</h2>
        <p>View and manage your assigned deliveries.</p>

        <section className="helper-orders">
          <h3>Assigned Orders</h3>

          {sampleOrders.map((order) => (
            <div className="helper-order-card" key={order.id}>
              <h4>Order #{order.id}</h4>

              <p><strong>Customer:</strong> {order.customer}</p>
              <p><strong>Store:</strong> {order.store}</p>
              <p><strong>Delivery Address:</strong> {order.address}</p>
              <p><strong>Delivery Time:</strong> {order.deliveryTime}</p>
              <p><strong>Status:</strong> {order.status}</p>

              <button
                className="helper-details-button"
                onClick={() =>
                  navigate(`/helper/orders/${order.id}`)
                }
              >
                View Details
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default HelperDashboard;