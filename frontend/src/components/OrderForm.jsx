import { useEffect, useState } from 'react';
import { getStores, createOrder } from '../api';

// Demo only: the seeded customer. A real build would take this from the session.
const DEMO_CUSTOMER_ID = 1;

const TIME_SLOTS = [
  { label: '6:00 - 7:00 PM', value: '18:00' },
  { label: '7:00 - 8:00 PM', value: '19:00' },
  { label: '8:00 - 9:00 PM', value: '20:00' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function OrderForm({ onSubmitted }) {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(TIME_SLOTS[0].value);
  const [items, setItems] = useState([{ item_name: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStores()
      .then((rows) => {
        setStores(rows);
        if (rows.length > 0) setStoreId(String(rows[0].store_id));
      })
      .catch((err) => setError(`Could not load stores: ${err.message}`));
  }, []);

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { item_name: '', quantity: 1 }]);
  }

  function removeItem(index) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const filled = items.filter((item) => item.item_name.trim() !== '');
    if (!storeId) return setError('Please choose a store.');
    if (filled.length === 0) return setError('Please add at least one grocery item.');

    setSubmitting(true);
    try {
      const saved = await createOrder({
        customer_id: DEMO_CUSTOMER_ID,
        store_id: Number(storeId),
        delivery_slot: `${date}T${time}:00`,
        items: filled.map((item) => ({
          item_name: item.item_name.trim(),
          quantity: Number(item.quantity),
        })),
      });
      onSubmitted(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>New grocery order</h2>

      {error && <p className="error">{error}</p>}

      <label htmlFor="store">Store</label>
      <select
        id="store"
        value={storeId}
        onChange={(e) => setStoreId(e.target.value)}
        required
      >
        <option value="">Select a store…</option>
        {stores.map((store) => (
          <option key={store.store_id} value={store.store_id}>
            {store.name}
          </option>
        ))}
      </select>

      <fieldset className="slot">
        <legend>Delivery time slot</legend>
        <div className="row">
          <input
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Grocery list</legend>
        {items.map((item, index) => (
          <div className="row" key={index}>
            <input
              type="text"
              placeholder="Item name (e.g. Milk 2L)"
              value={item.item_name}
              onChange={(e) => updateItem(index, 'item_name', e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="qty"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
            />
            {items.length > 1 && (
              <button type="button" className="link" onClick={() => removeItem(index)}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="secondary" onClick={addItem}>
          + Add item
        </button>
      </fieldset>

      <button type="submit" className="primary" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit order'}
      </button>
    </form>
  );
}
