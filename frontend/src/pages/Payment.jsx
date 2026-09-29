import { Link } from "react-router-dom";
import "./Payment.css";

function Payment() {
  return (
    <div className="payment-page">
      <header className="payment-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/grocery-list">Grocery List</Link>
        </nav>
      </header>

      <main className="payment-content">
        <div className="payment-title">
          <p>Checkout</p>
          <h2>Payment</h2>
          <span>
            Complete payment for your grocery order.
          </span>
        </div>

        <section className="payment-card">
          <h3>Payment Information</h3>

          <p className="payment-message">
            Payment is not available yet.
          </p>

          <p className="payment-description">
            Payment processing will be available once
            the backend payment service is connected.
          </p>
        </section>

        <div className="payment-actions">
          <Link
            to="/order-summary"
            className="payment-back"
          >
            Back to Order Summary
          </Link>

          <button
            type="button"
            className="payment-button"
            disabled
          >
            Pay Now
          </button>
        </div>
      </main>
    </div>
  );
}

export default Payment;