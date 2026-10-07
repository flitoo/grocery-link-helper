import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CheckoutSteps from "../components/CheckoutSteps";
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
      <AppHeader />

      <main className="container-narrow page-body">
        <CheckoutSteps current={3} />

        <div className="page-title">
          <h1>Review your order</h1>
          <p>Check the details, add your address, then go to payment.</p>
        </div>

        <div className="receipt-wrap">
          <section className="receipt" aria-label="Order summary">
            <h2>
              {selectedStore
                ? selectedStore.name || selectedStore.store_name
                : "No store selected"}
            </h2>

            {selectedStore?.address && (
              <p className="receipt-meta">{selectedStore.address}</p>
            )}

            <div className="receipt-section">
              {groceryItems.length === 0 ? (
                <p className="receipt-meta">No grocery items found.</p>
              ) : (
                groceryItems.map((item) => {
                  const price = Number(item.estimatedPrice) || 0;
                  const quantity = Number(item.quantity) || 0;

                  return (
                    <div className="receipt-item" key={item.id}>
                      <div className="receipt-line">
                        <strong>{item.name}</strong>
                        <strong className="num">
                          ${(price * quantity).toFixed(2)}
                        </strong>
                      </div>

                      <small>
                        {quantity} × ${price.toFixed(2)}
                      </small>
                    </div>
                  );
                })
              )}
            </div>

            <div className="receipt-section">
              <div className="receipt-line">
                <span>Delivery time</span>
                <strong>
                  {deliverySlot
                    ? formatDelivery(deliverySlot)
                    : "Not selected"}
                </strong>
              </div>
            </div>

            <div className="receipt-total">
              <span>Estimated total</span>
              <strong>${estimatedTotal.toFixed(2)}</strong>
            </div>
          </section>
        </div>

        <section className="panel summary-address">
          <div className="field">
            <label htmlFor="delivery-address">Delivery address</label>

            <input
              id="delivery-address"
              type="text"
              autoComplete="street-address"
              placeholder="Street, unit, city"
              value={deliveryAddress}
              onChange={(e) => {
                setDeliveryAddress(e.target.value);

                setError("");
              }}
            />

            <span className="field-hint">
              Include your unit number or concierge instructions.
            </span>
          </div>

          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
        </section>

        <div className="action-bar">
          <Link to="/delivery-time" className="btn btn-secondary">
            Back to time
          </Link>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={
              loading ||
              groceryItems.length === 0 ||
              !selectedStore ||
              !deliverySlot
            }
          >
            {loading ? "Creating order..." : "Continue to payment"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default OrderSummary;