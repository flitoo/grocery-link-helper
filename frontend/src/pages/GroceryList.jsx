import { useState } from "react";
import "./GroceryList.css";

function GroceryList() {
  const [items, setItems] = useState([
    { id: 1, name: "Milk", quantity: 1 },
    { id: 2, name: "Bread", quantity: 1 },
    { id: 3, name: "Eggs", quantity: 12 },
  ]);

  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (!newItem.trim()) {
      return;
    }

    const item = {
      id: Date.now(),
      name: newItem,
      quantity: 1,
    };

    setItems([...items, item]);
    setNewItem("");
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="grocery-page">
      <header className="grocery-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/grocery-list">Grocery List</a>
          <a href="/orders">Orders</a>
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
            onChange={(e) => setNewItem(e.target.value)}
          />

          <button onClick={handleAddItem}>
            Add Item
          </button>
        </div>

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