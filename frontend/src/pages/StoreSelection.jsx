import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  dropOtherStoreItems,
  removedItemsNotice,
} from "../utils/groceryList";
import "./StoreSelection.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function readSaved(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function StoreSelection() {
  const navigate = useNavigate();

  // Start on the store chosen earlier, if any, so it is easy to keep.
  const [selectedStore, setSelectedStore] = useState(() => {
    const saved = readSaved("selectedStore");
    return saved?.id ? saved : null;
  });
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

    // Catalog items belong to one store, so switching stores removes the
    // ones the new store doesn't carry. Custom items stay.
    const savedItems = readSaved("groceryItems");
    const { items, removedCount } = dropOtherStoreItems(
      Array.isArray(savedItems) ? savedItems : [],
      selectedStore.id
    );
    if (removedCount > 0) {
      localStorage.setItem("groceryItems", JSON.stringify(items));
    }

    localStorage.setItem(
      "selectedStore",
      JSON.stringify(selectedStore)
    );

    // Next, pick items from this store's catalog.
    navigate("/grocery-list", {
      state: { notice: removedItemsNotice(removedCount, selectedStore.name) },
    });
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
            to="/dashboard"
            className="back-button"
          >
            Back to Dashboard
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