import { Link, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
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
        <AppHeader />

        <main className="container-narrow page-body">
          <div className="panel empty">
            <Icon name="receipt" size={44} />

            <h3>No order found</h3>

            <p>There is no order information available.</p>

            <Link to="/orders" className="btn btn-primary">
              Back to orders
            </Link>
          </div>
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
      <AppHeader />

      <main className="container-narrow page-body">
        <div className="page-title">
          <h1>Order #{displayOrderId}</h1>
          <p>Placed {formatDate(orderDate)}</p>
        </div>

        <div className="receipt-wrap">
          <section className="receipt" aria-label="Order details">
            <div className="receipt-head">
              <h2>{storeName}</h2>

              <span className="badge">{orderStatus}</span>
            </div>

            {storeAddress && (
              <p className="receipt-meta">{storeAddress}</p>
            )}

            <div className="receipt-section">
              {items.length === 0 ? (
                <p className="receipt-meta">
                  No grocery items available.
                </p>
              ) : (
                items.map((item, index) => (
                  <div
                    className="receipt-line"
                    key={item.id ?? item.order_item_id ?? index}
                  >
                    <span>
                      {item.name ??
                        item.itemName ??
                        item.item_name ??
                        "Item"}
                    </span>

                    <strong className="num">
                      × {item.quantity ?? 1}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div className="receipt-section">
              <div className="receipt-line">
                <span>Delivery time</span>
                <strong>{formatDate(deliverySlot)}</strong>
              </div>

              {deliveryAddress && (
                <div className="receipt-line">
                  <span>Address</span>
                  <strong>{deliveryAddress}</strong>
                </div>
              )}
            </div>

            <div className="receipt-section">
              <div className="receipt-line">
                <span>Payment method</span>
                <strong>{paymentMethod}</strong>
              </div>

              <div className="receipt-line">
                <span>Payment status</span>
                <strong className="paid-status">{paymentStatus}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="action-bar">
          <Link to="/orders" className="btn btn-secondary">
            Back to orders
          </Link>

          <Link to="/dashboard" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default OrderDetails;