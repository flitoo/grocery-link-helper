import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import useOrderFeed from '../hooks/useOrderFeed';
import { api } from '../lib/api';
import { formatOrderStatus } from '../constants/orderStatus';
import './OrderExperience.css';

export default function SubstitutionRequests({ helper = false }) {
  const { orderId } = useParams();
  return <SubstitutionContent key={`${orderId}:${helper}`} orderId={orderId} helper={helper} />;
}

function SubstitutionContent({ orderId, helper }) {
  const { data, error, loading, refresh } = useOrderFeed(orderId);
  const [itemId, setItemId] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [difference, setDifference] = useState('0');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  let user;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch { user = null; }
  const userId = Number(user?.id ?? user?.user_id);
  const order = data?.order;
  const requests = data?.requests || [];
  const isHelper = helper && order?.helper_id === userId;
  const isCustomer = !helper && order?.customer_id === userId;
  const eligible = (order?.items || []).filter(item => item.allow_substitution &&
    !requests.some(request => request.original_item_id === item.item_id && ['Pending', 'Approved'].includes(request.status)));
  const canPropose = isHelper && order.status === 'Shopping';

  async function propose(event) {
    event.preventDefault();
    if (busy || loading) return;
    setActionError(''); setMessage('');
    const price = Number(difference);
    if (!eligible.some(item => item.item_id === Number(itemId)) || !suggestion.trim() ||
        difference.trim() === '' || !Number.isFinite(price) || Math.abs(price) > 99999999.99 ||
        Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
      setActionError('Choose an eligible item, enter a replacement and use a price difference with at most two decimal places.');
      return;
    }
    setBusy(true);
    try {
      await api(`/substitution-requests/orders/${orderId}`, { method: 'POST', body: {
        original_item_id: Number(itemId), suggested_item_name: suggestion.trim(), price_difference: price,
      } });
      setItemId(''); setSuggestion(''); setDifference('0');
      setMessage('Request sent. Wait for the customer’s decision before replacing the item.');
      refresh();
    } catch (err) { setActionError(err.message); refresh(); }
    finally { setBusy(false); }
  }

  async function respond(requestId, status) {
    if (busy || loading) return;
    setBusy(true); setActionError(''); setMessage('');
    try {
      await api(`/substitution-requests/orders/${orderId}/${requestId}`, { method: 'PATCH', body: { status } });
      setMessage(`Replacement ${status.toLowerCase()}.`);
      refresh();
    } catch (err) { setActionError(err.message); refresh(); }
    finally { setBusy(false); }
  }

  return <div className="order-experience"><AppHeader helper={helper} />
    <main className="experience-content">
      <div className="experience-heading"><div><p>Order #{orderId}</p><h1>Substitution Requests</h1>
        <p>{helper ? 'Suggest a replacement for an unavailable item.' : 'Review replacements suggested by your helper.'}</p></div>
        <button onClick={refresh} disabled={loading || busy}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <p className="app-error" role="alert">{error}</p>}
      {actionError && <p className="app-error" role="alert">{actionError}</p>}
      {message && <p className="experience-notice" role="status">{message}</p>}
      {loading && !data && <p role="status">Loading substitution requests...</p>}
      {order && <>
        <p>Status: <strong>{formatOrderStatus(order.status)}</strong> · Updates every 15 seconds</p>
        {helper && <section className="app-card">
          <h2>Suggest a replacement</h2>
          {!canPropose ? <p>Only the assigned helper can send requests while the order is Shopping.</p> :
            eligible.length === 0 ? <p>No eligible items. The customer must allow substitutions, and an item cannot already have a pending or approved request.</p> :
            <form className="substitution-form" onSubmit={propose}>
              <label>Original item<select required value={itemId} onChange={event => setItemId(event.target.value)}>
                <option value="">Choose an item</option>
                {eligible.map(item => <option key={item.item_id} value={item.item_id}>{item.item_name} (quantity {item.quantity})</option>)}
              </select></label>
              <label>Suggested replacement<input required maxLength={150} value={suggestion} onChange={event => setSuggestion(event.target.value)} /></label>
              <label>Price difference (CAD)<input required type="number" min="-99999999.99" max="99999999.99" step="0.01" value={difference} onChange={event => setDifference(event.target.value)} aria-describedby="price-help" /></label>
              <p id="price-help">Enter the difference for this replacement: positive for extra cost, negative for savings, or 0 for the same price.</p>
              <button className="experience-primary" disabled={busy || loading}>{busy ? 'Sending...' : 'Send Request'}</button>
            </form>}
        </section>}
        <section aria-label="Replacement requests">
          <h2>Requests ({requests.length})</h2>
          {!requests.length && <div className="app-card"><p>No replacement requests yet.</p></div>}
          {requests.map(request => {
            const original = order.items.find(item => item.item_id === request.original_item_id);
            const price = Number(request.price_difference);
            return <article className="app-card substitution-card" key={request.substitution_id}>
              <div className="experience-heading"><h3>{original?.item_name || `Item #${request.original_item_id}`} → {request.suggested_item_name}</h3>
                <span className={`request-badge request-${request.status.toLowerCase()}`}>{request.status}</span></div>
              <p>Price difference: <strong>{price === 0 ? 'No change' : `${price > 0 ? '+' : '−'}$${Math.abs(price).toFixed(2)} CAD`}</strong></p>
              {isCustomer && request.status === 'Pending' && <div className="experience-actions">
                <button className="experience-primary" disabled={busy || loading} onClick={() => respond(request.substitution_id, 'Approved')}>Approve {request.suggested_item_name}</button>
                <button disabled={busy || loading} onClick={() => respond(request.substitution_id, 'Rejected')}>Reject {request.suggested_item_name}</button>
              </div>}
            </article>;
          })}
        </section>
      </>}
      <div className="experience-actions"><Link to={helper ? `/helper/orders/${orderId}` : `/order-details/${orderId}`}>Back to Order Details</Link>
        {!helper && <Link to={`/orders/${orderId}/tracking`}>Track Order</Link>}</div>
    </main>
  </div>;
}
