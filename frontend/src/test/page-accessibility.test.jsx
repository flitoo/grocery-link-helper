import { expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import PageAccessibility from '../components/PageAccessibility';

function mount() {
  return render(<MemoryRouter><PageAccessibility /><Routes>
    <Route path="/" element={<main id="main-content" tabIndex={-1}><h1>Login</h1><Link to="/orders">My Orders</Link></main>} />
    <Route path="/orders" element={<main id="main-content" tabIndex={-1}><h1>My Orders</h1></main>} />
  </Routes></MemoryRouter>);
}
it('uses a meaningful document title', async () => {
  mount(); await waitFor(() => expect(document.title).toBe('Login | Grocery Link Helper'));
});
it('makes the first keyboard stop a skip link that focuses main content', async () => {
  mount(); const user = userEvent.setup(); await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Skip to main content' }));
  await user.keyboard('{Enter}'); expect(document.activeElement).toBe(screen.getByRole('main'));
});
it('moves focus and updates the title after client-side navigation', async () => {
  mount(); await userEvent.click(screen.getByRole('link', { name: 'My Orders' }));
  await waitFor(() => expect(document.title).toBe('My Orders | Grocery Link Helper'));
  expect(document.activeElement).toBe(screen.getByRole('main'));
});
