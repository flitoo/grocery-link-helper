import { Link, useParams } from "react-router-dom";
import "./OrderDetails.css";

function OrderDetails() {
  const { orderId } = useParams();

  const getSavedOrder = () => {
    try {
      const savedOrder =
        localStorage.getItem("currentOrder");

      if (!savedOrder) {
        return null;
      }

      return JSON.parse(savedOrder);
    } catch (error) {
      console.error(
        "Could not load current order:",
        error
      );

      return null;
    }
  };

  const order = getSavedOrder();

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not available";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return String(dateString).replace("T", " ");
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

  if (!order) {
    return (
      <div className="order-details-page">
        <header className="order-details-header">
          <h1>Grocery Link Helper</h1>

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

        <main className="order-details-content">
          <section className="order-details-card">
            <div className="no-order">
              <h3>No Order Found</h3>

              <p>
                There is no order information available.
              </p>

              <Link
                to="/orders"
                className="order-dashboard-button"
              >
                Back to Orders
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Support both frontend and backend property names
  const displayOrderId =
    order.id ??
    order.orderId ??
    order.order_id ??
    orderId;

  const orderStatus =
    order.orderStatus ??
    order.order_status ??
    order.status ??
    "Placed";

  const orderDate =
    order.createdAt ??
    order.created_at ??
    order.orderDate ??
    order.order_date ??
    null;

  const items =
    order.items ??
    order.orderItems ??
    order.order_items ??
    [];

  const store =
    order.store ??
    order.selectedStore ??
    null;

  const storeName =
    store?.name ??
    store?.store_name ??
    order.storeName ??
    order.store_name ??
    "Not available";

  const storeAddress =
    store?.address ??
    order.storeAddress ??
    order.store_address ??
    "";

  const deliverySlot =
    order.deliverySlot ??
    order.delivery_slot ??
    order.deliveryTime ??
    order.delivery_time ??
    null;

  const deliveryAddress =
    order.deliveryAddress ??
    order.delivery_address ??
    "";

  const paymentMethod =
    order.paymentMethod ??
    order.payment_method ??
    "Not available";

  const paymentStatus =
    order.paymentStatus ??
    order.payment_status ??
    "Paid";

  return (
    <div className="order-details-page">
      <header className="order-details-header">
        <h1>Grocery Link Helper</h1>

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

      <main className="order-details-content">
        <div className="order-details-title">
          <p>Order</p>

          <h2>Order Details</h2>

          <span>
            View your order information and delivery details.
          </span>
        </div>

        {/* Order Information */}
        <section className="order-details-card">
          <div className="order-top">
            <div>
              <span>Order Number</span>

              <h3>#{displayOrderId}</h3>
            </div>

            <div className="order-status">
              {orderStatus}
            </div>
          </div>

          <div className="order-info-row">
            <span>Order Date</span>

            <strong>
              {formatDate(orderDate)}
            </strong>
          </div>
        </section>

        {/* Grocery Items */}
        <section className="order-details-card">
          <h3>Grocery Items</h3>

          {items.length === 0 ? (
            <p>No grocery items available.</p>
          ) : (
            items.map((item, index) => (
              <div
                className="order-info-row"
                key={
                  item.id ??
                  item.order_item_id ??
                  index
                }
              >
                <span>
                  {item.name ??
                    item.itemName ??
                    item.item_name ??
                    "Item"}
                </span>

                <strong>
                  Quantity: {item.quantity ?? 1}
                </strong>
              </div>
            ))
          )}
        </section>

        {/* Store */}
        <section className="order-details-card">
          <h3>Store</h3>

          <div className="order-info-row">
            <span>Selected Store</span>

            <strong>
              {storeName}
            </strong>
          </div>

          {storeAddress && (
            <div className="order-info-row">
              <span>Store Address</span>

              <strong>
                {storeAddress}
              </strong>
            </div>
          )}
        </section>

        {/* Delivery */}
        <section className="order-details-card">
          <h3>Delivery</h3>

          <div className="order-info-row">
            <span>
              Delivery Date & Time
            </span>

            <strong>
              {formatDate(deliverySlot)}
            </strong>
          </div>

          {deliveryAddress && (
            <div className="order-info-row">
              <span>
                Delivery Address
              </span>

              <strong>
                {deliveryAddress}
              </strong>
            </div>
          )}
        </section>

        {/* Payment */}
        <section className="order-details-card">
          <h3>Payment</h3>

          <div className="order-info-row">
            <span>Payment Method</span>

            <strong>
              {paymentMethod}
            </strong>
          </div>

          <div className="order-info-row">
            <span>Payment Status</span>

            <strong className="paid-status">
              {paymentStatus}
            </strong>
          </div>
        </section>

        <div className="order-details-actions">
          <Link
            to="/orders"
            className="order-dashboard-button"
          >
            Back to Orders
          </Link>

          <Link
            to="/dashboard"
            className="order-dashboard-button"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default OrderDetails;