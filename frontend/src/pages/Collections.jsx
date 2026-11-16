import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { api } from '../lib/api';
import './Collections.css';

const emptyCollection = { name: '', description: '', category: '' };
const emptyItem = { item_name: '', brand: '', quantity: '1', unit: 'pcs', estimated_unit_price: '', dietary_options: '' };

export default function Collections() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyCollection);
  const [item, setItem] = useState(emptyItem);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api('/collections', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setCollections(data.collections); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function refresh(id) {
    const data = await api('/collections');
    setCollections(data.collections);
    if (id) {
      const detail = await api(`/collections/${id}`);
      setSelected(detail.collection);
      setForm({ name: detail.collection.name, description: detail.collection.description, category: detail.collection.category || '' });
    }
  }

  async function run(action) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function saveCollection(event) {
    event.preventDefault();
    run(async () => {
      const data = await api(selected ? `/collections/${selected.collection_id}` : '/collections', {
        method: selected ? 'PUT' : 'POST', body: form,
      });
      await refresh(data.collection.collection_id);
      setMessage('Collection saved.');
    });
  }

  function addItem(event) {
    event.preventDefault();
    run(async () => {
      await api(`/collections/${selected.collection_id}/items`, { method: 'POST', body: {
        ...item, quantity: Number(item.quantity),
        estimated_unit_price: item.estimated_unit_price === '' ? null : Number(item.estimated_unit_price),
        dietary_options: item.dietary_options.split(',').map(value => value.trim()).filter(Boolean),
      } });
      setItem(emptyItem); await refresh(selected.collection_id);
      setMessage('Item added.');
    });
  }

  function useCollection() {
    if (!selected.items.length) { setError('Add at least one item first.'); return; }
    // Checkout currently accepts whole quantities and requires a price.
    if (selected.items.some(value => !Number.isInteger(Number(value.quantity)) || value.estimated_unit_price == null)) {
      setError('To use this collection for an order, each item needs a whole quantity and an estimated price.'); return;
    }
    let draft;
    try { draft = JSON.parse(localStorage.getItem('groceryItems') || '[]'); } catch { draft = []; }
    if (Array.isArray(draft) && draft.length && !window.confirm('Replace your current grocery list with this collection?')) return;
    localStorage.setItem('groceryItems', JSON.stringify(selected.items.map(value => ({
      id: crypto.randomUUID(), name: value.item_name, quantity: Number(value.quantity),
      estimatedPrice: Number(value.estimated_unit_price), allowSubstitution: false,
    }))));
    navigate('/grocery-list');
  }

  return <div className="collections-page"><AppHeader />
    <main className="collections-content">
      <h1>My Collections</h1><p>Save grocery lists to use again.</p>
      {error && <p className="app-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading ? <p role="status">Loading collections...</p> : <div className="collections-layout">
        <aside aria-label="Saved collections" className="app-card">
          <button disabled={busy} onClick={() => { setSelected(null); setForm(emptyCollection); setItem(emptyItem); setError(''); }}>+ New Collection</button>
          {!collections.length && <p>No collections yet. Create your first list.</p>}
          {collections.map(value => <button className="collection-choice" disabled={busy} aria-pressed={selected?.collection_id === value.collection_id}
            key={value.collection_id} onClick={() => run(() => refresh(value.collection_id))}>
            <strong>{value.name}</strong><span>{value.item_count} items · {value.category || 'General'}</span>
          </button>)}
        </aside>
        <section className="app-card">
          <h2>{selected ? 'Edit Collection' : 'Create Collection'}</h2>
          <form onSubmit={saveCollection} className="collection-form">
            <label>Name<input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Category<input maxLength={60} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <button disabled={busy}>{busy ? 'Saving...' : 'Save Collection'}</button>
          </form>
          {selected && <>
            <div className="collection-actions">
              <button disabled={busy} onClick={useCollection}>Use as Grocery List</button>
              <button disabled={busy} onClick={() => {
                if (!window.confirm(`Delete "${selected.name}" and all its items?`)) return;
                run(async () => { await api(`/collections/${selected.collection_id}`, { method: 'DELETE' }); setSelected(null); setForm(emptyCollection); await refresh(); setMessage('Collection deleted.'); });
              }}>Delete Collection</button>
            </div>
            <h2>Items</h2>
            {!selected.items.length && <p>This collection is empty.</p>}
            <ul className="collection-items">{selected.items.map(value => <li key={value.collection_item_id}>
              <div><strong>{value.item_name}</strong><p>{value.quantity} {value.unit}{value.brand ? ` · ${value.brand}` : ''} · {value.estimated_unit_price == null ? 'Price not set' : `$${Number(value.estimated_unit_price).toFixed(2)} each`}</p>
                {!!value.dietary_options?.length && <p>{value.dietary_options.join(', ')}</p>}</div>
              <button disabled={busy} aria-label={`Remove ${value.item_name}`} onClick={() => run(async () => {
                await api(`/collections/${selected.collection_id}/items/${value.collection_item_id}`, { method: 'DELETE' }); await refresh(selected.collection_id);
              })}>Remove</button>
            </li>)}</ul>
            <h3>Add Item</h3><form onSubmit={addItem} className="collection-form">
              <label>Item name<input required maxLength={150} value={item.item_name} onChange={e => setItem({ ...item, item_name: e.target.value })} /></label>
              <label>Brand<input maxLength={100} value={item.brand} onChange={e => setItem({ ...item, brand: e.target.value })} /></label>
              <label>Quantity<input required type="number" min="0.01" max="99999999" step="0.01" value={item.quantity} onChange={e => setItem({ ...item, quantity: e.target.value })} /></label>
              <label>Unit<input required maxLength={20} value={item.unit} onChange={e => setItem({ ...item, unit: e.target.value })} /></label>
              <label>Estimated unit price ($)<input type="number" min="0" max="99999999" step="0.01" value={item.estimated_unit_price} onChange={e => setItem({ ...item, estimated_unit_price: e.target.value })} /></label>
              <label>Dietary options (comma separated)<input value={item.dietary_options} onChange={e => setItem({ ...item, dietary_options: e.target.value })} /></label>
              <button disabled={busy}>Add Item</button>
            </form>
          </>}
        </section>
      </div>}
    </main>
  </div>;
}
