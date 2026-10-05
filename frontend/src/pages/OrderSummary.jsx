import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./OrderSummary.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function OrderSummary() {
  const navigate = useNavigate();

  const getSavedData = (key, fallback) => {
    try {
      const savedData = localStorage.getItem(key);

      if (!savedData) {
        return fallback;
      }

      return JSON.parse(savedData);
    } catch (error) {
      console.error(`Could not load ${key}:`, error);
      return fallback;
    }
  };

  const groceryItems =
    getSavedData("groceryItems", []);

  const selectedStore =
    getSavedData("selectedStore", null);

  const user =
    getSavedData("user", null);

  const deliverySlot =
    localStorage.getItem("deliverySlot") || "";

  const [deliveryAddress, setDeliveryAddress] =
    useState(
      localStorage.getItem("deliveryAddress") || ""
    );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // Estimated Total
  // ==========================================

  const estimatedTotal =
    groceryItems.reduce(
      (total, item) => {
        const price =
          Number(item.estimatedPrice) || 0;

        const quantity =
          Number(item.quantity) || 0;

        return total + price * quantity;
      },
      0
    );

  // ==========================================
  // Format Delivery
  // ==========================================

  const formatDelivery = (slot) => {
    if (!slot) {
      return "Not selected";
    }

    const date = new Date(slot);

    if (Number.isNaN(date.getTime())) {
      return slot.replace("T", " ");
    }

    return date.toLocaleString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ==========================================
  // Continue to Payment
  // Create a NEW backend order first
  // ==========================================

  const handleContinue = async () => {
    setError("");

    const trimmedAddress =
      deliveryAddress.trim();

    if (groceryItems.length === 0) {
      setError(
        "Please add at least one grocery item."
      );
      return;
    }

    if (!selectedStore) {
      setError(
        "Please select a store."
      );
      return;
    }

    if (!deliverySlot) {
      setError(
        "Please select a delivery date and time."
      );
      return;
    }

    if (!trimmedAddress) {
      setError(
        "Please enter a delivery address before continuing."
      );
      return;
    }

    if (trimmedAddress.length < 5) {
      setError(
        "Please enter a valid delivery address."
      );
      return;
    }

    const customerId = Number(
      user?.id ??
      user?.user_id
    );

    if (
      !Number.isInteger(customerId) ||
      customerId <= 0
    ) {
      setError(
        "Customer information is not available. Please log in again."
      );
      return;
    }

    const storeId = Number(
      selectedStore.id ??
      selectedStore.store_id
    );

    if (
      !Number.isInteger(storeId) ||
      storeId <= 0
    ) {
      setError(
        "The selected store is invalid."
      );
      return;
    }

    // Convert frontend items to backend format
    const orderItems =
      groceryItems.map((item) => ({
        item_name: item.name,
        quantity: Number(item.quantity),
        estimated_price:
          Number(item.estimatedPrice),
        allow_substitution:
          Boolean(item.allowSubstitution),
      }));

    const token =
      localStorage.getItem("token");

    try {
      setLoading(true);

      // --------------------------------------
      // CREATE NEW ORDER
      // --------------------------------------

      const response = await fetch(
        `${API_BASE}/api/orders`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            customer_id: customerId,
            store_id: storeId,
            delivery_address:
              trimmedAddress,

            // Send the selected local time
            // as a full ISO timestamp
            delivery_slot:
              new Date(
                deliverySlot
              ).toISOString(),

            items: orderItems,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.errors?.[0] ||
          data?.error ||
          "Could not create the order.";

        throw new Error(message);
      }

      const newOrderId = Number(
        data?.order_id ??
        data?.id
      );

      if (
        !Number.isInteger(newOrderId) ||
        newOrderId <= 0
      ) {
        throw new Error(
          "The server did not return a valid order ID."
        );
      }

      // --------------------------------------
      // Build CURRENT order
      // --------------------------------------

      const currentOrder = {
        ...data,

        id: newOrderId,
        order_id: newOrderId,

        // Keep frontend-friendly data
        items: groceryItems,
        store: selectedStore,

        deliverySlot,
        deliveryAddress:
          trimmedAddress,

        total: estimatedTotal,

        status:
          data?.status ||
          "Pending",

        createdAt:
          data?.created_at ||
          data?.createdAt ||
          new Date().toISOString(),
      };

      // --------------------------------------
      // Replace OLD successful order
      // with this NEW current order
      // --------------------------------------

      localStorage.setItem(
        "currentOrder",
        JSON.stringify(currentOrder)
      );

      localStorage.setItem(
        "orderId",
        String(newOrderId)
      );

      localStorage.setItem(
        "deliveryAddress",
        trimmedAddress
      );

      // --------------------------------------
      // Now go to Payment
      // --------------------------------------

      navigate("/payment");
    } catch (error) {
      console.error(
        "Create order failed:",
        error
      );

      setError(
        error.message ||
          "Could not create the order."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-page">
      {/* Header */}
      <header className="summary-header">
        <h1>
          Grocery Link Helper
        </h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/grocery-list">
            Grocery List
          </Link>

          <Link to="/orders">
            Orders
          </Link>
        </nav>
      </header>

      <main className="summary-content">
        {/* Title */}
        <div className="summary-title">
          <p>
            Review Order
          </p>

          <h2>
            Order Summary
          </h2>

          <span>
            Review your grocery order before
            continuing.
          </span>
        </div>

        {/* Grocery Items */}
        <section className="summary-card">
          <h3>
            Grocery Items
          </h3>

          {groceryItems.length === 0 ? (
            <p className="summary-empty">
              No grocery items found.
            </p>
          ) : (
            <div className="summary-items">
              {groceryItems.map((item) => {
                const price =
                  Number(
                    item.estimatedPrice
                  ) || 0;

                const quantity =
                  Number(
                    item.quantity
                  ) || 0;

                const subtotal =
                  price * quantity;

                return (
                  <div
                    className="summary-item"
                    key={item.id}
                  >
                    <div>
                      <span>
                        {item.name}
                      </span>

                      <p>
                        Quantity:{" "}
                        {quantity}
                      </p>

                      <p>
                        Estimated Price: $
                        {price.toFixed(2)}
                      </p>
                    </div>

                    <strong>
                      $
                      {subtotal.toFixed(2)}
                    </strong>
                  </div>
                );
              })}

              <div className="summary-total">
                <span>
                  Estimated Total
                </span>

                <strong>
                  $
                  {estimatedTotal.toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* Store */}
        <section className="summary-card">
          <h3>
            Selected Store
          </h3>

          {selectedStore ? (
            <div className="summary-detail">
              <strong>
                {selectedStore.name ||
                  selectedStore.store_name}
              </strong>

              {selectedStore.address && (
                <p>
                  {selectedStore.address}
                </p>
              )}
            </div>
          ) : (
            <p className="summary-empty">
              No store selected.
            </p>
          )}
        </section>

        {/* Delivery */}
        <section className="summary-card">
          <h3>
            Delivery
          </h3>

          {deliverySlot ? (
            <div className="summary-detail">
              <strong>
                Delivery Date & Time
              </strong>

              <p>
                {formatDelivery(
                  deliverySlot
                )}
              </p>
            </div>
          ) : (
            <p className="summary-empty">
              No delivery time selected.
            </p>
          )}

          <div className="summary-address">
            <label htmlFor="delivery-address">
              Delivery Address
            </label>

            <input
              id="delivery-address"
              type="text"
              placeholder="Enter delivery address"
              value={deliveryAddress}
              onChange={(e) => {
                setDeliveryAddress(
                  e.target.value
                );

                setError("");
              }}
            />
          </div>

          {error && (
            <p className="summary-error">
              {error}
            </p>
          )}
        </section>

        {/* Actions */}
        <div className="summary-actions">
          <Link
            to="/delivery-time"
            className="summary-back"
          >
            Back to Delivery Time
          </Link>

          <button
            type="button"
            className="summary-continue"
            onClick={handleContinue}
            disabled={
              loading ||
              groceryItems.length === 0 ||
              !selectedStore ||
              !deliverySlot
            }
          >
            {loading
              ? "Creating Order..."
              : "Continue to Payment"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default OrderSummary;