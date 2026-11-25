import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderDetails from '../pages/OrderDetails';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ API_BASE: 'http://test', api: vi.fn(), clearSession: vi.fn() }));

let order;

function mount() {
  return render(
    <MemoryRouter initialEntries={['/order-details/42']}>
      <Routes><Route path="/order-details/:orderId" element={<OrderDetails />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.setItem('token', 't');
  localStorage.setItem('user', JSON.stringify({ id: 3, role: 'Customer' }));
  order = {
    order_id: 42, customer_id: 3, store_id: 1, status: 'Pending', total_amount: '5.00',
    delivery_address: '1 Test St', delivery_slot: '2099-01-01T18:00:00.000Z', items: [],
  };
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = String(url);
    const body = path.endsWith('/api/stores') ? { stores: [] }
      : path.includes('/api/payments/') ? null
      : order;
    return { ok: body !== null, status: body ? 200 : 404, json: async () => body };
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('cancelling an order from its details page', () => {
  it('asks for confirmation, then cancels and updates the page', async () => {
    api.mockResolvedValue({ order_id: 42, status: 'Cancelled' });
    mount();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Order' }));
    expect(api).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));

    expect(api).toHaveBeenCalledWith('/orders/42/cancel', { method: 'POST' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel Order' })).toBeNull());
    expect(screen.queryByText('Cancelled')).not.toBeNull();
  });

  it('keeps the order when the customer backs out', async () => {
    mount();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Order' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep order' }));

    expect(api).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cancel Order' })).not.toBeNull();
  });

  it('shows the server message when cancelling fails', async () => {
    api.mockRejectedValue(new Error('Only unpaid orders can be cancelled. This order is Paid.'));
    mount();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Order' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Only unpaid orders/);
  });

  it('offers no cancel button once the order is paid', async () => {
    order.status = 'Paid';
    mount();

    await screen.findByText('Track Order');

    expect(screen.queryByRole('button', { name: 'Cancel Order' })).toBeNull();
  });

  it('stops the payment screen from reusing a cancelled order', async () => {
    localStorage.setItem('orderId', '42');
    localStorage.setItem('currentOrder', '{"id":42}');
    api.mockResolvedValue({ order_id: 42, status: 'Cancelled' });
    mount();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Order' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));

    await waitFor(() => expect(localStorage.getItem('orderId')).toBeNull());
    expect(localStorage.getItem('currentOrder')).toBeNull();
  });
});
