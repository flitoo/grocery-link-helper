import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  displayBrand,
  formatUnitPrice,
  lineTotal,
  parsePrice,
  parseQuantity,
  quantityStep,
  unitOf,
} from "../../utils/groceryList";

/**
 * A number box that only changes the list once the value is valid. While the
 * user types, the text is kept locally; Enter or leaving the box commits it.
 * `parse(text)` returns { value } or { error }.
 */
function NumberField({ label, value, step, prefix, suffix, parse, onCommit }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  function commit() {
    if (draft === null) return;
    const result = parse(draft);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setDraft(null);
    if (result.value !== value) onCommit(result.value);
  }

  return (
    <div className="grocery-edit-field">
      <div className="grocery-edit-input">
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <input
          aria-label={label}
          type="number"
          inputMode="decimal"
          min={step}
          step={step}
          value={draft ?? String(value)}
          aria-invalid={Boolean(error)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(null);
              setError("");
            }
          }}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      {error && (
        <p className="grocery-edit-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Loads the other brands of a catalog item and lets the user pick one. */
function BrandPicker({ item, onPick, onClose }) {
  const [state, setState] = useState({ status: "loading", options: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    api(`/items/${item.catalogItemId}/alternatives`)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", options: data.alternatives || [], error: "" });
      })
      .catch((err) => {
        if (cancelled) return;
        const error = err instanceof TypeError
          ? "Could not reach the server. Please try again."
          : err.message || "Could not load other brands.";
        setState({ status: "error", options: [], error });
      });
    return () => {
      cancelled = true;
    };
  }, [item.catalogItemId]);

  return (
    <div className="grocery-brand-picker">
      {state.status === "loading" && <p>Loading other brands…</p>}
      {state.status === "error" && <p role="alert">{state.error}</p>}
      {state.status === "ready" && state.options.length === 0 && (
        <p>No other brands of this item at this store.</p>
      )}
      {state.options.length > 0 && (
        <ul aria-label={`Other brands of ${item.name}`}>
          {state.options.map((option) => (
            <li key={option.item_id}>
              <button type="button" onClick={() => onPick(option)}>
                {displayBrand(option.brand) || "Store brand"} ·{" "}
                {formatUnitPrice({ estimatedPrice: option.unit_price, unit: option.unit })}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="link-button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

function quantityParser(unit) {
  return (text) => {
    const result = parseQuantity(text, unit);
    return result.error ? result : { value: result.quantity };
  };
}

function parsePriceValue(text) {
  const result = parsePrice(text);
  return result.error ? result : { value: result.price };
}

/**
 * One line of the grocery list. Every line can change its quantity, be
 * removed and toggle substitution. Catalog lines can swap brand; custom lines
 * can change their price. `onUpdate(id, changes)`, `onSwap(id, catalogItem)`.
 */
function ListItemRow({ item, onRemove, onUpdate, onSwap }) {
  const [swapping, setSwapping] = useState(false);
  const brand = displayBrand(item.brand);
  const unit = unitOf(item);

  return (
    <div className="grocery-item">
      <div className="grocery-item-main">
        <h3>{item.name}</h3>
        {brand && <p>{brand}</p>}
        {item.notInCatalog && (
          <p className="grocery-item-note">Not in this store's catalog · price from your past order</p>
        )}

        <div className="grocery-edit-row">
          <NumberField
            label={`Quantity of ${item.name}`}
            value={Number(item.quantity)}
            step={quantityStep(unit)}
            suffix={unit === "each" ? "pcs" : unit}
            parse={quantityParser(unit)}
            onCommit={(quantity) => onUpdate(item.id, { quantity })}
          />
          {item.catalogItemId ? (
            <p className="grocery-item-price">{formatUnitPrice(item)}</p>
          ) : (
            <NumberField
              label={`Price of ${item.name}`}
              value={Number(item.estimatedPrice)}
              step={0.01}
              prefix="$"
              suffix={unit === "each" ? "each" : `/ ${unit}`}
              parse={parsePriceValue}
              onCommit={(estimatedPrice) => onUpdate(item.id, { estimatedPrice })}
            />
          )}
        </div>

        <label className="grocery-substitution-option">
          <input
            type="checkbox"
            checked={Boolean(item.allowSubstitution)}
            onChange={(event) => onUpdate(item.id, { allowSubstitution: event.target.checked })}
          />
          Allow replacement if unavailable (ask me first)
        </label>

        {item.catalogItemId && !swapping && (
          <button type="button" className="link-button" onClick={() => setSwapping(true)}>
            Swap brand
          </button>
        )}
        {swapping && (
          <BrandPicker
            item={item}
            onPick={(option) => onSwap(item.id, option)}
            onClose={() => setSwapping(false)}
          />
        )}
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
