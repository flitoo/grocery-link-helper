import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { routes, responseFor, storageFor } from './audit-fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Supply the package's axe source explicitly: its default resolver mishandles
// percent-encoded spaces in Windows workspace paths.
const require = createRequire(import.meta.url);
const axeSource = readFileSync(createRequire(require.resolve('@axe-core/puppeteer')).resolve('axe-core'), 'utf8');
const reportDir = resolve(root, '../docs/qa');
const label = process.argv.find(arg => arg.startsWith('--label='))?.slice(8) || (process.argv.includes('--baseline') ? 'baseline' : 'latest');
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid report label.');
const onlyPerformance = process.argv.includes('--performance');
const runCount = Number(process.argv.find(arg => arg.startsWith('--runs='))?.slice(7) || 1);
if (!Number.isInteger(runCount) || runCount < 1 || runCount > 5) throw new Error('--runs must be between 1 and 5.');
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
if (!chrome) throw new Error('Set CHROME_PATH to an installed Chrome/Chromium executable.');
const files = new Map();
function collect(dir, prefix = '') {
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    if (file.isDirectory()) collect(join(dir, file.name), `${prefix}/${file.name}`);
    else files.set(`${prefix}/${file.name}`, readFileSync(join(dir, file.name)));
  }
}
collect(join(root, 'dist'));
const server = createServer((req, res) => {
  const key = new URL(req.url, 'http://localhost').pathname;
  const body = files.get(key) || files.get('/index.html');
  const type = files.has(key) ? extname(key) : '.html';
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[type] || 'application/octet-stream';
  const zipped = gzipSync(body);
  res.writeHead(200, { 'Content-Type': mime, 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store' }); res.end(zipped);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try { browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-first-run', '--disable-extensions'] }); }
catch (error) { server.close(); throw error; }
const report = { generatedAt: new Date().toISOString(), browser: await browser.version(),
  mode: 'Production build; synthetic authenticated fixtures; local gzip static server', results: [] };

async function prepare(route, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    if (request.isInterceptResolutionHandled()) return;
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      try {
        if (request.method() === 'OPTIONS') return void await request.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
        if (request.method() !== 'GET') throw new Error(`Unexpected mutation: ${request.method()} ${url.pathname}`);
        const { _status = 200, ...data } = Array.isArray(responseFor(url.pathname, route))
          ? { result: responseFor(url.pathname, route), _array: true } : responseFor(url.pathname, route);
        await request.respond({ status: _status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(data._array ? data.result : data) });
      } catch (error) { failures.push(error.message); await request.respond({ status: 500, body: '{}' }); }
    } else if (url.origin === origin || url.protocol === 'data:') await request.continue();
    else await request.abort();
  });
  await page.evaluateOnNewDocument(storage => {
    localStorage.clear(); for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, storageFor(route));
  return { page, failures };
}

try {
  if (onlyPerformance) {
    const { startFlow } = await import('lighthouse');
    for (let run = 1; run <= runCount; run++) {
    for (const route of ['/', '/grocery-list', '/orders/42/tracking']) {
      const { page, failures } = await prepare(route, { width: 390, height: 844 });
      const flow = await startFlow(page, { name: `Performance ${route}`, config: { extends: 'lighthouse:default',
        settings: { onlyCategories: ['performance'], disableStorageReset: true } } });
      await flow.navigate(`${origin}${route}`);
      const { steps } = await flow.createFlowResult();
      const lhr = steps[0].lhr;
      const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight']
        .map(id => [id, { value: lhr.audits[id].numericValue, unit: lhr.audits[id].numericUnit }]));
      const entry = { route, run, score: Math.round(lhr.categories.performance.score * 100), metrics, failures,
        warnings: lhr.runWarnings, environment: lhr.environment, throttling: lhr.configSettings.throttling,
        diagnostics: Object.fromEntries(['mainthread-work-breakdown', 'bootup-time', 'long-tasks', 'network-requests', 'layout-shifts', 'unused-javascript']
          .filter(id => lhr.audits[id]).map(id => [id, lhr.audits[id].details])) };
      report.results.push(entry); console.log(JSON.stringify({ route, score: entry.score, metrics, failures })); await page.close();
    }
    }
    const median = values => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    report.budgets = { score: 90, lcpMs: 2500, tbtMs: 200, cls: 0.1 };
    report.summary = [...new Set(report.results.map(result => result.route))].map(route => {
      const samples = report.results.filter(result => result.route === route);
      const metric = id => median(samples.map(result => result.metrics[id].value));
      const entry = { route, runs: samples.length, score: median(samples.map(result => result.score)),
        lcpMs: metric('largest-contentful-paint'), tbtMs: metric('total-blocking-time'), cls: metric('cumulative-layout-shift') };
      entry.passed = entry.score >= report.budgets.score && entry.lcpMs <= report.budgets.lcpMs &&
        entry.tbtMs <= report.budgets.tbtMs && entry.cls <= report.budgets.cls;
      return entry;
    });
  } else {
    for (const [viewportName, viewport] of Object.entries({ desktop: { width: 1365, height: 900 }, mobile: { width: 390, height: 844 } })) {
      for (const route of routes) {
        const { page, failures } = await prepare(route, viewport);
        await page.goto(`${origin}${route}`, { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => document.querySelector('#root')?.textContent.trim().length > 20);
        let keyboard;
        if (label !== 'baseline') {
          await page.keyboard.press('Tab');
          const skipFirst = await page.evaluate(() => document.activeElement?.classList.contains('skip-link'));
          await page.keyboard.press('Enter');
          const skipTargetsMain = await page.evaluate(() => document.activeElement?.id === 'main-content');
          await page.keyboard.press('Tab');
          const visibleFocus = await page.evaluate(() => {
            const style = getComputedStyle(document.activeElement);
            return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
          });
          keyboard = { skipFirst, skipTargetsMain, visibleFocus };
          if (!skipFirst || !skipTargetsMain || !visibleFocus) failures.push('Keyboard skip/focus check failed');
        }
        const result = await new AxePuppeteer(page, axeSource).analyze();
        const layout = await page.evaluate(() => ({
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          mainCount: document.querySelectorAll('main, [role="main"]').length,
          h1Count: document.querySelectorAll('h1').length,
        }));
        const entry = { route, viewport: viewportName, ...layout, keyboard, failures,
          violations: result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.help, tags: v.tags,
            nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })),
          needsReview: result.incomplete.map(v => ({ id: v.id, count: v.nodes.length })) };
        report.results.push(entry); console.log(JSON.stringify({ route, viewport: viewportName, issues: entry.violations.map(v => `${v.id}:${v.nodes.length}`), ...layout, failures }));
        if (label !== 'baseline' && ['/', '/grocery-list', '/collections'].includes(route)) {
          if (route === '/') await page.click('button[type="submit"]');
          if (route === '/grocery-list') {
            await page.focus('.custom-item-details summary'); await page.keyboard.press('Enter');
          }
          if (route === '/collections') {
            await page.click('.collection-choice');
            await page.waitForFunction(() => document.body.textContent.includes('Add Item'));
          }
          const expanded = await new AxePuppeteer(page, axeSource).analyze();
          const expandedEntry = { route, state: route === '/' ? 'validation-error' : 'expanded-form', viewport: viewportName,
            failures: [], violations: expanded.violations.map(v => ({ id: v.id, impact: v.impact, description: v.help,
              nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
          report.results.push(expandedEntry);
          console.log(JSON.stringify({ route, state: expandedEntry.state, viewport: viewportName, issues: expandedEntry.violations.map(v => v.id) }));
        }
        if (label !== 'baseline' && route === '/dashboard') {
          await page.click('nav a[href="/orders"]');
          try {
            await page.waitForFunction(() => location.pathname === '/orders' && document.activeElement?.id === 'main-content' &&
              document.activeElement.getClientRects().length > 0 && document.title.startsWith('My Orders'), { timeout: 5000 });
            entry.clientNavigationPassed = true;
          } catch { entry.clientNavigationPassed = false; entry.failures.push('Client-side navigation did not move focus to loaded content'); }
        }
        await page.close();
      }
    }
  }
} finally {
  mkdirSync(reportDir, { recursive: true });
  const output = join(reportDir, `${onlyPerformance ? 'performance' : 'accessibility'}-${label}.json`);
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved ${output}`);
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
if (report.results.some(r => r.failures.length || r.violations?.length || r.horizontalOverflow) ||
  report.summary?.some(result => !result.passed)) process.exitCode = 1;
