import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  catalogIdsOfOrder,
  importNotice,
  listFromPastOrder,
} from "../../utils/groceryList";
import "./ImportPanel.css";

// GET /api/items returns at most 50 rows per request.
const IDS_PER_REQUEST = 50;

function friendlyError(err) {
  return err instanceof TypeError
    ? "Could not reach the server. Check that it is running, then try again."
    : err.message || "Something went wrong. Please try again.";
}

/** The current store's active catalog rows for the given ids. */
async function loadCatalogRows(storeId, ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
    const params = new URLSearchParams({
      store_id: String(storeId),
      ids: ids.slice(i, i + IDS_PER_REQUEST).join(","),
      limit: String(IDS_PER_REQUEST),
    });
    const data = await api(`/items?${params.toString()}`);
    rows.push(...data.items);
  }
  return rows;
}

/** Builds a list from a past order, priced for the current store. */
async function importPastOrder(orderId, storeId) {
  const order = await api(`/orders/${orderId}`);
  const lines = order.items || [];
  const rows = await loadCatalogRows(storeId, catalogIdsOfOrder(lines));
  const result = listFromPastOrder(orderId, lines, rows);
  return { items: result.items, notice: importNotice(orderId, result) };
}

function orderLabel(order) {
  const date = new Date(order.created_at).toLocaleDateString();
  const count = `${order.item_count} ${order.item_count === 1 ? "item" : "items"}`;
  const total = `$${Number(order.total_amount).toFixed(2)}`;
  return `#${order.order_id} · ${order.store_name} · ${date} · ${count} · ${total}`;
}

/** Loads the customer's past orders (with items) once the panel is shown. */
function usePastOrders(enabled) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || orders) return undefined;
    let cancelled = false;
    api("/orders")
      .then((data) => {
        if (!cancelled) setOrders((data.orders || []).filter((o) => o.item_count > 0));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(friendlyError(err));
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, orders]);

  function retry() {
    setError("");
    setOrders(null);
  }

  return { orders, error, loading: enabled && orders === null, retry };
}

function ConfirmBar({ text, onYes, onNo, busy }) {
  return (
    <div className="import-confirm" role="alert">
      <p>{text}</p>
      <button type="button" onClick={onYes} disabled={busy}>
        {busy ? "Working…" : "Yes, replace it"}
      </button>
      <button type="button" className="link-button" onClick={onNo} disabled={busy}>
        Keep my list
      </button>
    </div>
  );
}

function PastOrderPicker({ pastOrders, selected, onSelect, onImport, busy }) {
  if (pastOrders.loading) return <p className="import-hint">Loading your past orders…</p>;
  if (pastOrders.error) {
    return (
      <p className="import-error" role="alert">
        {pastOrders.error}{" "}
        <button type="button" className="link-button" onClick={pastOrders.retry}>
          Try again
        </button>
      </p>
    );
  }
  if (pastOrders.orders.length === 0) {
    return <p className="import-hint">You have no past orders to import yet.</p>;
  }
  return (
    <div className="import-picker">
      <label>
        <span className="visually-hidden">Past order to import</span>
        <select value={selected} onChange={(e) => onSelect(e.target.value)}>
          <option value="">Choose a past order…</option>
          {pastOrders.orders.map((order) => (
            <option key={order.order_id} value={order.order_id}>
              {orderLabel(order)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onImport} disabled={!selected || busy}>
        {busy ? "Importing…" : "Import"}
      </button>
    </div>
  );
}

/**
 * Start a fresh list or fill it from a past order. Shown on its own while the
 * list is empty; otherwise behind a "Start a new list" button. Replacing a
 * list that has items asks first. `onReplace(items, notice)` swaps the list.
 */
function ImportPanel({ storeId, itemCount, onReplace }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(null); // "fresh" | "import" | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visible = itemCount === 0 || open;
  const pastOrders = usePastOrders(visible);

  function close() {
    setOpen(false);
    setConfirming(null);
    setSelected("");
    setError("");
  }

  async function runImport() {
    setBusy(true);
    setError("");
    try {
      const { items, notice } = await importPastOrder(Number(selected), storeId);
      onReplace(items, notice);
      close();
    } catch (err) {
      setError(friendlyError(err));
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) {
    return (
      <div className="import-toggle">
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Start a new list
        </button>
      </div>
    );
  }

  const replaceText = `This replaces the ${itemCount} ${itemCount === 1 ? "item" : "items"} in your list.`;

  return (
    <section className="import-panel" aria-label="Start a new list">
      <h2>{itemCount === 0 ? "Start your list" : "Start a new list"}</h2>
      <p className="import-hint">
        {itemCount === 0
          ? "Search for items below, or bring in everything from a past order."
          : "Clear your list, or replace it with a past order."}
      </p>

      {itemCount > 0 && (
        <button type="button" onClick={() => setConfirming("fresh")} disabled={busy}>
          Start fresh
        </button>
      )}

      <PastOrderPicker
        pastOrders={pastOrders}
        selected={selected}
        onSelect={setSelected}
        onImport={() => (itemCount > 0 ? setConfirming("import") : runImport())}
        busy={busy}
      />

      {confirming && (
        <ConfirmBar
          text={replaceText}
          busy={busy}
          onNo={() => setConfirming(null)}
          onYes={() => {
            if (confirming === "import") return runImport();
            onReplace([], "Started a new list.");
            return close();
          }}
        />
      )}

      {error && (
        <p className="import-error" role="alert">
          {error}
        </p>
      )}

      {itemCount > 0 && (
        <button type="button" className="link-button" onClick={close} disabled={busy}>
          Cancel
        </button>
      )}
    </section>
  );
}

export default ImportPanel;
