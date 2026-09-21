import "./CustomerDashboard.css";

function CustomerDashboard() {
  const customerName = "Customer";

  const groceryItemCount = 0;
  const recentOrderCount = 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          Grocery Link Helper
        </div>

        <nav className="dashboard-nav">
          <a href="#">Dashboard</a>
          <a href="#">Grocery List</a>
          <a href="#">Orders</a>
          <button className="logout-button">Logout</button>
        </nav>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <div>
            <p className="welcome-label">Welcome back!</p>

            <h1>Hello, {customerName} 👋</h1>

            <p className="welcome-text">
              Manage your grocery list and keep track of your orders.
            </p>
          </div>

          <button className="primary-button">
            + Add Grocery Item
          </button>
        </section>

        <section className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">🛒</div>

            <div className="card-content">
              <p>Grocery List</p>
              <h2>{groceryItemCount}</h2>
              <span>Items in your list</span>
            </div>

            <button className="card-button">
              View Grocery List
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📦</div>

            <div className="card-content">
              <p>Recent Orders</p>
              <h2>{recentOrderCount}</h2>
              <span>Orders placed</span>
            </div>

            <button className="card-button">
              View Orders
            </button>
          </div>
        </section>

        <section className="quick-actions">
          <div className="section-heading">
            <p>Quick Actions</p>
            <h2>What would you like to do?</h2>
          </div>

          <div className="action-grid">
            <button className="action-card">
              <span className="action-icon">🛒</span>

              <div>
                <h3>Manage Grocery List</h3>
                <p>Add or remove grocery items.</p>
              </div>
            </button>

            <button className="action-card">
              <span className="action-icon">📋</span>

              <div>
                <h3>View Orders</h3>
                <p>Check your previous orders.</p>
              </div>
            </button>
          </div>
        </section>

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