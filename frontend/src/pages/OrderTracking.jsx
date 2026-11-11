import { Link, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import useOrderFeed from '../hooks/useOrderFeed';
import { formatOrderStatus } from '../constants/orderStatus';
import './OrderExperience.css';

const steps = ['Pending', 'Paid', 'Assigned', 'Shopping', 'Out_for_Delivery', 'Delivered'];
const descriptions = {
  Pending: 'Your order has been created and is awaiting payment.',
  Paid: 'Payment received. Waiting for a helper to accept your order.',
  Assigned: 'A helper has accepted your order.',
  Shopping: 'Your helper is shopping for your groceries.',
  Out_for_Delivery: 'Your groceries are on the way.',
  Delivered: 'Your order has been delivered.',
  Cancelled: 'This order has been cancelled.',
};
function deliveryTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' });
}

export default function OrderTracking() {
  const { orderId } = useParams();
  return <TrackingContent key={orderId} orderId={orderId} />;
}
function TrackingContent({ orderId }) {
  const { data, error, loading, refresh } = useOrderFeed(orderId);
  const order = data?.order;
  const current = steps.indexOf(order?.status);
  const pending = data?.requests.filter(request => request.status === 'Pending').length || 0;
  return <div className="order-experience"><AppHeader />
    <main className="experience-content">
      <div className="experience-heading"><div><p>Order #{orderId}</p><h1>Track Your Order</h1><p>Updates automatically every 15 seconds.</p></div>
        <button disabled={loading} onClick={refresh}>{loading ? 'Loading...' : 'Refresh'}</button></div>
      {error && <p className="app-error" role="alert">{error}</p>}
      {loading && !data && <p role="status">Loading order progress...</p>}
      {order && <>
        <section className="app-card tracking-summary" aria-live="polite">
          <h2>{formatOrderStatus(order.status, 'Status unavailable')}</h2><p>{descriptions[order.status] || 'Refresh to check the latest order status.'}</p>
          <small>Last checked: {data.checkedAt.toLocaleTimeString('en-CA')}</small>
        </section>
        {pending > 0 && <aside className="experience-notice"><strong>{pending} replacement {pending === 1 ? 'request needs' : 'requests need'} your review.</strong> <Link to={`/orders/${orderId}/substitutions`}>Review Replacements</Link></aside>}
        <div className="tracking-layout">
          <section className="app-card"><h2>Order progress</h2>
            {order.status === 'Cancelled' ? <p>This order will not proceed to delivery.</p> : current < 0 ? <p>Progress is currently unavailable.</p> :
              <ol className="tracking-steps">{steps.map((step, index) => <li key={step} className={index <= current ? 'reached' : ''} aria-current={index === current ? 'step' : undefined}>
                <span className="tracking-dot" aria-hidden="true">{index < current ? '✓' : index + 1}</span>
                <div><strong>{formatOrderStatus(step)}</strong><p>{index < current ? 'Completed' : index === current ? 'Current status' : 'Upcoming'}</p></div>
              </li>)}</ol>}
          </section>
          <section className="app-card"><h2>Delivery details</h2><dl className="tracking-details">
            <dt>Scheduled delivery (Toronto time)</dt><dd>{deliveryTime(order.delivery_slot)}</dd>
            <dt>Delivery address</dt><dd>{order.delivery_address || 'Not available'}</dd>
            <dt>Helper</dt><dd>{order.helper_name || (order.helper_id ? `Helper #${order.helper_id}` : 'Waiting for a helper')}</dd>
            <dt>Items</dt><dd>{order.items?.length || 0}</dd>
          </dl>
          <div className="experience-actions">{order.helper_id && <Link to={`/orders/${orderId}/chat`}>Chat with Helper</Link>}
            <Link to={`/orders/${orderId}/substitutions`}>View Replacements</Link>
            {order.status === 'Delivered' && <Link to={`/orders/${orderId}/rate`}>Rate Delivery</Link>}</div>
          </section>
        </div>
      </>}
      <div className="experience-actions"><Link to="/orders">Back to Orders</Link><Link to={`/order-details/${orderId}`}>Order Details</Link></div>
    </main>
  </div>;
}
