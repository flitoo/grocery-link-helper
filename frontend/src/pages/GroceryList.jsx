import { useState } from "react";
import { Link } from "react-router-dom";
import "./GroceryList.css";

function GroceryList() {
  const [items, setItems] = useState([
    { id: 1, name: "Milk", quantity: 1 },
    { id: 2, name: "Bread", quantity: 1 },
    { id: 3, name: "Eggs", quantity: 12 },
  ]);

  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");

  const handleAddItem = () => {
    const trimmedItem = newItem.trim();

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

    // Validation 4: Duplicate item
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
      quantity: 1,
    };

    setItems([...items, item]);

    // Clear input and error after successful add
    setNewItem("");
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
      <header className="grocery-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
          <Link to="/orders">Orders</Link>
        </nav>
      </header>

      <main className="grocery-content">
        <div className="grocery-title">
          <p>My Grocery List</p>
          <h2>Grocery List</h2>
        </div>

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

          <button onClick={handleAddItem}>
            Add Item
          </button>
        </div>

        {error && (
          <p className="grocery-error">
            {error}
          </p>
        )}

        <div className="grocery-list">
          {items.length === 0 ? (
            <div className="empty-list">
              <h3>Your grocery list is empty</h3>
              <p>Add an item to get started.</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="grocery-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>Quantity: {item.quantity}</p>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default GroceryList;