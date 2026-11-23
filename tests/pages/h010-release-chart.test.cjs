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
