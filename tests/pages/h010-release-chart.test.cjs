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
function statsHarness(fetch) {
  const { source } = readChartScript('index.html');
  const start = source.indexOf('async function fetchReleases()');
  const end = source.indexOf('function showChartUnavailable()', start);
  const loadStart = source.indexOf('async function loadStats()');
  const loadEnd = source.indexOf("document.getElementById('toggleLegendButton').addEventListener", loadStart);
  assert.ok(start >= 0 && end > start && loadStart >= 0 && loadEnd > loadStart);
  const status = { textContent: '' };
  const button = { disabled: false };
  const calls = [];
  const context = {
    fetch,
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
