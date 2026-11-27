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
  let announcement = '';
  let announcementCount = 0;
  let focusCount = 0;
  const navigation = {};
  const status = {
    get textContent() { return announcement; },
    set textContent(value) { announcement = value; announcementCount++; }
  };
  const recovery = {
    focus() { focusCount++; context.document.activeElement = recovery; }
  };
  const context = {
    document: {
      activeElement: navigation,
      getElementById(id) {
        if (id === 'copilotFrame') return frame;
        if (id === 'fallback') return fallback;
        if (id === 'fallbackStatus') return status;
        if (id === 'manualFallback') return recovery;
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
    frame, fallback, navigation, recovery,
    focusFrame() { context.document.activeElement = frame; },
    get activeElement() { return context.document.activeElement; },
    get announcement() { return announcement; },
    get announcementCount() { return announcementCount; },
    get focusCount() { return focusCount; },
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

test('local stylesheet replaces remote Tailwind; fallback logic does not require CSS', () => {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  assert.ok(head, 'Page head must exist');
  const sheets = [...head[1].matchAll(/<link\b([^>]*)>/gi)].map(m => m[1])
    .filter(attrs => /\brel\s*=\s*"stylesheet"/i.test(attrs));
  assert.equal(sheets.length, 1);
  assert.ok(sheets[0].includes('href="../../assets/h010-pages.css"'));
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/i);
  assert.ok(fs.statSync(path.resolve(__dirname, '../../assets/h010-pages.css')).size > 0);
  assert.ok(html.indexOf('id="copilotFrame"') < html.indexOf('function showFallback()'));
  assert.ok(html.indexOf('id="manualFallback"') < html.indexOf('function showFallback()'));
  // The VM harness has no stylesheet rendering or document-ready callback.
  const h = harness();
  h.expireTimer();
  assert.equal(h.frame.classList.contains('hidden'), true);
  assert.equal(h.fallback.classList.contains('hidden'), false);
});

test('direct chat entry shows public-data and identity guidance before the embedded frame', () => {
  const notice = html.match(/<aside\b[^>]*id="publicDemoNotice"[^>]*>([\s\S]*?)<\/aside>/);
  assert.ok(notice, 'Visible public demo guidance must exist outside the iframe');
  assert.ok(notice.index < html.indexOf('<iframe'));
  assert.doesNotMatch(notice[0], /\bhidden\b/);
  assert.match(notice[1], /synthetic or redacted examples only/i);
  assert.match(notice[1], /credentials, access tokens, personal or customer data, tenant identifiers, or internal screenshots/);
  assert.match(notice[1], /configured identity and permissions/);
  assert.match(notice[1], /verify the destination and proposed changes before submission/);
  assert.match(notice[1], /href="https:\/\/github\.com\/bradlaw76\/Generic\.Sidebar\/issues"/);
  assert.match(html, /\.public-demo-notice\s*\{[^}]*flex-shrink:\s*0;/);
  assert.match(html, /\.manual-fallback-link\s*\{[^}]*position:\s*absolute;/);
});

test('fallback status is persistent, initially empty and locally visually hidden', () => {
  assert.match(html, /<div id="fallbackStatus" class="fallback-status" role="status" aria-live="polite" aria-atomic="true"><\/div>\s*<div id="fallback"/);
  assert.match(html, /\.fallback-status\s*\{[^}]*clip-path:\s*inset\(50%\)/);
  assert.doesNotMatch(html.match(/\.fallback-status\s*\{[^}]*\}/)[0], /display:\s*none|visibility:\s*hidden/);
});

test('timeout announces once without moving navigation focus; repeated error and late load do not dismiss', () => {
  const h = harness();
  assert.equal(h.announcement, '');
  h.expireTimer();
  assert.match(h.announcement, /could not be loaded/);
  assert.equal(h.activeElement, h.navigation);
  assert.equal(h.focusCount, 0);
  h.emit('error');
  h.emit('load');
  assert.equal(h.announcementCount, 1);
  assert.equal(h.fallback.classList.contains('hidden'), false);
});

test('iframe error announces and restores focus to the permanent link only once', () => {
  const h = harness();
  h.focusFrame();
  h.emit('error');
  assert.match(h.announcement, /View agent instructions instead/);
  assert.equal(h.activeElement, h.recovery);
  assert.equal(h.focusCount, 1);
  h.emit('error');
  assert.equal(h.announcementCount, 1);
  assert.equal(h.focusCount, 1);
});

test('timeout restores iframe focus; timely load remains silent and preserves focus', () => {
  const stalled = harness();
  stalled.focusFrame();
  stalled.expireTimer();
  assert.equal(stalled.activeElement, stalled.recovery);
  const timely = harness();
  timely.focusFrame();
  timely.emit('load');
  timely.expireTimer();
  assert.equal(timely.activeElement, timely.frame);
  assert.equal(timely.announcementCount, 0);
  assert.equal(timely.focusCount, 0);
});
