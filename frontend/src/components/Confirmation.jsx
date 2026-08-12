function formatSlot(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const start = date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
  const end = new Date(date.getTime() + 60 * 60 * 1000).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${day}, ${start} – ${end}`;
}

export default function Confirmation({ order, onNewOrder }) {
  return (
    <div>
      <h2>Order received</h2>
      <p className="lead">
        Order <strong>#{order.order_id}</strong> is in the system.
        <span className="badge">{order.status}</span>
      </p>

      <dl className="summary">
        <dt>Store</dt>
        <dd>{order.store_name}</dd>
        <dt>Delivery slot</dt>
        <dd>{formatSlot(order.delivery_slot)}</dd>
        <dt>Customer ID</dt>
        <dd>{order.customer_id}</dd>
      </dl>

      <table className="items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.item_id}>
              <td>{item.item_name}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="primary" onClick={onNewOrder}>
        Place another order
      </button>
    </div>
  );
}
