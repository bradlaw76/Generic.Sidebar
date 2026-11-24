'use strict';

// Deterministic characterization of the exact inline script in the PR checkout.
// It cannot establish cross-origin GCC bot availability or authenticated access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.resolve(__dirname, '../../pages/copilot/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && body.trim())
  .map(([, , body]) => body);
const source = scripts.find(s => s.includes('function showFallback()'));
assert.ok(source, 'Copilot iframe fallback script must exist in page HTML');
new vm.Script(source, { filename: 'pages/copilot/index.html' });

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function harness() {
  const handlers = {};
  const frame = {
    classList: classList(),
    addEventListener(name, handler) { handlers[name] = handler; }
  };
  const fallback = { classList: classList(['hidden']) };
  let timer = null;
  let cleared = false;
  const context = {
    document: {
      getElementById(id) {
        if (id === 'copilotFrame') return frame;
        if (id === 'fallback') return fallback;
        throw new Error('Unexpected document lookup: ' + id);
      }
    },
    setTimeout(fn, delay) {
      assert.equal(delay, 15000, 'Expected fifteen-second no-load timeout');
      timer = fn;
      return 1;
    },
    clearTimeout(id) {
      assert.equal(id, 1);
      cleared = true;
    }
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  assert.equal(typeof handlers.load, 'function');
  assert.equal(typeof handlers.error, 'function');
  assert.equal(typeof timer, 'function');
  return {
    frame, fallback,
    emit(name) { handlers[name](); },
    expireTimer() { if (!cleared) timer(); },
    get timerCleared() { return cleared; }
  };
}

test('unloaded iframe: 15-second timeout reveals fallback and hides frame', () => {
  const h = harness();
  assert.equal(h.frame.classList.contains('hidden'), false);
  assert.equal(h.fallback.classList.contains('hidden'), true);
  h.expireTimer();
  assert.equal(h.frame.classList.contains('hidden'), true);
  assert.equal(h.fallback.classList.contains('hidden'), false);
  assert.equal(h.timerCleared, true);
});

test('timely load event cancels no-load timeout without hiding the iframe', () => {
  const h = harness();
  h.emit('load');
  assert.equal(h.timerCleared, true);
  h.expireTimer();
  assert.equal(h.frame.classList.contains('hidden'), false);
  assert.equal(h.fallback.classList.contains('hidden'), true);
});

test('synthetic iframe error reveals fallback immediately', () => {
  const h = harness();
  h.emit('error');
  assert.equal(h.timerCleared, true);
  assert.equal(h.frame.classList.contains('hidden'), true);
  assert.equal(h.fallback.classList.contains('hidden'), false);
});

test('late load after no-load timeout must not dismiss fallback', () => {
  const h = harness();
  h.expireTimer();
  h.emit('load');
  assert.equal(h.frame.classList.contains('hidden'), true);
  assert.equal(h.fallback.classList.contains('hidden'), false);
});

test('local CSS preserves hidden state, full-height layout and fallback overlay without Tailwind', () => {
  assert.match(html, /\.hidden\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(html, /body\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;/);
  assert.match(html, /main\s*\{\s*position:\s*relative;\s*flex:\s*1 1 auto;/);
  assert.match(html, /#fallback:not\(\.hidden\)\s*\{\s*position:\s*absolute;\s*inset:\s*0;/);
});

test('manual agent-instructions escape remains available even if iframe fires load when blocked', () => {
  const link = html.match(/<a\b[^>]*id="manualFallback"[^>]*>/);
  assert.ok(link, 'Permanent recovery link must be present outside the hidden fallback');
  assert.match(link[0], /href="\/Generic\.Sidebar\/pages\/agent\/"/);
  assert.match(html, /\.manual-fallback-link\s*\{[^}]*z-index:\s*10;/);
  assert.match(html, /src="https:\/\/gcc\.powerva\.microsoft\.us\/environments\//);
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/);
});

test('optional Tailwind loads asynchronously and iframe fallback starts independently', () => {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  assert.ok(head, 'Page head must exist');
  const cdn = [...head[1].matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attrs]) => /\bsrc\s*=\s*["']https:\/\/cdn\.tailwindcss\.com["']/i.test(attrs));
  assert.equal(cdn.length, 1);
  assert.match(cdn[0][1], /(?:^|\s)async(?:\s|$)/i,
    'A stalled optional CDN must not block HTML parsing');
  assert.ok(html.indexOf('id="copilotFrame"') < html.indexOf('function showFallback()'));
  assert.ok(html.indexOf('id="manualFallback"') < html.indexOf('function showFallback()'));
  // The VM harness has no Tailwind, CDN completion or document-ready callback.
  const h = harness();
  h.expireTimer();
  assert.equal(h.frame.classList.contains('hidden'), true);
  assert.equal(h.fallback.classList.contains('hidden'), false);
});
