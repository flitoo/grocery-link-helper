import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StoreSelection.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function StoreSelection() {
  const navigate = useNavigate();

  const [selectedStore, setSelectedStore] = useState(null);
  const [error, setError] = useState("");

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Load the real stores so the id we send matches the database
  useEffect(() => {
    let cancelled = false;

    const loadStores = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stores`);

        if (!response.ok) {
          throw new Error("Unable to load stores.");
        }

        const data = await response.json();

        if (!cancelled) {
          setStores(
            data.stores.map((store) => ({
              id: store.store_id,
              name: store.store_name,
              address: store.address,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.message || "Unable to load stores."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

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

        {loading && (
          <p className="store-message">Loading stores...</p>
        )}

        {loadError && (
          <p className="store-error">
            {loadError} Check that the server is running, then
            reload.
          </p>
        )}

        {!loading && !loadError && stores.length === 0 && (
          <p className="store-message">
            No stores are available right now.
          </p>
        )}

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