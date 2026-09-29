import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StoreSelection.css";

function StoreSelection() {
  const navigate = useNavigate();

  const [selectedStore, setSelectedStore] = useState(null);
  const [error, setError] = useState("");

  // Temporary mock data.
  
  const stores = [
    {
      id: 1,
      name: "Walmart",
      address: "100 Grocery Street, Toronto, ON",
    },
    {
      id: 2,
      name: "No Frills",
      address: "200 Market Avenue, Toronto, ON",
    },
    {
      id: 3,
      name: "FreshCo",
      address: "300 Food Road, Toronto, ON",
    },
  ];

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setError("");
  };

  const handleContinue = () => {
    if (!selectedStore) {
      setError("Please select a store before continuing.");
      return;
    }

    // Temporarily save the selected store for the next screen.
    localStorage.setItem(
      "selectedStore",
      JSON.stringify(selectedStore)
    );

    // Orders screen can be connected later.
    navigate("/delivery-time");
  };

  return (
    <div className="store-page">
      <header className="store-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
        </nav>
      </header>

      <main className="store-content">
        <div className="store-title">
          <p>Store Selection</p>
          <h2>Select a Store</h2>
          <span>
            Choose where you would like your groceries purchased.
          </span>
        </div>

        <div className="store-list">
          {stores.map((store) => (
            <button
              type="button"
              key={store.id}
              className={`store-card ${
                selectedStore?.id === store.id
                  ? "selected"
                  : ""
              }`}
              onClick={() => handleSelectStore(store)}
            >
              <div className="store-icon">
                🏪
              </div>

              <div className="store-info">
                <h3>{store.name}</h3>
                <p>{store.address}</p>
              </div>

              <div className="store-select">
                {selectedStore?.id === store.id
                  ? "✓ Selected"
                  : "Select"}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="store-error">
            {error}
          </p>
        )}

        {selectedStore && (
          <div className="selected-store-summary">
            <span>Selected store</span>
            <strong>{selectedStore.name}</strong>
          </div>
        )}

        <div className="store-actions">
          <Link
            to="/grocery-list"
            className="back-button"
          >
            Back to Grocery List
          </Link>

          <button
            type="button"
            className="continue-button"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}

export default StoreSelection;