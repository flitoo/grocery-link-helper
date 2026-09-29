import { useState } from "react";
import { Link } from "react-router-dom";
import "./GroceryList.css";

function GroceryList() {
  const [items, setItems] = useState([]);

  const [newItem, setNewItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  const handleAddItem = () => {
    const trimmedItem = newItem.trim();
    const parsedQuantity = Number(quantity);

    // Validation 1: Empty item
    if (!trimmedItem) {
      setError("Please enter a grocery item.");
      return;
    }

    // Validation 2: Minimum length
    if (trimmedItem.length < 2) {
      setError("Item name must be at least 2 characters.");
      return;
    }

    // Validation 3: Maximum length
    if (trimmedItem.length > 50) {
      setError("Item name cannot be more than 50 characters.");
      return;
    }

    // Validation 4: Quantity
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    // Validation 5: Duplicate item
    const duplicateItem = items.some(
      (item) =>
        item.name.toLowerCase() === trimmedItem.toLowerCase()
    );

    if (duplicateItem) {
      setError("This item is already in your grocery list.");
      return;
    }

    const item = {
      id: Date.now(),
      name: trimmedItem,
      quantity: parsedQuantity,
    };

    setItems([...items, item]);

    // Clear inputs after successful add
    setNewItem("");
    setQuantity(1);
    setError("");
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
    setError("");
  };

  // Allow user to press Enter to add item
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  return (
    <div className="grocery-page">
      {/* Header */}
      <header className="grocery-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="grocery-content">
        <div className="grocery-title">
          <p>My Grocery List</p>
          <h2>Grocery List</h2>
        </div>

        {/* Add Item */}
        <div className="add-item">
          <input
            type="text"
            placeholder="Enter grocery item"
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

          {/* Quantity */}
          <input
            className="quantity-input"
            type="number"
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

          <button
            type="button"
            onClick={handleAddItem}
          >
            Add Item
          </button>
        </div>

        {/* Validation Error */}
        {error && (
          <p className="grocery-error">
            {error}
          </p>
        )}

        {/* Grocery List */}
        <div className="grocery-list">
          {items.length === 0 ? (
            <div className="empty-list">
              <h3>Your grocery list is empty</h3>

              <p>
                Add an item to get started.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                className="grocery-item"
                key={item.id}
              >
                <div>
                  <h3>{item.name}</h3>

                  <p>
                    Quantity: {item.quantity}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleRemoveItem(item.id)
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Continue to Store Selection */}
        {items.length > 0 && (
          <div className="grocery-next">
            <Link
              to="/store-selection"
              className="continue-button"
            >
              Continue to Store Selection
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default GroceryList;