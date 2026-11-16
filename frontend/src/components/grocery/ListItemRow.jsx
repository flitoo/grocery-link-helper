import {
  displayBrand,
  formatQuantity,
  formatUnitPrice,
  lineTotal,
} from "../../utils/groceryList";

/** One line of the grocery list. */
function ListItemRow({ item, onRemove, onToggleSubstitution }) {
  const brand = displayBrand(item.brand);

  return (
    <div className="grocery-item">
      <div>
        <h3>{item.name}</h3>
        {brand && <p>{brand}</p>}
        <label className="grocery-substitution-option">
          <input
            type="checkbox"
            checked={Boolean(item.allowSubstitution)}
            onChange={(event) => onToggleSubstitution(item.id, event.target.checked)}
          />
          Allow replacement if unavailable (ask me first)
        </label>
        <p>Quantity: {formatQuantity(item)}</p>
        <p>Estimated price: {formatUnitPrice(item)}</p>
      </div>

      <div className="grocery-item-side">
        <strong>${lineTotal(item).toFixed(2)}</strong>
        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default ListItemRow;
