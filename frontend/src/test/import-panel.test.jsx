import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportPanel from '../components/grocery/ImportPanel';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn() }));

const pastOrders = [
  { order_id: 12, store_name: 'FreshCo', created_at: '2026-11-01T15:00:00Z', item_count: 2, total_amount: '41.47' },
  { order_id: 13, store_name: 'FreshCo', created_at: '2026-11-02T15:00:00Z', item_count: 0, total_amount: '0' },
];
const order12 = {
  order_id: 12,
  items: [
    { item_id: 1, catalog_item_id: 14, item_name: 'No Name Salmon', unit: 'lb', quantity: 1.5, estimated_price: '10.99', allow_substitution: false },
    { item_id: 2, catalog_item_id: null, item_name: 'Cake', unit: 'each', quantity: 1, estimated_price: '24.99', allow_substitution: true },
  ],
};
const salmon = { item_id: 14, store_id: 2, name: 'Salmon', brand: 'No Name', unit: 'lb', unit_price: 11.49 };

function server(path) {
  if (path === '/orders') return Promise.resolve({ orders: pastOrders });
  if (path === '/orders/12') return Promise.resolve(order12);
  if (path.startsWith('/items?')) return Promise.resolve({ items: [salmon], total: 1 });
  return Promise.reject(new Error(`Unexpected ${path}`));
}

beforeEach(() => {
  api.mockImplementation(server);
});

describe('ImportPanel', () => {
  it('imports a past order into an empty list without asking', async () => {
    const onReplace = vi.fn();
    render(<ImportPanel storeId={2} itemCount={0} onReplace={onReplace} />);

    const select = await screen.findByRole('combobox', { name: 'Past order to import' });
    expect(screen.queryByRole('option', { name: /#13/ })).toBeNull();
    await userEvent.selectOptions(select, '12');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(onReplace).toHaveBeenCalledTimes(1));
    expect(api).toHaveBeenCalledWith('/items?store_id=2&ids=14&limit=50');
    const [items, notice] = onReplace.mock.calls[0];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ catalogItemId: 14, estimatedPrice: 11.49, quantity: 1.5 });
    expect(items[1]).toMatchObject({ name: 'Cake', notInCatalog: true, allowSubstitution: true });
    expect(notice).toMatch(/Imported 2 items from order #12\. 1 isn't/);
  });

  it('asks before replacing a list that has items', async () => {
    const onReplace = vi.fn();
    render(<ImportPanel storeId={2} itemCount={3} onReplace={onReplace} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start a new list' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start fresh' }));
    expect(screen.getByText('This replaces the 3 items in your list.')).toBeTruthy();
    expect(onReplace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Keep my list' }));
    expect(onReplace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Start fresh' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, replace it' }));
    expect(onReplace).toHaveBeenCalledWith([], 'Started a new list.');
  });

  it('shows a load error with a retry', async () => {
    api.mockRejectedValueOnce(new Error('Unable to load your orders.'));
    render(<ImportPanel storeId={2} itemCount={0} onReplace={vi.fn()} />);

    expect(await screen.findByText(/Unable to load your orders\./)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('combobox', { name: 'Past order to import' })).toBeTruthy();
  });
});
