import { Link, useNavigate } from "react-router-dom";
import "./OrderSummary.css";

function OrderSummary() {
  const navigate = useNavigate();

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

  const groceryItems = getSavedData("groceryItems", []);
  const selectedStore = getSavedData("selectedStore", null);

  const deliverySlot =
    localStorage.getItem("deliverySlot") || "";

  const handleContinue = () => {
    navigate("/payment");
  };

  return (
    <div className="summary-page">
      <header className="summary-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
        </nav>
      </header>

      <main className="summary-content">
        <div className="summary-title">
          <p>Review Order</p>
          <h2>Order Summary</h2>
          <span>
            Review your grocery order before continuing.
          </span>
        </div>

        {/* Grocery Items */}
        <section className="summary-card">
          <h3>Grocery Items</h3>

          {groceryItems.length === 0 ? (
            <p className="summary-empty">
              No grocery items found.
            </p>
          ) : (
            <div className="summary-items">
              {groceryItems.map((item) => (
                <div
                  className="summary-item"
                  key={item.id}
                >
                  <span>{item.name}</span>

                  <strong>
                    Quantity: {item.quantity}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Selected Store */}
        <section className="summary-card">
          <h3>Selected Store</h3>

          {selectedStore ? (
            <div className="summary-detail">
              <div>
                <strong>
                  {selectedStore.name ||
                    selectedStore.store_name}
                </strong>

                <p>
                  {selectedStore.address}
                </p>
              </div>
            </div>
          ) : (
            <p className="summary-empty">
              No store selected.
            </p>
          )}
        </section>

        {/* Delivery */}
        <section className="summary-card">
          <h3>Delivery</h3>

          {deliverySlot ? (
            <div className="summary-detail">
              <div>
                <strong>
                  Delivery Date & Time
                </strong>

                <p>
                  {deliverySlot.replace("T", " ")}
                </p>
              </div>
            </div>
          ) : (
            <p className="summary-empty">
              No delivery time selected.
            </p>
          )}
        </section>

        <div className="summary-actions">
          <Link
            to="/delivery-time"
            className="summary-back"
          >
            Back to Delivery Time
          </Link>

          <button
            type="button"
            className="summary-continue"
            onClick={handleContinue}
            disabled={
              groceryItems.length === 0 ||
              !selectedStore ||
              !deliverySlot
            }
          >
            Continue to Payment
          </button>
        </div>
      </main>
    </div>
  );
}

export default OrderSummary;