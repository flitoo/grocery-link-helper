import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeliveryNotifications from '../pages/DeliveryNotifications';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn(), clearSession: vi.fn() }));

const KEY = 'deliveryNotifications:5';
const staleDelivered = {
  id: '12:Delivered', orderId: 12, title: 'Order Delivered',
  message: 'Your groceries have been delivered.', detectedAt: '2026-11-20T10:00:00.000Z', read: false,
};

function serve(orders) {
  api.mockImplementation(async (path) => (path === '/orders' ? { orders } : { notifications: [] }));
}

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ id: 5, role: 'Customer' }));
  localStorage.setItem(KEY, JSON.stringify([staleDelivered]));
});

describe('DeliveryNotifications cache', () => {
  it('drops cached notifications for orders the server no longer has', async () => {
    serve([]);
    render(<MemoryRouter><DeliveryNotifications /></MemoryRouter>);

    await waitFor(() => expect(screen.queryByText('No notifications yet')).not.toBeNull());
    expect(screen.queryByText('Order Delivered')).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([]);
  });

  it('keeps cached notifications for orders that still exist', async () => {
    serve([{ order_id: 12, customer_id: 5, status: 'Delivered' }]);
    render(<MemoryRouter><DeliveryNotifications /></MemoryRouter>);

    await waitFor(() => expect(screen.queryByText('Order Delivered')).not.toBeNull());
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(1);
  });
});
