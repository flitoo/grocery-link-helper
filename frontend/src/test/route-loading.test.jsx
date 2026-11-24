import { Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { lazyRoute, preloadInitialRoute } from '../lib/routeLoading';

it('loads only the matching initial page, once, and renders without a fallback', async () => {
  const load = vi.fn(async () => ({ default: ({ name }) => <h1>{name}</h1> }));
  const unrelated = vi.fn(async () => ({ default: () => <h1>Other</h1> }));
  const Page = lazyRoute('/test-startup/:id', load);
  lazyRoute('/test-unrelated', unrelated);
  await preloadInitialRoute('/test-startup/42');
  await preloadInitialRoute('/test-startup/42');
  render(<Suspense fallback={<p>Loading page</p>}><Page name="Ready page" /></Suspense>);
  expect(screen.getByRole('heading', { name: 'Ready page' })).toBeTruthy();
  expect(screen.queryByText('Loading page')).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
  expect(unrelated).not.toHaveBeenCalled();
});

it('keeps noninitial routes lazy and forwards their props', async () => {
  const load = vi.fn(async () => ({ default: ({ helper }) => <h1>{helper ? 'Helper page' : 'Customer page'}</h1> }));
  const Page = lazyRoute(['/test-later', '/test-helper-later'], load);
  await preloadInitialRoute('/test-no-match');
  expect(load).not.toHaveBeenCalled();
  render(<Suspense fallback={<p>Loading page</p>}><Page helper /></Suspense>);
  expect(await screen.findByRole('heading', { name: 'Helper page' })).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('preserves page input when a parent rerenders after a lazy import resolves', async () => {
  const Page = lazyRoute('/test-state', async () => ({ default: () => <input aria-label="Draft" defaultValue="" /> }));
  const view = render(<Suspense fallback={<p>Loading page</p>}><Page /></Suspense>);
  const input = await screen.findByRole('textbox', { name: 'Draft' });
  fireEvent.change(input, { target: { value: 'Keep this draft' } });
  view.rerender(<Suspense fallback={<p>Loading page</p>}><Page /></Suspense>);
  expect(screen.getByRole('textbox', { name: 'Draft' }).value).toBe('Keep this draft');
});
