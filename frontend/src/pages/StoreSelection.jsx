import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CheckoutSteps from "../components/CheckoutSteps";
import Icon from "../components/Icon";
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
      <AppHeader />

      <main className="container-narrow page-body">
        <CheckoutSteps current={1} />

        <div className="page-title">
          <h1>Where should we shop?</h1>
          <p>
            Choose the store you want your groceries bought from.
          </p>
        </div>

        <div className="store-list" role="radiogroup" aria-label="Stores">
          {stores.map((store) => {
            const isSelected = selectedStore?.id === store.id;

            return (
              <button
                type="button"
                key={store.id}
                role="radio"
                aria-checked={isSelected}
                className={`store-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectStore(store)}
              >
                <span className="store-icon">
                  <Icon name="store" size={26} />
                </span>

                <span className="store-info">
                  <strong>{store.name}</strong>
                  <span>{store.address}</span>
                </span>

                <span className="store-check" aria-hidden="true">
                  {isSelected && <Icon name="check" size={18} />}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="notice notice-error store-error" role="alert">
            {error}
          </p>
        )}

        <div className="action-bar">
          <Link to="/grocery-list" className="btn btn-secondary">
            Back to list
          </Link>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleContinue}
          >
            Choose a time
          </button>
        </div>
      </main>
    </div>
  );
}

export default StoreSelection;