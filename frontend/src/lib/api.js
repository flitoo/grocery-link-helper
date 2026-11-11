export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function api(path, { body, headers, ...options } = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please log in to continue.');
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.errors?.[0] || data.error || `Request failed (${response.status}).`);
  return data;
}
