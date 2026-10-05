import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  return (
    <div className="grocery-page">
      {/* Header */}
      <header className="grocery-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/grocery-list">
            Grocery List
          </Link>
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
          {/* Item name */}
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
            placeholder="Quantity"
            onChange={(e) => {
              setQuantity(e.target.value);

              if (error) {
                setError("");
              }
            }}
            onKeyDown={handleKeyDown}
          />

          {/* Estimated Price */}
          <input
            className="price-input"
            type="number"
            min="0.01"
            step="0.01"
            value={estimatedPrice}
            placeholder="Estimated price"
            onChange={(e) => {
              setEstimatedPrice(e.target.value);

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
              <h3>
                Your grocery list is empty
              </h3>

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

                  <p>
                    Estimated Price: $
                    {Number(
                      item.estimatedPrice
                    ).toFixed(2)}
                  </p>

                  <p>
                    Estimated Subtotal: $
                    {(
                      Number(item.estimatedPrice) *
                      Number(item.quantity)
                    ).toFixed(2)}
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

        {/* Estimated Total */}
        {items.length > 0 && (
          <div className="grocery-total">
            <span>Estimated Total</span>

            <strong>
              $
              {items
                .reduce(
                  (total, item) =>
                    total +
                    Number(item.estimatedPrice) *
                      Number(item.quantity),
                  0
                )
                .toFixed(2)}
            </strong>
          </div>
        )}

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