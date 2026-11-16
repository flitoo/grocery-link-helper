import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// One request at a time; abort obsolete loads when the route changes or refreshes.
export default function useOrderFeed(orderId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const [order, requests] = await Promise.all([
          api(`/orders/${encodeURIComponent(orderId)}`, { signal: controller.signal, cache: 'no-store' }),
          api(`/substitution-requests/orders/${encodeURIComponent(orderId)}`, { signal: controller.signal, cache: 'no-store' }),
        ]);
        if (!controller.signal.aborted) {
          setData({ order, requests, checkedAt: new Date() });
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          // Do not offer actions against stale order state after a failed refresh.
          setData(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          timer = setTimeout(load, 15000);
        }
      }
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderId, revision]);

  function refresh() {
    setLoading(true);
    setRevision(value => value + 1);
  }
  return { data, error, loading, refresh };
}
