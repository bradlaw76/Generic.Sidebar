'use strict';

// Dependency-free, read-only characterization of both public release pages.
// These checks run against the HTML actually present in the pull-request checkout.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const pages = ['index.html', 'downloads/index.html'];

function readChartScript(page) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.trim())
    .map(([, , content]) => content);
  const source = scripts.find(s => s.includes('function updateChartSafely('));
  assert.ok(source, page + ': expected inline chart script');
  new vm.Script(source, { filename: page });
  const start = source.indexOf('function showChartUnavailable()');
  const table = source.search(/function updateTable\s*\(data\)/);
  assert.ok(start >= 0 && table > start, page + ': expected bounded chart functions');
  return { source, fragment: source.slice(start, table) };
}

function harness(fragment) {
  let note = null;
  let warnings = 0;
  let destroys = 0;
  const canvas = {
    style: { display: '' },
    parentElement: { appendChild(element) { note = element; } },
    getContext() { return {}; }
  };
  const document = {
    getElementById(id) {
      if (id === 'releaseChart') return canvas;
      return note && note.id === id ? note : null;
    },
    createElement(tag) {
      assert.equal(tag, 'p');
      return {
        id: '',
        role: '',
        textContent: '',
        setAttribute(name, value) { this[name] = value; },
        remove() { note = null; }
      };
    }
  };
  const context = vm.createContext({
    document,
    console: { warn() { warnings++; } },
    buildDatasets() { return []; }
  });
  vm.runInContext('let chart;\n' + fragment, context);
  const update = vm.runInContext('updateChartSafely', context);
  return {
    context, canvas, update,
    get note() { return note; },
    get warnings() { return warnings; },
    get destroys() { return destroys; },
    goodChart() {
      context.Chart = function Chart() {
        return { destroy() { destroys++; } };
      };
    }
  };
}

for (const page of pages) {
  test(page + ': parses inline JavaScript and preserves table-first updates', () => {
    const { source } = readChartScript(page);
    if (page === 'index.html') {
      assert.match(source, /updateTable\(releaseData\);\s*updateChartSafely\(releaseData\);/);
    } else {
      const pairs = source.match(/updateTable\(viewData\);\s*updateChartSafely\(viewData\);/g) || [];
      assert.ok(pairs.length >= 3, 'initial load and both filter handlers must update table first');
    }
  });

  test(page + ': absent Chart.js leaves accessible fallback and no exception', () => {
    const h = harness(readChartScript(page).fragment);
    assert.doesNotThrow(() => h.update([]));
    assert.equal(h.canvas.style.display, 'none');
    assert.equal(h.note?.id, 'chartUnavailable');
    assert.equal(h.note?.role, 'status');
    h.update([]);
    assert.equal(h.note?.id, 'chartUnavailable', 'repeated failure remains one notice');
  });

  test(page + ': throwing chart is isolated; later recovery restores canvas', () => {
    const h = harness(readChartScript(page).fragment);
    const data = page === 'index.html'
      ? [{ tag: 'v1', assets: [], total: 1 }]
      : [{ tagName: 'v1', assets: [], totalDownloads: 1 }];
    h.goodChart();
    assert.doesNotThrow(() => h.update(data));
    assert.equal(h.canvas.style.display, '');
    h.context.Chart = function BrokenChart() { throw new Error('synthetic chart error'); };
    assert.doesNotThrow(() => h.update(data));
    assert.equal(h.warnings, 1);
    assert.equal(h.destroys, 1);
    assert.equal(h.canvas.style.display, 'none');
    assert.equal(h.note?.id, 'chartUnavailable');
    h.goodChart();
    assert.doesNotThrow(() => h.update(data));
    assert.equal(h.canvas.style.display, '');
    assert.equal(h.note, null);
  });
}

for (const page of pages) {
  test(page + ': formula-like CSV metadata is exported as text, not spreadsheet code', () => {
    const { source } = readChartScript(page);
    const start = source.indexOf('function csvEscapeCell(cell) {');
    const end = source.indexOf('\n    }', start);
    assert.ok(start >= 0 && end > start, page + ': expected CSV escaping helper');
    assert.match(source, /\.map\(csvEscapeCell\)/, page + ': exporter must use the helper');
    const escape = vm.runInNewContext(source.slice(start, end + '\n    }'.length) + '\ncsvEscapeCell');
    assert.equal(escape('=1+1'), "'=1+1");
    assert.equal(escape(' +SUM(1)'), "' +SUM(1)");
    assert.equal(escape('\t@SUM(A1:A2)'), "'\t@SUM(A1:A2)");
    assert.equal(escape('-1'), "'-1");
    assert.equal(escape(25), '25');
    assert.equal(escape('alpha,beta'), '"alpha,beta"');
    assert.equal(escape('alpha "beta"'), '"alpha ""beta"""');
    assert.equal(escape('\r=1+1'), '"\'\r=1+1"');
  });
}


// Exercise the actual landing-page API/load functions; never contact GitHub.
function statsHarness(fetch, timers = { setTimeout, clearTimeout }) {
  const { source } = readChartScript('index.html');
  const start = source.indexOf('async function withReleaseDeadline(');
  const end = source.indexOf('function showChartUnavailable()', start);
  const loadStart = source.indexOf('async function loadStats()');
  const loadEnd = source.indexOf("document.getElementById('toggleLegendButton').addEventListener", loadStart);
  assert.ok(start >= 0 && end > start && loadStart >= 0 && loadEnd > loadStart);
  const status = { textContent: '' };
  const button = { disabled: false };
  const calls = [];
  const context = {
    fetch,
    AbortController,
    ...timers,
    document: { getElementById(id) {
      if (id === 'releaseStatsStatus') return status;
      if (id === 'exportCsvBtn') return button;
      throw new Error('Unexpected element: ' + id);
    } },
    updateTable(data) { calls.push(['table', data.length]); },
    updateChartSafely(data) { calls.push(['chart', data.length]); },
    console: { error() {} }
  };
  const load = vm.runInNewContext(
    'const REPO = "bradlaw76/Generic.Sidebar"; let releaseData = [];\n' +
    source.slice(start, end) + '\n' + source.slice(loadStart, loadEnd) + '\nloadStats',
    context
  );
  return { load, status, button, calls };
}

test('landing page: API error is announced and CSV stays disabled', async () => {
  for (const fetch of [
    async () => ({ ok: false, status: 403 }),
    async () => { throw new Error('synthetic network failure'); }
  ]) {
    const h = statsHarness(fetch);
    await h.load();
    assert.match(h.status.textContent, /Release statistics unavailable/);
    assert.equal(h.button.disabled, true);
    assert.deepEqual(h.calls, []);
  }
});

test('landing page: successful empty response differs from API failure', async () => {
  const h = statsHarness(async () => ({ ok: true, json: async () => [] }));
  await h.load();
  assert.match(h.status.textContent, /No downloadable release assets/);
  assert.equal(h.button.disabled, true);
  assert.deepEqual(h.calls, [['table', 0], ['chart', 0]]);
});

test('landing page: loaded assets enable CSV after table-first updates', async () => {
  const h = statsHarness(async () => ({
    ok: true, json: async () => [{
      published_at: '2026-01-01T00:00:00Z', tag_name: 'v1',
      assets: [{ name: 'demo.zip', download_count: 1 }]
    }]
  }));
  await h.load();
  assert.equal(h.status.textContent, 'Release statistics loaded.');
  assert.equal(h.button.disabled, false);
  assert.deepEqual(h.calls, [['table', 1], ['chart', 1]]);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="releaseStatsStatus" role="status"/);
  assert.match(html, /id="exportCsvBtn" disabled/);
});


// Exercise the downloads page's actual API/load path, with no network.
function downloadsHarness(fetch, timers = { setTimeout, clearTimeout }) {
  const { source } = readChartScript('downloads/index.html');
  const start = source.indexOf('function fmtDateISO(');
  const end = source.indexOf('function applyViewFilters(', start);
  const loadStart = source.indexOf('async function load()');
  const loadEnd = source.indexOf('// --- Events ---', loadStart);
  assert.ok(start >= 0 && end > start && loadStart >= 0 && loadEnd > loadStart);
  const button = { disabled: true };
  const status = { type: null, message: '' };
  const calls = [];
  let loading = false;
  const context = {
    fetch,
    AbortController,
    ...timers,
    exportCsvBtn: button,
    loadingEl: { classList: {
      remove() { loading = true; },
      add() { loading = false; }
    } },
    showStatus(type, message) { status.type = type; status.message = message; },
    clearStatus() { status.type = null; status.message = ''; },
    updateTable(data) {
      calls.push(['table', data.length]);
      button.disabled = !data.some(r => r.assets.length);
    },
    updateChartSafely(data) { calls.push(['chart', data.length]); },
    console: { error() {} }
  };
  const load = vm.runInNewContext(
    'const API_BASE = "https://example.invalid"; let fullData = [], viewData = [];\n' +
    'function applyViewFilters() { return fullData; }\n' +
    source.slice(start, end) + '\n' + source.slice(loadStart, loadEnd) + '\nload',
    context
  );
  return { load, button, status, calls, get loading() { return loading; } };
}

test('downloads: initial and pending load keep CSV disabled, HTTP failure is announced', async () => {
  const html = fs.readFileSync(path.join(root, 'downloads/index.html'), 'utf8');
  assert.match(html, /id="exportCsvBtn" disabled/);
  assert.match(html, /id="statusBox" role="status"/);
  let finish;
  const h = downloadsHarness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.load();
  assert.equal(h.loading, true);
  assert.equal(h.button.disabled, true);
  assert.match(h.status.message, /Loading release data/);
  finish({ ok: false, status: 403, json: async () => ({ message: 'Rate limited' }) });
  await pending;
  assert.equal(h.loading, false);
  assert.equal(h.button.disabled, true);
  assert.equal(h.status.type, 'error');
  assert.match(h.status.message, /HTTP 403/);
  assert.deepEqual(h.calls, []);
});

test('downloads: empty releases and releases without assets keep CSV disabled', async () => {
  for (const releases of [[], [{ tag_name: 'v1', assets: [] }]]) {
    const h = downloadsHarness(async () => ({ ok: true, json: async () => releases }));
    await h.load();
    assert.equal(h.button.disabled, true);
    assert.equal(h.loading, false);
    assert.equal(h.status.type, 'warn');
    assert.match(h.status.message, /No (releases|downloadable release assets) found/);
    assert.deepEqual(h.calls, [['table', releases.length], ['chart', releases.length]]);
  }
});

test('downloads: successful asset load clears loading status and enables CSV', async () => {
  const h = downloadsHarness(async () => ({
    ok: true, json: async () => [{ tag_name: 'v1', assets: [{ name: 'demo.zip', download_count: 2 }] }]
  }));
  await h.load();
  assert.equal(h.button.disabled, false);
  assert.equal(h.loading, false);
  assert.equal(h.status.type, null);
  assert.deepEqual(h.calls, [['table', 1], ['chart', 1]]);
});


// Deterministic deadline tests: no real wait, network, or external dependency.
function deadlineTimers() {
  let callback;
  let cleared = false;
  return {
    setTimeout(fn, delay) {
      assert.equal(delay, 15000);
      callback = fn;
      return 1;
    },
    clearTimeout(id) { assert.equal(id, 1); cleared = true; },
    expire() { assert.ok(callback); callback(); },
    get cleared() { return cleared; }
  };
}

for (const [name, makeHarness] of [
  ['landing', statsHarness], ['downloads', downloadsHarness]
]) {
  test(name + ': stalled fetch times out, aborts and ignores a late response', async () => {
    const clock = deadlineTimers();
    let finish, signal;
    const h = makeHarness((_url, options) => {
      signal = options.signal;
      return new Promise(resolve => { finish = resolve; });
    }, clock);
    const pending = h.load();
    assert.equal(h.button.disabled, true);
    clock.expire();
    await pending;
    assert.equal(signal.aborted, true);
    assert.equal(clock.cleared, true);
    assert.equal(h.button.disabled, true);
    assert.match(h.status.textContent || h.status.message, /unavailable|timed out/i);
    if (name === 'downloads') assert.equal(h.loading, false);
    finish({ ok: true, json: async () => [{
      published_at: '2026-01-01T00:00:00Z', tag_name: 'v1',
      assets: [{ name: 'late.zip', download_count: 1 }]
    }] });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(h.calls, []);
    assert.equal(h.button.disabled, true);
  });

  test(name + ': stalled response body is also bounded and late body cannot render', async () => {
    const clock = deadlineTimers();
    let finishBody, signal;
    const h = makeHarness(async (_url, options) => {
      signal = options.signal;
      return { ok: true, json: () => new Promise(resolve => { finishBody = resolve; }) };
    }, clock);
    const pending = h.load();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(typeof finishBody, 'function');
    clock.expire();
    await pending;
    assert.equal(signal.aborted, true);
    assert.equal(clock.cleared, true);
    assert.equal(h.button.disabled, true);
    finishBody([]);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(h.calls, []);
  });

  test(name + ': successful fetch clears the deadline without aborting', async () => {
    const clock = deadlineTimers();
    let signal;
    const h = makeHarness(async (_url, options) => {
      signal = options.signal;
      return { ok: true, json: async () => [] };
    }, clock);
    await h.load();
    assert.equal(clock.cleared, true);
    assert.equal(signal.aborted, false);
    assert.deepEqual(h.calls, [['table', 0], ['chart', 0]]);
  });
}

test('downloads: late full page after deadline does not start another API request', async () => {
  const clock = deadlineTimers();
  let calls = 0, finishBody;
  const h = downloadsHarness(async () => {
    calls++;
    return { ok: true, json: () => new Promise(resolve => { finishBody = resolve; }) };
  }, clock);
  const pending = h.load();
  await new Promise(resolve => setImmediate(resolve));
  clock.expire();
  await pending;
  finishBody(Array.from({ length: 50 }, () => ({ tag_name: 'v1', assets: [] })));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.deepEqual(h.calls, []);
});


test('downloads: one request supplies the largest selectable release dataset', async () => {
  const urls = [];
  const releases = Array.from({ length: 50 }, (_, i) => ({
    tag_name: 'v' + i, assets: [{ name: 'demo.zip', download_count: i }]
  }));
  const h = downloadsHarness(async url => {
    urls.push(url);
    assert.equal(urls.length, 1, 'unnecessary later API page');
    return { ok: true, json: async () => releases };
  });
  await h.load();
  assert.match(urls[0], /per_page=50&page=1$/);
  assert.deepEqual(h.calls, [['table', 50], ['chart', 50]]);
  assert.equal(h.button.disabled, false);
});

// Actual filter and event handlers, with synthetic data and a deterministic clock.
function filterHarness() {
  const { source } = readChartScript('downloads/index.html');
  const start = source.indexOf('function applyViewFilters(');
  const end = source.indexOf('function buildDatasets(', start);
  const events = source.indexOf('    // --- Events ---');
  const finish = source.indexOf('    // Kick off', events);
  assert.ok(start >= 0 && end > start && events >= 0 && finish > events);
  let next = 0;
  const pending = new Map();
  const names = data => Array.from(data.flatMap(r => r.assets.map(a => a.name)));
  function element(value) {
    const handlers = {};
    return { value, disabled: false,
      addEventListener(type, callback) { handlers[type] = callback; },
      fire(type) { handlers[type](); }
    };
  }
  const releaseCountSel = element('10'), assetFilterInp = element('a.zip');
  const exportCsvBtn = element(''), toggleLegendButton = element('');
  const tables = [], charts = [], exports = [];
  const context = {
    releaseCountSel, assetFilterInp, exportCsvBtn, toggleLegendButton,
    setTimeout(callback, delay) { assert.equal(delay, 250); pending.set(++next, callback); return next; },
    clearTimeout(id) { pending.delete(id); },
    updateTable(data) { const rows = names(data); tables.push(rows); exportCsvBtn.disabled = !rows.length; },
    updateChartSafely(data) { charts.push(names(data)); },
    exportToCSV(data) { exports.push(names(data)); }
  };
  vm.runInNewContext(
    'let chart; let fullData = [{assets:[{name:"a.zip"},{name:"b.zip"}]}], viewData;\n' +
    source.slice(start, end) + '\n' + source.slice(events, finish) +
    '\nviewData=applyViewFilters(); updateTable(viewData); updateChartSafely(viewData);',
    context
  );
  return { tables, charts, exports, exportCsvBtn,
    input(value) { assetFilterInp.value = value; assetFilterInp.fire('input'); },
    count(value) { releaseCountSel.value = value; releaseCountSel.fire('change'); },
    click() { exportCsvBtn.fire('click'); },
    flush() { for (const [id, cb] of [...pending]) { pending.delete(id); cb(); } },
    get pending() { return pending.size; }
  };
}

test('downloads: pending filter cannot export stale rows; stable export matches table', () => {
  const h = filterHarness();
  h.click();
  assert.deepEqual(h.exports, [['a.zip']]);
  h.input('b.zip');
  assert.equal(h.exportCsvBtn.disabled, true);
  h.click();
  assert.deepEqual(h.exports, [['a.zip']]);
  h.flush();
  assert.equal(h.exportCsvBtn.disabled, false);
  h.click();
  assert.deepEqual(h.exports, [['a.zip'], ['b.zip']]);
  assert.deepEqual(h.tables.at(-1), h.exports.at(-1));
  assert.deepEqual(h.charts.at(-1), h.tables.at(-1));
});

test('downloads: no-match filter never exports previous or empty rows', () => {
  const h = filterHarness();
  h.input('missing');
  h.click();
  h.flush();
  h.click();
  assert.equal(h.exportCsvBtn.disabled, true);
  assert.deepEqual(h.tables.at(-1), []);
  assert.deepEqual(h.exports, []);
});

test('downloads: count change cancels pending filter and immediately synchronizes export', () => {
  const h = filterHarness();
  h.input('b.zip');
  assert.equal(h.pending, 1);
  h.count('6');
  assert.equal(h.pending, 0);
  h.click();
  assert.deepEqual(h.exports, [['b.zip']]);
  const renders = h.tables.length;
  h.flush();
  assert.equal(h.tables.length, renders);
});
