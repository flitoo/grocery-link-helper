import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListItemRow from '../components/grocery/ListItemRow';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn() }));

const salmon = { id: 'catalog-14', catalogItemId: 14, storeId: 2, name: 'Salmon', brand: 'No Name', unit: 'lb', quantity: 1.5, estimatedPrice: 10.99, allowSubstitution: false };
const cake = { id: 'c', name: 'Cake', unit: 'each', quantity: 1, estimatedPrice: 24.99, allowSubstitution: false };

function mount(item) {
  const handlers = { onRemove: vi.fn(), onUpdate: vi.fn(), onSwap: vi.fn() };
  render(<ListItemRow item={item} {...handlers} />);
  return handlers;
}

describe('ListItemRow', () => {
  it('commits a valid quantity and rejects an invalid one', async () => {
    const { onUpdate } = mount(cake);
    const box = screen.getByRole('spinbutton', { name: 'Quantity of Cake' });

    await userEvent.clear(box);
    await userEvent.type(box, '1.5{Enter}');
    expect(screen.getByRole('alert').textContent).toMatch(/whole number/);
    expect(onUpdate).not.toHaveBeenCalled();

    await userEvent.clear(box);
    await userEvent.type(box, '3{Enter}');
    expect(onUpdate).toHaveBeenCalledWith('c', { quantity: 3 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('lets a custom line change its price but not a catalog line', async () => {
    const { onUpdate } = mount(cake);
    const price = screen.getByRole('spinbutton', { name: 'Price of Cake' });
    await userEvent.clear(price);
    await userEvent.type(price, '19.5');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith('c', { estimatedPrice: 19.5 });
    expect(screen.queryByRole('button', { name: 'Swap brand' })).toBeNull();
  });

  it('toggles substitution and removes', async () => {
    const { onUpdate, onRemove } = mount(salmon);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onUpdate).toHaveBeenCalledWith('catalog-14', { allowSubstitution: true });
    await userEvent.click(screen.getByRole('button', { name: 'Remove Salmon' }));
    expect(onRemove).toHaveBeenCalledWith('catalog-14');
  });

  it('swaps brand from the alternatives list', async () => {
    const pc = { item_id: 15, store_id: 2, name: 'Salmon', brand: 'PC', unit: 'lb', unit_price: 12.99 };
    api.mockResolvedValueOnce({ item: {}, alternatives: [pc] });
    const { onSwap } = mount(salmon);

    expect(screen.queryByRole('spinbutton', { name: 'Price of Salmon' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Swap brand' }));
    await userEvent.click(await screen.findByRole('button', { name: 'PC · $12.99 / lb' }));
    expect(api).toHaveBeenCalledWith('/items/14/alternatives');
    expect(onSwap).toHaveBeenCalledWith('catalog-14', pc);
  });

  it('says when there are no other brands', async () => {
    api.mockResolvedValueOnce({ item: {}, alternatives: [] });
    mount(salmon);
    await userEvent.click(screen.getByRole('button', { name: 'Swap brand' }));
    expect(await screen.findByText('No other brands of this item at this store.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Swap brand' })).toBeTruthy();
  });
});
