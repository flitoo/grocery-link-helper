import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderTracking from '../pages/OrderTracking';
import SubstitutionRequests from '../pages/SubstitutionRequests';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
let order;
let requests;

function mount(page = 'tracking', helper = false) {
  localStorage.setItem('user', JSON.stringify({ id: helper ? 7 : 3 }));
  return render(<MemoryRouter initialEntries={[`/orders/42/${page}`]}><Routes>
    <Route path="/orders/:orderId/tracking" element={<OrderTracking />} />
    <Route path="/orders/:orderId/substitutions" element={<SubstitutionRequests helper={helper} />} />
  </Routes></MemoryRouter>);
}
function pending(id = 10, itemId = 1) {
  return { substitution_id: id, original_item_id: itemId, suggested_item_name: 'Oat milk', price_difference: '-0.50', status: 'Pending' };
}
async function server(path, options = {}) {
  if (options.method === 'PATCH') {
    const item = requests.find(r => String(r.substitution_id) === path.split('/').at(-1));
    item.status = options.body.status;
    return structuredClone(item);
  }
  if (options.method === 'POST') {
    const item = { ...options.body, substitution_id: 20, status: 'Pending' };
    requests.push(item);
    return structuredClone(item);
  }
  return structuredClone(path.startsWith('/substitution-requests') ? requests : order);
}
beforeEach(() => {
  order = { order_id: 42, customer_id: 3, helper_id: 7, helper_name: 'Alex Helper', status: 'Shopping',
    delivery_slot: '2099-01-01T18:00:00.000Z', delivery_address: '123 Queen Street', items: [
      { item_id: 1, item_name: 'Milk', quantity: 1, allow_substitution: true },
      { item_id: 2, item_name: 'Bread', quantity: 2, allow_substitution: false },
    ] };
  requests = [];
  api.mockReset().mockImplementation(server);
});

describe('Order tracking screen', () => {
  it.each(['Pending', 'Paid', 'Assigned', 'Shopping', 'Out_for_Delivery', 'Delivered'])('shows the correct progress for %s', async status => {
    order.status = status;
    const { container } = mount();
    await screen.findByRole('heading', { name: 'Order progress' });
    expect(container.querySelector('[aria-current="step"]').textContent).toContain(status.replaceAll('_', ' '));
    expect(screen.queryByRole('link', { name: 'Rate Delivery' }) !== null).toBe(status === 'Delivered');
  });
  it('shows cancellation without an active progress step or pending-review prompt', async () => {
    order.status = 'Cancelled'; requests = [pending()];
    const { container } = mount();
    await screen.findByText('This order will not proceed to delivery.');
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Review Replacements' })).toBeNull();
  });
  it('shows delivery details and links to pending replacement review', async () => {
    requests = [pending()]; mount();
    await screen.findByText('Alex Helper');
    expect(screen.getByText('123 Queen Street')).toBeTruthy();
    expect(screen.getByText(/Jan 1, 2099/).textContent).toContain('1:00');
    expect(screen.getByRole('link', { name: 'Review Replacements' }).getAttribute('href')).toBe('/orders/42/substitutions');
    expect(screen.getByRole('link', { name: 'Chat with Helper' }).getAttribute('href')).toBe('/orders/42/chat');
  });
  it('refreshes to Delivered and removes a stale pending-review prompt', async () => {
    requests = [pending()]; mount(); await screen.findByText('Alex Helper');
    order.status = 'Delivered';
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('link', { name: 'Rate Delivery' });
    expect(screen.queryByRole('link', { name: 'Review Replacements' })).toBeNull();
  });
  it('shows loading, then a safe access error without order details', async () => {
    let reject;
    api.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    mount(); expect(screen.getByRole('status').textContent).toContain('Loading order progress');
    await act(async () => reject(new Error('Order not found.')));
    expect((await screen.findByRole('alert')).textContent).toBe('Order not found.');
    expect(screen.queryByText('123 Queen Street')).toBeNull();
  });
});

describe('Substitution request screen', () => {
  it('shows the empty state', async () => {
    mount('substitutions'); await screen.findByText('No replacement requests yet.');
  });
  it.each(['Approved', 'Rejected'])('lets the customer decide %s and refreshes the result', async status => {
    requests = [pending()]; mount('substitutions');
    const verb = status === 'Approved' ? 'Approve' : 'Reject';
    await userEvent.click(await screen.findByRole('button', { name: `${verb} Oat milk` }));
    await screen.findByText(status);
    expect(api).toHaveBeenCalledWith('/substitution-requests/orders/42/10', { method: 'PATCH', body: { status } });
    expect(screen.queryByRole('button', { name: 'Approve Oat milk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject Oat milk' })).toBeNull();
  });
  it.each(['Delivered', 'Cancelled'])('disables decisions for %s orders', async status => {
    requests = [pending()]; order.status = status; mount('substitutions');
    await screen.findByText('Pending');
    expect(screen.queryByRole('button', { name: 'Approve Oat milk' })).toBeNull();
  });
  it('lets the assigned helper propose only eligible items and trims the name', async () => {
    mount('substitutions', true);
    const item = await screen.findByLabelText('Original item');
    expect(screen.queryByRole('option', { name: /Bread/ })).toBeNull();
    await userEvent.selectOptions(item, '1');
    await userEvent.type(screen.getByLabelText('Suggested replacement'), '  Oat milk  ');
    fireEvent.change(screen.getByLabelText('Price difference (CAD)'), { target: { value: '-0.50' } });
    await userEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByText('Pending');
    expect(api).toHaveBeenCalledWith('/substitution-requests/orders/42', { method: 'POST', body: {
      original_item_id: 1, suggested_item_name: 'Oat milk', price_difference: -0.5,
    } });
    expect(screen.queryByRole('button', { name: 'Send Request' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve Oat milk' })).toBeNull();
  });
  it.each(['Pending', 'Approved'])('excludes an item with a %s replacement', async status => {
    requests = [{ ...pending(), status }]; mount('substitutions', true);
    await screen.findByText(/No eligible items/);
    expect(screen.queryByRole('button', { name: 'Send Request' })).toBeNull();
  });
  it('allows a new proposal after rejection', async () => {
    requests = [{ ...pending(), status: 'Rejected' }]; mount('substitutions', true);
    expect(await screen.findByRole('option', { name: /Milk/ })).toBeTruthy();
  });
  it.each(['Assigned', 'Out_for_Delivery', 'Delivered', 'Cancelled'])('hides the proposal form while %s', async status => {
    order.status = status; mount('substitutions', true);
    await screen.findByText(/Only the assigned helper can send requests/);
    expect(screen.queryByRole('button', { name: 'Send Request' })).toBeNull();
  });
  it('hides the proposal form for a different helper', async () => {
    order.helper_id = 99; mount('substitutions', true);
    await screen.findByText(/Only the assigned helper can send requests/);
  });
  it('blocks a double decision while saving', async () => {
    requests = [pending()]; let finish;
    api.mockImplementation((path, options) => options?.method === 'PATCH'
      ? new Promise(resolve => { finish = () => { requests[0].status = 'Approved'; resolve(requests[0]); }; }) : server(path, options));
    mount('substitutions'); const button = await screen.findByRole('button', { name: 'Approve Oat milk' });
    await userEvent.click(button);
    expect(button.disabled).toBe(true);
    await userEvent.click(button);
    expect(api.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1);
    await act(async () => finish());
    await screen.findByText('Approved');
  });
  it('clears stale decisions on a failed refresh and recovers on retry', async () => {
    requests = [pending()]; mount('substitutions');
    await screen.findByRole('button', { name: 'Approve Oat milk' });
    api.mockRejectedValue(new Error('Please log in to continue.'));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Approve Oat milk' })).toBeNull();
    api.mockImplementation(server);
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('button', { name: 'Approve Oat milk' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('reports a failed decision without showing a success message', async () => {
    requests = [pending()];
    api.mockImplementation((path, options) => options?.method === 'PATCH'
      ? Promise.reject(new Error('Pending substitution request not found.')) : server(path, options));
    mount('substitutions');
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Oat milk' }));
    expect((await screen.findByRole('alert')).textContent).toContain('not found');
    expect(screen.queryByText('Replacement approved.')).toBeNull();
  });
});
