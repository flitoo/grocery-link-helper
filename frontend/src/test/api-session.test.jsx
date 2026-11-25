import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { api, clearSession } from '../lib/api';

function seedSession() {
  for (const key of ['token', 'user', 'orderId', 'customerId', 'groceryItems', 'currentOrder']) {
    localStorage.setItem(key, key === 'user' ? '{"id":7}' : 'x');
  }
}

describe('session handling', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('clearSession removes the login and every saved draft', () => {
    seedSession();

    clearSession();

    expect(localStorage.length).toBe(0);
  });

  it('logout clears the previous account, including the saved order id', async () => {
    seedSession();
    render(<MemoryRouter><AppHeader /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(localStorage.getItem('orderId')).toBeNull();
    expect(localStorage.getItem('customerId')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('signs out when the server rejects the token', async () => {
    seedSession();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ errors: ['The bearer token is invalid or expired.'] }),
    })));

    await expect(api('/orders')).rejects.toThrow('Your session has expired. Please log in again.');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('groceryItems')).toBeNull();
  });

  it('keeps the session for other errors', async () => {
    seedSession();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ errors: ['Order not found.'] }),
    })));

    await expect(api('/orders/1')).rejects.toThrow('Order not found.');

    expect(localStorage.getItem('token')).toBe('x');
  });
});
