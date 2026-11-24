// Bounded read-only smoke benchmark against a local app and its configured DB.
// This is not a production load/stress test. No orders, messages or alerts written.
const { performance } = require('node:perf_hooks');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { pool } = require('../src/config/db');
const app = require('../src/app');
const percentile = (sorted, n) => sorted[Math.max(0, Math.ceil(sorted.length * n) - 1)];

async function main() {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is required for catalogue benchmark.');
  // Test-only subject; catalogue reads do not require or expose a user account.
  const token = jwt.sign({ userId: 2147483647 }, config.jwtSecret, { expiresIn: '5m' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const report = { generatedAt: new Date().toISOString(), node: process.version,
    mode: 'Local Express HTTP + configured database; read-only; 3 concurrent requests; 30 samples per endpoint',
    budget: { p95Ms: 1000, errors: 0 }, results: [] };
  async function measure(route) {
    const start = performance.now();
    try {
      const response = await fetch(base + route, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
      const body = await response.arrayBuffer();
      return { ms: performance.now() - start, status: response.status, bytes: body.byteLength };
    } catch { return { ms: performance.now() - start, status: 0, bytes: 0 }; }
  }
  try {
    const setupStarted = performance.now();
    const storesResponse = await fetch(`${base}/api/stores`, { signal: AbortSignal.timeout(15000) });
    const stores = await storesResponse.json();
    report.initialDatabaseReadMs = Math.round(performance.now() - setupStarted);
    const storeId = stores.stores?.[0]?.store_id;
    if (!storesResponse.ok || !Number.isInteger(storeId)) throw new Error('A seeded store is required.');
    for (const route of ['/health', '/api/stores', `/api/items?store_id=${storeId}&limit=20`, '/api/slots']) {
      const cold = await measure(route);
      // Warm the three pooled connections before collecting steady-state latency.
      await Promise.all(Array.from({ length: 3 }, () => measure(route)));
      const samples = [];
      const started = performance.now();
      for (let batch = 0; batch < 10; batch++) samples.push(...await Promise.all(Array.from({ length: 3 }, () => measure(route))));
      const elapsed = performance.now() - started;
      const times = samples.map(r => r.ms).sort((a, b) => a - b);
      const errors = samples.filter(r => r.status !== 200).length;
      const result = { route, requests: samples.length, coldMs: Math.round(cold.ms), coldStatus: cold.status,
        p50Ms: Math.round(percentile(times, 0.5)), p95Ms: Math.round(percentile(times, 0.95)), maxMs: Math.round(times.at(-1)),
        requestsPerSecond: Number((samples.length / elapsed * 1000).toFixed(1)), errors,
        averageBytes: Math.round(samples.reduce((sum, r) => sum + r.bytes, 0) / samples.length) };
      result.passed = cold.status === 200 && errors === 0 && result.p95Ms <= report.budget.p95Ms;
      report.results.push(result); console.log(JSON.stringify(result));
    }
    const dir = path.join(__dirname, '../../docs/qa'); mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'api-performance-latest.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (report.results.some(r => !r.passed)) process.exitCode = 1;
  } finally {
    await new Promise(resolve => server.close(resolve)); await pool.end();
  }
}
main().catch(error => { console.error('Performance check failed:', error.code || error.name); process.exitCode = 1; });
