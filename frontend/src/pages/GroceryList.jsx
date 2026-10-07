import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CheckoutSteps from "../components/CheckoutSteps";
import Icon from "../components/Icon";
import "./GroceryList.css";

function GroceryList() {
  // Load saved grocery items from localStorage
  const [items, setItems] = useState(() => {
    const savedItems = localStorage.getItem("groceryItems");

    if (savedItems) {
      try {
        return JSON.parse(savedItems);
      } catch (error) {
        console.error(
          "Could not load grocery items:",
          error
        );
        return [];
      }
    }

    return [];
  });

  const [newItem, setNewItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [estimatedPrice, setEstimatedPrice] =
    useState("");
  const [error, setError] = useState("");

  // Save grocery items whenever the list changes
  useEffect(() => {
    localStorage.setItem(
      "groceryItems",
      JSON.stringify(items)
    );
  }, [items]);

  const handleAddItem = () => {
    const trimmedItem = newItem.trim();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(estimatedPrice);

    // Validation 1: Empty item
    if (!trimmedItem) {
      setError("Please enter a grocery item.");
      return;
    }

    // Validation 2: Minimum length
    if (trimmedItem.length < 2) {
      setError(
        "Item name must be at least 2 characters."
      );
      return;
    }

    // Validation 3: Maximum length
    if (trimmedItem.length > 50) {
      setError(
        "Item name cannot be more than 50 characters."
      );
      return;
    }

    // Validation 4: Quantity
    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      setError("Quantity must be at least 1.");
      return;
    }

    // Validation 5: Estimated price
    if (
      !estimatedPrice ||
      Number.isNaN(parsedPrice) ||
      parsedPrice <= 0
    ) {
      setError(
        "Estimated price must be greater than $0."
      );
      return;
    }

    // Validation 6: Duplicate item
    const duplicateItem = items.some(
      (item) =>
        item.name.toLowerCase() ===
        trimmedItem.toLowerCase()
    );

    if (duplicateItem) {
      setError(
        "This item is already in your grocery list."
      );
      return;
    }

    const item = {
      id: Date.now(),
      name: trimmedItem,
      quantity: parsedQuantity,

      // Needed by backend create-order API
      estimatedPrice: parsedPrice,

      // Default for backend order item
      allowSubstitution: false,
    };

    setItems((currentItems) => [
      ...currentItems,
      item,
    ]);

    // Clear inputs after successful add
    setNewItem("");
    setQuantity(1);
    setEstimatedPrice("");
    setError("");
  };

  const handleRemoveItem = (id) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== id
      )
    );

    setError("");
  };

  // Allow user to press Enter to add item
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  const estimatedTotal = items.reduce(
    (total, item) =>
      total +
      Number(item.estimatedPrice) * Number(item.quantity),
    0
  );

  return (
    <div className="grocery-page">
      <AppHeader />

      <main className="container-narrow page-body">
        <CheckoutSteps current={0} />

        <div className="page-title">
          <h1>Your grocery list</h1>
          <p>
            Add what you need and roughly what it costs. The
            helper buys it at the store you pick next.
          </p>
        </div>

        {/* Add Item */}
        <section className="panel add-item" aria-label="Add an item">
          <div className="field add-item-name">
            <label htmlFor="item-name">Item</label>
            <input
              id="item-name"
              type="text"
              placeholder="e.g. Milk, 2%"
              value={newItem}
              maxLength={50}
              onChange={(e) => {
                setNewItem(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="field">
            <label htmlFor="item-quantity">Quantity</label>
            <input
              id="item-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="field">
            <label htmlFor="item-price">Price each ($)</label>
            <input
              id="item-price"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={estimatedPrice}
              placeholder="0.00"
              onChange={(e) => {
                setEstimatedPrice(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary add-item-button"
            onClick={handleAddItem}
          >
            <Icon name="plus" />
            Add item
          </button>

          {error && (
            <p className="notice notice-error add-item-error" role="alert">
              {error}
            </p>
          )}
        </section>

        {/* Grocery List */}
        <section className="panel grocery-list" aria-label="Your items">
          {items.length === 0 ? (
            <div className="empty">
              <Icon name="cart" size={44} />

              <h3>Your list is empty</h3>

              <p>Add your first item above to get started.</p>
            </div>
          ) : (
            <ul className="rows">
              {items.map((item) => (
                <li className="row" key={item.id}>
                  <div className="row-main">
                    <strong>{item.name}</strong>

                    <span>
                      {item.quantity} × $
                      {Number(item.estimatedPrice).toFixed(2)}
                    </span>
                  </div>

                  <span className="row-value">
                    $
                    {(
                      Number(item.estimatedPrice) *
                      Number(item.quantity)
                    ).toFixed(2)}
                  </span>

                  <button
                    type="button"
                    className="btn btn-quiet"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <div className="receipt-total">
              <span>Estimated total</span>
              <strong>${estimatedTotal.toFixed(2)}</strong>
            </div>
          )}
        </section>

        {/* Continue to Store Selection */}
        {items.length > 0 && (
          <div className="action-bar action-bar-end">
            <Link to="/store-selection" className="btn btn-primary">
              Choose a store
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default GroceryList;