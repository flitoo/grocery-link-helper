import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import useOrderFeed from '../hooks/useOrderFeed';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
beforeEach(() => { vi.useFakeTimers(); api.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const answer = path => Promise.resolve(path.startsWith('/orders/') ? { status: 'Shopping' } : []);

it('polls after 15 seconds and shows the next status', async () => {
  api.mockImplementation(answer);
  const { result } = renderHook(() => useOrderFeed('42'));
  await act(async () => {});
  expect(result.current.data.order.status).toBe('Shopping');
  api.mockImplementation(path => Promise.resolve(path.startsWith('/orders/') ? { status: 'Out_for_Delivery' } : []));
  await act(async () => { await vi.advanceTimersByTimeAsync(14999); });
  expect(api).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(result.current.data.order.status).toBe('Out_for_Delivery');
});
it('does not overlap slow loads and aborts both requests on unmount', async () => {
  api.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(() => useOrderFeed('42'));
  const signal = api.mock.calls[0][1].signal;
  await act(async () => { await vi.advanceTimersByTimeAsync(45000); });
  expect(api).toHaveBeenCalledTimes(2);
  unmount(); expect(signal.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(api).toHaveBeenCalledTimes(2);
});
it('ignores an obsolete response after a manual refresh', async () => {
  const pending = [];
  api.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const { result } = renderHook(() => useOrderFeed('42'));
  const oldSignal = api.mock.calls[0][1].signal;
  api.mockImplementation(answer);
  await act(async () => { result.current.refresh(); });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { pending[0]({ status: 'Assigned' }); pending[1]([]); });
  expect(result.current.data.order.status).toBe('Shopping');
});
it('clears stale data after a poll error and recovers on the next poll', async () => {
  api.mockImplementation(answer);
  const { result } = renderHook(() => useOrderFeed('42'));
  await act(async () => {});
  api.mockRejectedValue(new Error('Network unavailable'));
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBe('Network unavailable');
  api.mockImplementation(answer);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(result.current.error).toBe('');
  expect(result.current.data.order.status).toBe('Shopping');
});
