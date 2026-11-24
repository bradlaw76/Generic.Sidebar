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
  vm.runInContext('let chart; let lastChartData;\n' + fragment, context);
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
    URL,
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
  const loadingEl = { hidden: true };
  const context = {
    fetch,
    AbortController,
    URL,
    ...timers,
    exportCsvBtn: button,
    loadingEl,
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
  return { load, button, status, calls, get loading() { return !loadingEl.hidden; } };
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


// Exercise the actual startup wiring and chart renderer in both ordering cases.
function asyncChartHarness(page) {
  const { source, fragment } = readChartScript(page);
  const h = harness(fragment);
  const kickoff = source.indexOf('    // Recover optional chart after');
  assert.ok(kickoff >= 0, 'missing asynchronous startup');
  let onLoad, starts = 0;
  const originalGet = h.context.document.getElementById;
  h.context.document.getElementById = id => id === 'releaseChartScript'
    ? { addEventListener(type, callback, options) {
        assert.equal(type, 'load');
        assert.equal(options.once, true);
        onLoad = callback;
      } }
    : originalGet(id);
  h.context.loadStats = h.context.load = () => { starts++; };
  const isDownloads = page === 'downloads/index.html';
  vm.runInContext((isDownloads ? 'let filterDebounce;\n' : '') + source.slice(kickoff), h.context);
  assert.equal(starts, 1, 'release request must start without the CDN load event');
  const labels = [];
  return {
    ...h, labels,
    data(tag) { return [{ tag, tagName: tag, assets: [], total: 1 }]; },
    chartArrives() {
      h.context.Chart = function Chart(ctx, config) {
        labels.push(Array.from(config.data.labels));
        return { destroy() {} };
      };
      onLoad();
    },
    pendingFilter(value) {
      vm.runInContext(value ? 'filterDebounce = 1' : 'filterDebounce = undefined', h.context);
    }
  };
}

for (const page of pages) {
  test(page + ': optional CDN scripts are parser-nonblocking and API starts independently', () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const host of ['cdn.tailwindcss.com', 'cdn.jsdelivr.net/npm/chart.js']) {
      const tag = [...html.matchAll(/<script\b([^>]*)>/gi)]
        .map(match => match[1]).find(attrs => attrs.includes(host));
      assert.ok(tag, 'missing expected dependency ' + host);
      assert.match(tag, /(?:^|\s)async(?:\s|$)/);
    }
    const h = asyncChartHarness(page);
    h.update(h.data('first'));
    assert.equal(h.canvas.style.display, 'none', 'table-first path tolerates stalled Chart');
    assert.deepEqual(h.labels, []);
    h.update(h.data('current'));
    h.chartArrives();
    assert.equal(h.canvas.style.display, '');
    assert.deepEqual(h.labels, [['current']], 'late recovery uses latest rendered data');
  });

  test(page + ': Chart arriving before release data does not render stale or empty results', () => {
    const h = asyncChartHarness(page);
    h.chartArrives();
    assert.deepEqual(h.labels, []);
    h.update(h.data('ready'));
    assert.deepEqual(h.labels, [['ready']]);
    assert.equal(h.canvas.style.display, '');
  });
}

test('downloads: late Chart load during a pending filter waits for the new view', () => {
  const h = asyncChartHarness('downloads/index.html');
  h.update(h.data('previous'));
  h.pendingFilter(true);
  h.chartArrives();
  assert.deepEqual(h.labels, []);
  h.pendingFilter(false);
  h.update(h.data('filtered'));
  assert.deepEqual(h.labels, [['filtered']]);
});


test('downloads: loading and status visibility do not depend on Tailwind CSS', () => {
  const { source } = readChartScript('downloads/index.html');
  const html = fs.readFileSync(path.join(root, 'downloads/index.html'), 'utf8');
  assert.match(html, /id="statusBox" role="status" hidden\b/);
  assert.match(html, /id="loading" hidden\b/);
  assert.match(html, /#statusBox\[hidden\],\s*#loading\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  const start = source.indexOf('function showStatus(');
  const end = source.indexOf('function fmtDateISO(', start);
  assert.ok(start >= 0 && end > start);
  // No stylesheet or visibility effects from classList in this harness.
  const statusBox = { hidden: true, textContent: '', className: '', classList: { add() {} } };
  const status = vm.runInNewContext(source.slice(start, end) + '\n({showStatus,clearStatus})', { statusBox });
  status.showStatus('info', 'Loading release data…');
  assert.equal(statusBox.hidden, false);
  assert.match(statusBox.textContent, /Loading/);
  status.showStatus('error', 'Request failed');
  assert.equal(statusBox.hidden, false);
  assert.equal(statusBox.textContent, 'Request failed');
  status.clearStatus();
  assert.equal(statusBox.hidden, true);
  assert.equal(statusBox.textContent, '');
});

// Execute the actual Agent page badge script, including its deadline and pagination.
function agentBadgeHarness(fetch) {
  const html = fs.readFileSync(path.join(root, 'pages/agent/index.html'), 'utf8');
  const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .find(([, attrs, source]) => !/\bsrc\s*=/.test(attrs) && source.includes('function fetchTotalDownloads('));
  assert.ok(script, 'expected Agent download badge script');
  const badge = { innerHTML: '', title: '' };
  const year = {};
  let deadline, cleared = false;
  const completion = vm.runInNewContext(script[2], {
    document: { getElementById(id) { return id === 'downloadBadge' ? badge : year; } },
    fetch, AbortController, URL,
    setTimeout(fn, delay) { assert.equal(delay, 10000); deadline = fn; return 1; },
    clearTimeout(id) { assert.equal(id, 1); cleared = true; },
    console: { error() {} }
  });
  return { badge, completion, expire() { deadline(); }, get cleared() { return cleared; } };
}

function agentResponse(data, next = null) {
  return { ok: true, json: async () => data, headers: { get() { return next ? '<' + next + '>; rel="next"' : null; } } };
}

test('Agent badge: all release pages counted, drafts ignored, deadline cleared', async () => {
  const calls = [];
  const next = 'https://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?page=2';
  const h = agentBadgeHarness(async (url, options) => {
    calls.push([url, options.signal]);
    return calls.length === 1
      ? agentResponse([{ assets: [{ download_count: 3 }] }, { draft: true, assets: [{ download_count: 99 }] }], next)
      : agentResponse([{ assets: [{ download_count: 4 }] }]);
  });
  await h.completion;
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0], 'https://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?per_page=100&page=2');
  assert.equal(calls[0][1], calls[1][1]);
  assert.match(h.badge.innerHTML, /Downloads<\/small> 7$/);
  assert.equal(h.cleared, true);
});

test('Agent badge: stalled fetch fails visibly; late response cannot continue pagination', async () => {
  let signal, releaseFetch, calls = 0;
  const h = agentBadgeHarness((url, options) => {
    calls++;
    signal = options.signal;
    return new Promise(resolve => { releaseFetch = resolve; });
  });
  h.expire();
  await h.completion;
  assert.equal(signal.aborted, true);
  assert.match(h.badge.innerHTML, /n\/a$/);
  assert.equal(h.cleared, true);
  releaseFetch(agentResponse([{ assets: [{ download_count: 99 }] }], 'https://api.github.com/next'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.match(h.badge.innerHTML, /n\/a$/);
});

test('Agent badge: stalled JSON also reaches the deadline and ignores late data', async () => {
  let signal, releaseJson;
  const h = agentBadgeHarness(async (url, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise(resolve => { releaseJson = resolve; }), headers: { get() { return null; } } };
  });
  await new Promise(resolve => setImmediate(resolve));
  h.expire();
  await h.completion;
  assert.equal(signal.aborted, true);
  assert.match(h.badge.innerHTML, /n\/a$/);
  releaseJson([{ assets: [{ download_count: 99 }] }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.badge.innerHTML, /n\/a$/);
});

test('Agent badge: API and malformed payload errors show unavailable, not a partial total', async () => {
  for (const response of [{ ok: false, status: 403 }, agentResponse({ message: 'bad payload' })]) {
    const h = agentBadgeHarness(async () => response);
    await h.completion;
    assert.match(h.badge.innerHTML, /n\/a$/);
    assert.equal(h.cleared, true);
  }
});

test('Agent badge: rejects invalid asset counts and never renders API strings as HTML', async () => {
  for (const bad of ['<img src=x onerror=alert(1)>', '4', -1, 1.5, null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    const h = agentBadgeHarness(async () => agentResponse([{ assets: [{ download_count: 3 }, { download_count: bad }] }]));
    await h.completion;
    assert.equal(h.badge.innerHTML, '<small>Downloads</small> n/a');
    assert.equal(h.cleared, true);
  }
});

test('Agent badge: rejects malformed release records, missing assets and unsafe totals', async () => {
  for (const data of [[null], [{}], [{ assets: [null] }], [{ assets: [{ download_count: Number.MAX_SAFE_INTEGER }, { download_count: 1 }] }]]) {
    const h = agentBadgeHarness(async () => agentResponse(data));
    await h.completion;
    assert.equal(h.badge.innerHTML, '<small>Downloads</small> n/a');
  }
  const valid = agentBadgeHarness(async () => agentResponse([{ assets: [] }, { assets: [{ download_count: 0 }] }]));
  await valid.completion;
  assert.match(valid.badge.innerHTML, /Downloads<\/small> 0$/);
});


// Reject malformed count data consistently across both public statistics pages.
for (const [name, makeHarness] of [
  ['landing', statsHarness], ['downloads', downloadsHarness]
]) {
  const release = assets => ({
    published_at: '2026-01-01T00:00:00Z', tag_name: 'v1', assets
  });
  const asset = download_count => ({ name: 'demo.zip', download_count });
  test(name + ': malformed counts or release records fail before rendering or export', async () => {
    const badPayloads = [
      {}, [null], [{ tag_name: 'v1' }], [release([null])],
      [release([{ download_count: 3 }])],
      [release([asset(Number.MAX_SAFE_INTEGER), asset(1)])],
      ...['4', -1, 1.5, null, undefined, Number.MAX_SAFE_INTEGER + 1].map(
        count => [release([asset(3)]), release([asset(count)])]
      )
    ];
    for (const payload of badPayloads) {
      const h = makeHarness(async () => ({ ok: true, json: async () => payload }));
      await h.load();
      assert.equal(h.button.disabled, true);
      assert.deepEqual(h.calls, []);
      assert.match(h.status.textContent || h.status.message, /unavailable|Unexpected/i);
      if (name === 'downloads') assert.equal(h.loading, false);
    }
  });
  test(name + ': valid zero and positive counts remain renderable and exportable', async () => {
    const h = makeHarness(async () => ({
      ok: true, json: async () => [release([asset(0), asset(3)])]
    }));
    await h.load();
    assert.equal(h.button.disabled, false);
    assert.deepEqual(h.calls, [['table', 1], ['chart', 1]]);
  });
}


// Exercise actual normalization, table rendering and Downloads CSV export.
function releaseLinkHarness(page) {
  const { source } = readChartScript(page);
  const downloads = page === 'downloads/index.html';
  const start = source.indexOf('function trustedReleaseUrl(');
  const end = source.indexOf(downloads ? 'function applyViewFilters(' : 'function showChartUnavailable(', start);
  const table = source.indexOf('function updateTable(data)');
  const tableEnd = source.indexOf(downloads ? 'function csvEscapeCell(' : 'async function loadStats(', table);
  assert.ok(start >= 0 && end > start && table >= 0 && tableEnd > table);
  function element(tag) {
    return { tag, children: [], textContent: '', href: undefined,
      appendChild(child) { this.children.push(child); },
      append(...children) { this.children.push(...children); },
      click() {}, remove() {} };
  }
  const tbody = element('tbody');
  let csv;
  const context = {
    URL: class extends URL {
      static createObjectURL(blob) { csv = blob.text; return 'blob:test'; }
      static revokeObjectURL() {}
    },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    rowCountEl: {}, exportCsvBtn: {},
    document: { querySelector() { return tbody; }, createElement: element, body: element('body') }
  };
  let exporter = '';
  if (downloads) {
    const csvStart = source.indexOf('function csvEscapeCell(');
    const csvEnd = source.indexOf('function computeRateInfo(', csvStart);
    assert.ok(csvEnd > csvStart);
    exporter = source.slice(csvStart, csvEnd);
  }
  const dateHelper = downloads ? source.slice(source.indexOf('function fmtDateISO('),
    source.indexOf('async function withReleaseDeadline(')) : '';
  const api = vm.runInNewContext(dateHelper + '\n' + source.slice(start, end) + '\n' +
    source.slice(table, tableEnd) + '\n' + exporter + '\n' +
    (downloads ? '({process:processReleaseData, render:updateTable, exportToCSV})'
      : '({process:processData, render:updateTable})'), context);
  return { api, tbody, get csv() { return csv; } };
}

const releaseUrl = 'https://github.com/bradlaw76/Generic.Sidebar/releases/tag/v1';
const assetUrl = 'https://github.com/bradlaw76/Generic.Sidebar/releases/download/v1/demo.zip';
function linkFixture(html_url, browser_download_url) {
  return [{ published_at: '2026-01-01T00:00:00Z', tag_name: 'v1', name: 'Release one',
    html_url, assets: [{ name: 'demo.zip', download_count: 3, browser_download_url }] }];
}
for (const page of pages) {
  test(page + ': trusted release and asset links render while counts remain usable', () => {
    const h = releaseLinkHarness(page);
    const data = h.api.process(linkFixture(releaseUrl, assetUrl));
    h.api.render(data);
    const cells = h.tbody.children[0].children;
    assert.equal(cells[2].children[0].href, releaseUrl);
    assert.equal(cells[3].children[0].href, assetUrl);
    assert.equal(String(cells[4].textContent), '3');
    assert.equal(String(cells[5].textContent), '3');
    if (h.api.exportToCSV) {
      h.api.exportToCSV(data);
      assert.ok(h.csv.includes(releaseUrl) && h.csv.includes(assetUrl));
    }
  });
  test(page + ': untrusted release and asset links become plain text, not clickable or exported URLs', () => {
    for (const value of [undefined, null, 42, {}, '', 'javascript:alert(1)',
      '//github.com/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'http://github.com/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'https://github.com.example.org/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'https://example.org/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'https://user@github.com/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'https://github.com:444/bradlaw76/Generic.Sidebar/releases/tag/v1',
      'https://github.com/bradlaw76/Generic.Sidebar-other/releases/tag/v1',
      'https://github.com/bradlaw76/Generic.Sidebar/releases/tag/../../issues',
      'https://github.com/bradlaw76/Generic.Sidebar/releases/tag/']) {
      const h = releaseLinkHarness(page);
      const data = h.api.process(linkFixture(value, value));
      h.api.render(data);
      const cells = h.tbody.children[0].children;
      assert.equal(cells[2].children.length, 0);
      assert.equal(cells[3].children.length, 0);
      assert.equal(cells[2].textContent, 'Release one');
      assert.equal(cells[3].textContent, 'demo.zip');
      assert.equal(String(cells[4].textContent), '3');
      if (h.api.exportToCSV) {
        h.api.exportToCSV(data);
        assert.match(h.csv, /Release one,,demo\.zip,,3,3$/);
      }
    }
  });
}


test('Agent badge: canonicalizes verified numeric repository pagination and omits credentials', async () => {
  const calls = [];
  const next = 'https://api.github.com/repositories/1055108199/releases?per_page=100&page=2';
  const h = agentBadgeHarness(async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    return calls.length === 1
      ? agentResponse([{ assets: [{ download_count: 2 }] }], next)
      : agentResponse([{ assets: [{ download_count: 3 }] }]);
  });
  await h.completion;
  assert.deepEqual(calls, [
    'https://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?per_page=100&page=1',
    'https://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?per_page=100&page=2'
  ]);
  assert.match(h.badge.innerHTML, /Downloads<\/small> 5$/);
  assert.equal(h.cleared, true);
});

test('Agent badge: rejects untrusted pagination destinations without requesting them or showing a partial total', async () => {
  for (const next of [
    'https://example.org/releases?page=2',
    'http://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?page=2',
    'https://api.github.com/repos/another/repo/releases?page=2',
    'https://api.github.com/repositories/1055108200/releases?page=2',
    'https://api.github.com/repos/bradlaw76/Generic.Sidebar/issues?page=2',
    'https://user@api.github.com/repos/bradlaw76/Generic.Sidebar/releases?page=2',
    'https://api.github.com:444/repos/bradlaw76/Generic.Sidebar/releases?page=2'
  ]) {
    let calls = 0;
    const h = agentBadgeHarness(async () => {
      calls++;
      return calls === 1 ? agentResponse([{ assets: [{ download_count: 3 }] }], next) : agentResponse([]);
    });
    await h.completion;
    assert.equal(calls, 1, next);
    assert.equal(h.badge.innerHTML, '<small>Downloads</small> n/a');
    assert.equal(h.cleared, true);
  }
});

test('Agent badge: rejects repeated, skipped, malformed and changed-size page requests', async () => {
  const base = 'https://api.github.com/repos/bradlaw76/Generic.Sidebar/releases?';
  for (const query of ['page=1', 'page=3', 'page=2&page=2', 'page=2&per_page=1', 'page=2&extra=1', 'page=2.0', 'per_page=100']) {
    let calls = 0;
    const h = agentBadgeHarness(async () => {
      calls++;
      return calls === 1 ? agentResponse([{ assets: [{ download_count: 3 }] }], base + query) : agentResponse([]);
    });
    await h.completion;
    assert.equal(calls, 1, query);
    assert.equal(h.badge.innerHTML, '<small>Downloads</small> n/a');
  }
  let calls = 0;
  const h = agentBadgeHarness(async () => {
    calls++;
    return calls <= 2
      ? agentResponse([{ assets: [{ download_count: 3 }] }], base + 'page=2')
      : agentResponse([]);
  });
  await h.completion;
  assert.equal(calls, 2, 'second page cannot be counted repeatedly');
  assert.equal(h.badge.innerHTML, '<small>Downloads</small> n/a');
});

 
// H010: the chart aggregate follows visible assets, while the legacy CSV
// schema and all-assets release total remain stable.
function chartFilterFixture() {
  const { source } = readChartScript('downloads/index.html');
  const start = source.indexOf('function applyViewFilters(');
  const end = source.indexOf('function showChartUnavailable()', start);
  assert.ok(start >= 0 && end > start);
  const releaseCountSel = { value: '10' }, assetFilterInp = { value: '' };
  const fullData = [{ tagName: 'v1', releaseName: 'Release one', date: '2026-01-01',
    totalDownloads: 10, assets: [
      { name: 'demo.zip', downloadCount: 2 }, { name: 'guide.pdf', downloadCount: 8 }
    ] }];
  const api = vm.runInNewContext(source.slice(start, end) +
    '\n({ applyViewFilters, buildDatasets })', { releaseCountSel, assetFilterInp, fullData });
  return { api, fullData, view(filter) {
    assetFilterInp.value = filter;
    return api.applyViewFilters();
  } };
}

test('downloads: chart totals track visible assets and recover when filter clears', () => {
  const f = chartFilterFixture();
  const zip = f.view(' ZIP ');
  const datasets = f.api.buildDatasets(zip);
  assert.equal(datasets[0].label, 'Total Downloads (shown assets)');
  assert.equal(datasets[0].data[0], 2);
  assert.equal(datasets[1].data[0], 2);
  assert.equal(datasets.length, 2);
  assert.equal(zip[0].totalDownloads, 10);
  assert.equal(f.fullData[0].assets.length, 2);
  assert.equal(f.api.buildDatasets(f.view(''))[0].data[0], 10);
});

test('downloads: no-match chart is explicitly empty and clears stale notices on recovery', () => {
  const f = chartFilterFixture();
  const h = harness(readChartScript('downloads/index.html').fragment);
  h.goodChart();
  h.update(f.view(''));
  h.update(f.view('missing'));
  assert.equal(h.destroys, 1);
  assert.equal(h.canvas.style.display, 'none');
  assert.equal(h.note.textContent, 'No assets match the current filter.');
  assert.equal(h.note.role, 'status');
  h.update(f.view('missing'));
  assert.equal(h.destroys, 1);
  h.context.Chart = undefined;
  h.update(f.view('zip'));
  assert.match(h.note.textContent, /Chart unavailable/);
  h.goodChart();
  h.update(f.view(''));
  assert.equal(h.canvas.style.display, '');
  assert.equal(h.note, null);
});

test('downloads: filtered table and unchanged CSV schema explicitly retain full release total', () => {
  const f = chartFilterFixture();
  const h = releaseLinkHarness('downloads/index.html');
  const data = f.view('zip');
  h.api.render(data);
  const cells = h.tbody.children[0].children;
  assert.equal(String(cells[4].textContent), '2');
  assert.equal(String(cells[5].textContent), '10');
  h.api.exportToCSV(data);
  const lines = h.csv.split('\n');
  assert.equal(lines[0], 'Release Date,Tag,Release Name,Release URL,Asset,Asset URL,Downloads,Total Downloads');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /demo\.zip,,2,10$/);
  const html = fs.readFileSync(path.join(root, 'downloads/index.html'), 'utf8');
  assert.match(html, /All Assets \(Release Total\)/);
  assert.match(html, /retain the full release total \(all assets\)/);
});


// H010: optional release-date metadata must not suppress accurate download counts.
for (const page of pages) {
  test(page + ': missing or invalid publication dates fall back to creation date or blank', () => {
    const h = releaseLinkHarness(page);
    const cases = [
      ['2026-01-02T12:00:00Z', '2025-12-31T12:00:00Z', '2026-01-02'],
      [null, '2025-12-31T12:00:00Z', '2025-12-31'],
      ['not-a-date', '2025-12-31T12:00:00Z', '2025-12-31'],
      [undefined, undefined, ''], [null, null, ''],
      [42, false, ''], ['0', 'invalid', '']
    ];
    for (const [published_at, created_at, expected] of cases) {
      const fixture = linkFixture(releaseUrl, assetUrl);
      Object.assign(fixture[0], { published_at, created_at });
      const data = h.api.process(fixture);
      assert.equal(data[0].date, expected);
      assert.equal(data[0].total ?? data[0].totalDownloads, 3);
    }
  });
}
for (const [name, makeHarness] of [
  ['landing', statsHarness], ['downloads', downloadsHarness]
]) {
  test(name + ': invalid optional date does not discard otherwise valid release data', async () => {
    const releases = [
      { published_at: 'not-a-date', tag_name: 'v1', assets: [{ name: 'one.zip', download_count: 2 }] },
      { published_at: '2026-01-02T12:00:00Z', tag_name: 'v2', assets: [{ name: 'two.zip', download_count: 3 }] }
    ];
    const h = makeHarness(async () => ({ ok: true, json: async () => releases }));
    await h.load();
    assert.equal(h.button.disabled, false);
    assert.deepEqual(h.calls, [['table', 2], ['chart', 2]]);
  });
}
