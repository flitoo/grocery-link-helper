import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import CustomItemForm from "../components/grocery/CustomItemForm";
import ItemSearch from "../components/grocery/ItemSearch";
import ListItemRow from "../components/grocery/ListItemRow";
import {
  addToList,
  catalogToListItem,
  dropOtherStoreItems,
  listTotal,
  removeFromList,
  removedItemsNotice,
} from "../utils/groceryList";
import "./GroceryList.css";

function readJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Could not load ${key}:`, error);
    return fallback;
  }
}

function readSavedStore() {
  const store = readJson("selectedStore", null);
  const id = Number(store?.id);
  return Number.isInteger(id) && id > 0 ? { ...store, id } : null;
}

function GroceryListContent({ store }) {
  const location = useLocation();

  // Items from another store can't be ordered here, so drop them on load.
  const [initial] = useState(() => {
    const saved = readJson("groceryItems", []);
    return dropOtherStoreItems(Array.isArray(saved) ? saved : [], store.id);
  });
  const [items, setItems] = useState(initial.items);

  // Save grocery items whenever the list changes
  useEffect(() => {
    localStorage.setItem("groceryItems", JSON.stringify(items));
  }, [items]);

  const notices = [
    location.state?.notice,
    removedItemsNotice(initial.removedCount, store.name),
  ].filter(Boolean);

  // Both add handlers return { error } or { merged } for the form that called.
  function handleAddCatalogItem(catalogItem, quantity) {
    const result = addToList(items, catalogToListItem(catalogItem, quantity));
    if (result.error) return { error: result.error };
    setItems(result.items);
    return { merged: result.merged };
  }

  function handleAddCustomItem(item) {
    const result = addToList(items, item);
    if (result.error) return { error: result.error };
    setItems(result.items);
    return {};
  }

  const handleRemoveItem = (id) => {
    setItems((current) => removeFromList(current, id));
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

        <div className="grocery-store-bar">
          <span>Shopping at</span>
          <strong>{store.name}</strong>
          <Link to="/store-selection">Change store</Link>
        </div>

        {notices.map((text) => (
          <p className="grocery-notice" role="status" key={text}>
            {text}
          </p>
        ))}

        <ItemSearch storeId={store.id} onAdd={handleAddCatalogItem} />

        <details className="custom-item-details">
          <summary>Can't find it? Add a custom item</summary>
          <p className="custom-item-hint">
            The price is for one piece, or for one lb or kg when you pick a
            weight unit.
          </p>
          <CustomItemForm onAdd={handleAddCustomItem} />
        </details>

        {/* Grocery List */}
        <h3 className="grocery-list-heading">
          Your list{items.length > 0 ? ` (${items.length})` : ""}
        </h3>

        <div className="grocery-list">
          {items.length === 0 ? (
            <div className="empty-list">
              <h3>Your grocery list is empty</h3>

              <p>Search for items above to get started.</p>
            </div>
          ) : (
            items.map((item) => (
              <ListItemRow key={item.id} item={item} onRemove={handleRemoveItem} />
            ))
          )}
        </div>

        {/* Estimated Total */}
        {items.length > 0 && (
          <div className="grocery-total">
            <span>Estimated Total</span>

            <strong>${listTotal(items).toFixed(2)}</strong>
          </div>
        )}

        {/* Continue to Delivery Time */}
        {items.length > 0 && (
          <div className="grocery-next">
            <Link to="/delivery-time" className="continue-button">
              Continue to Delivery Time
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// Items come from one store's catalog, so a store must be chosen first.
function GroceryList() {
  const store = readSavedStore();

  if (!store) {
    return <Navigate to="/store-selection" replace />;
  }

  return <GroceryListContent key={store.id} store={store} />;
}

export default GroceryList;
