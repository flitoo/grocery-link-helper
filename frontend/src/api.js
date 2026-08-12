const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error((body && body.error) || `Request failed (${response.status})`);
  }
  return body;
}

export function getStores() {
  return request('/api/stores');
}

export function createOrder(order) {
  return request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
}
