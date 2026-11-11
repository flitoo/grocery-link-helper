import { useState } from "react";
import { UNITS, buildCustomItem, quantityStep } from "../../utils/groceryList";

/**
 * Adds an item that is not in the catalog. The price is for ONE unit
 * (one piece, one lb or one kg). `onAdd(item)` returns { error } or {}.
 */
function CustomItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  function clearError() {
    if (error) setError("");
  }

  function handleAdd() {
    const built = buildCustomItem(
      { name, quantity, unit, price },
      `custom-${Date.now()}`
    );
    if (built.error) {
      setError(built.error);
      return;
    }
    const result = onAdd(built.item);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setQuantity(1);
    setUnit("each");
    setPrice("");
    setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="custom-item">
      <div className="add-item">
        <input
          type="text"
          placeholder="Item name"
          aria-label="Custom item name"
          value={name}
          maxLength={50}
          onChange={(e) => {
            setName(e.target.value);
            clearError();
          }}
          onKeyDown={handleKeyDown}
        />

        <input
          className="quantity-input"
          type="number"
          min={quantityStep(unit)}
          step={quantityStep(unit)}
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            clearError();
          }}
          onKeyDown={handleKeyDown}
        />

        <select
          className="unit-select"
          aria-label="Unit"
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            clearError();
          }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u === "each" ? "pieces" : u}
            </option>
          ))}
        </select>

        <input
          className="price-input"
          type="number"
          min="0.01"
          step="0.01"
          aria-label={unit === "each" ? "Estimated price each" : `Estimated price per ${unit}`}
          placeholder={unit === "each" ? "Price each" : `Price per ${unit}`}
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            clearError();
          }}
          onKeyDown={handleKeyDown}
        />

        <button type="button" onClick={handleAdd}>
          Add Item
        </button>
      </div>

      {error && (
        <p className="grocery-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default CustomItemForm;
