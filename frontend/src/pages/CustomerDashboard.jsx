import { Link, useNavigate } from "react-router-dom";
import "./CustomerDashboard.css";

function CustomerDashboard() {
  const customerName = "Customer";

  const groceryItemCount = 0;
  const recentOrderCount = 0;

  const navigate = useNavigate();

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">Grocery Link Helper</div>

        <nav className="dashboard-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
          <Link to="/orders">Orders</Link>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div>
            <p className="welcome-label">Welcome back!</p>

            <h1>Hello, {customerName} 👋</h1>

            <p className="welcome-text">
              Manage your grocery list and keep track of your orders.
            </p>
          </div>

          <Link to="/grocery-list" className="primary-button">
            + Add Grocery Item
          </Link>
        </section>

        {/* Dashboard Cards */}
        <section className="dashboard-cards">
          {/* Grocery List Card */}
          <div className="dashboard-card">
            <div className="card-icon">🛒</div>

            <div className="card-content">
              <p>Grocery List</p>
              <h2>{groceryItemCount}</h2>
              <span>Items in your list</span>
            </div>

            <Link to="/grocery-list" className="card-button">
              View Grocery List
            </Link>
          </div>

          {/* Recent Orders Card */}
          <div className="dashboard-card">
            <div className="card-icon">📦</div>

            <div className="card-content">
              <p>Recent Orders</p>
              <h2>{recentOrderCount}</h2>
              <span>Orders placed</span>
            </div>

            <Link to="/orders" className="card-button">
              View Orders
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <div className="section-heading">
            <p>Quick Actions</p>
            <h2>What would you like to do?</h2>
          </div>

          <div className="action-grid">
            <Link
              to="/grocery-list"
              className="action-card"
            >
              <span className="action-icon">🛒</span>

              <div>
                <h3>Manage Grocery List</h3>
                <p>Add or remove grocery items.</p>
              </div>
            </Link>

            <Link
              to="/orders"
              className="action-card"
            >
              <span className="action-icon">📋</span>

              <div>
                <h3>View Orders</h3>
                <p>Check your previous orders.</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Order History */}
        <section className="orders-section">
          <div className="section-heading">
            <p>Order History</p>
            <h2>Recent Orders</h2>
          </div>

          <div className="empty-orders">
            <div className="empty-icon">📦</div>

            <h3>No recent orders</h3>

            <p>
              Your recent grocery orders will appear here.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CustomerDashboard;