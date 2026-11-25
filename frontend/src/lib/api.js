export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Everything saved in this browser for the signed-in account: the login plus
// drafts and cached orders, which must not leak to the next person to log in.
const SESSION_KEYS = [
  'token', 'user', 'customerId', 'orderId', 'orders', 'groceryItems',
  'selectedStore', 'deliverySlot', 'deliveryAddress', 'currentOrder',
];

export function clearSession() {
  for (const key of SESSION_KEYS) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
}

export async function api(path, { body, headers, ...options } = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to continue.');
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    // The token expired or was rejected: sign out and return to the login page.
    clearSession();
    if (window.location.pathname !== '/') window.location.assign('/');
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!response.ok) throw new Error(data.errors?.[0] || data.error || `Request failed (${response.status}).`);
  return data;
}
