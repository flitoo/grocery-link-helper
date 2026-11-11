import AppHeader from '../components/AppHeader';
import { API_BASE } from '../lib/api';

import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./RepeatOrder.css";



function getSavedUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    return null;
  }
}

function RepeatOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [originalOrder, setOriginalOrder] =
    useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load original order from backend
  useEffect(() => {
    const controller = new AbortController();

    async function loadOriginalOrder() {
      setLoading(true);
      setError("");
      setOriginalOrder(null);
      setItems([]);

      try {
        const token = localStorage.getItem("token");
        const user = getSavedUser();

        const userId = user?.id ?? user?.user_id;

        if (!token || !userId) {
          throw new Error(
            "Please log in as a Customer first."
          );
        }

        const response = await fetch(
          `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.errors?.[0] ||
              data?.error ||
              "Could not load this order."
          );
        }

        // Frontend ownership check.
        // Backend must also enforce ownership.
        if (
          String(data.customer_id) !== String(userId)
        ) {
          throw new Error(
            "You can only repeat your own orders."
          );
        }

        if (
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error(
            "This order has no grocery items to repeat."
          );
        }

        const originalItems = data.items.map(
          (item, index) => ({
            id: item.item_id ?? index,
            name:
              item.item_name ?? item.name ?? "",
            quantity: String(item.quantity ?? 1),
            estimatedPrice: String(
              item.estimated_price ??
                item.estimatedPrice ??
                ""
            ),
            allowSubstitution: Boolean(
              item.allow_substitution ??
                item.allowSubstitution ??
                false
            ),
          })
        );

        if (!controller.signal.aborted) {
          setOriginalOrder(data);
          setItems(originalItems);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.message || "Could not load this order."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOriginalOrder();

    return () => controller.abort();
  }, [orderId]);

  // Update grocery item
  function updateItem(id, field, value) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );

    setError("");
  }

  // Remove grocery item
  function removeItem(id) {
    setItems((previous) =>
      previous.filter((item) => item.id !== id)
    );

    setError("");
  }

  // Calculate estimated total
  const estimatedTotal = items.reduce(
    (sum, item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.estimatedPrice);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(price)
      ) {
        return sum;
      }

      return sum + quantity * price;
    },
    0
  );

  // Continue to new order checkout
  function handleContinue() {
    if (items.length === 0) {
      setError("Please keep at least one item.");
      return;
    }

    for (const item of items) {
      const name = item.name.trim();
      const quantity = Number(item.quantity);
      const price = Number(item.estimatedPrice);

      if (name.length < 2 || name.length > 50) {
        setError("An item has an invalid name.");
        return;
      }

      if (
        item.quantity.trim() === "" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      ) {
        setError(
          `Enter a valid quantity for ${item.name}.`
        );
        return;
      }

      if (
        item.estimatedPrice.trim() === "" ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        setError(
          `Enter a valid estimated price for ${item.name}.`
        );
        return;
      }
    }

    // Match GroceryList and OrderSummary data format
    const newItems = items.map((item, index) => ({
      id: Date.now() + index,
      name: item.name.trim(),
      quantity: Number(item.quantity),
      estimatedPrice: Number(item.estimatedPrice),
      allowSubstitution: item.allowSubstitution,
    }));

    // Save grocery items for the new order
    localStorage.setItem(
      "groceryItems",
      JSON.stringify(newItems)
    );

    // Clear previous checkout data
    localStorage.removeItem("currentOrder");
    localStorage.removeItem("orderId");
    localStorage.removeItem("selectedStore");
    localStorage.removeItem("deliverySlot");
    localStorage.removeItem("deliveryAddress");

    // Start a new checkout
    navigate("/store-selection");
  }

  return (
    <div className="repeat-page">
      <AppHeader />

      <main className="repeat-content">
        <div className="repeat-title">
          <p>Order History</p>

          <h2>Repeat Order #{orderId}</h2>

          <span>
            Review items before starting a new order.
          </span>
        </div>

        {loading ? (
          <section className="repeat-card">
            <p>Loading original order...</p>
          </section>
        ) : !originalOrder ? (
          <section className="repeat-card">
            <p className="repeat-error" role="alert">
              {error}
            </p>

            <Link to="/orders">
              Back to Orders
            </Link>
          </section>
        ) : (
          <>
            <section className="repeat-card">
              <h3>
                Original Order #
                {originalOrder.order_id ?? orderId}
              </h3>

              <p className="repeat-muted">
                Original status:{" "}
                {String(
                  originalOrder.status ?? "Unknown"
                ).replaceAll("_", " ")}
              </p>

              <p className="repeat-muted">
                You will select a new store and
                delivery time at checkout.
              </p>
            </section>

            <section className="repeat-card">
              <h3>Grocery Items</h3>

              <p className="repeat-muted">
                Update quantities and prices,
                or remove items.
              </p>

              {items.length === 0 ? (
                <p>No items selected.</p>
              ) : (
                <div className="repeat-items">
                  {items.map((item) => (
                    <div
                      className="repeat-item"
                      key={item.id}
                    >
                      <strong className="repeat-item-name">
                        {item.name}
                      </strong>

                      <label>
                        Quantity
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                      </label>

                      <label>
                        Estimated Price ($)
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.estimatedPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "estimatedPrice",
                              e.target.value
                            )
                          }
                        />
                      </label>

                      <label className="repeat-substitution">
                        <input
                          type="checkbox"
                          checked={item.allowSubstitution}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "allowSubstitution",
                              e.target.checked
                            )
                          }
                        />
                        Allow substitution
                      </label>

                      <button
                        type="button"
                        className="repeat-remove"
                        onClick={() =>
                          removeItem(item.id)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="repeat-total">
                <span>Estimated Total</span>

                <strong>
                  ${estimatedTotal.toFixed(2)}
                </strong>
              </div>
            </section>

            {error && (
              <p className="repeat-error" role="alert">
                {error}
              </p>
            )}

            <div className="repeat-actions">
              <Link
                to="/orders"
                className="repeat-back"
              >
                Back to Orders
              </Link>

              <button
                type="button"
                className="repeat-continue"
                onClick={handleContinue}
                disabled={items.length === 0}
              >
                Continue to Store Selection
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default RepeatOrder;
