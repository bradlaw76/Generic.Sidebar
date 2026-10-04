/*
=============================================================================
COMPONENT:    Copilot chat host and sidebar integration regression tests
FILE:         tests/copilot-chat-host.test.js
VERSION:      0.2.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-10-04
ENVIRONMENT:  Node.js built-in test runner
PORTAL URL:   None
-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Offline host and opt-in sidebar tests; no live agents or tenants.
-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source: In-memory mocked MSAL and Direct Line; no network
- Entity/Table / API / OData: None
- Auth Model: Exercises production lazy-auth and exchange middleware
- Rendering: None
-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Validation: Public config, agent-requested SSO, fallback, and timeout
-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Node.js with node:test; no third-party test dependencies.
-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- CSRF / Auth Scope: Mocked; verifies configured scope/resource boundaries
- Data Exposure / Role Dependency: No real credentials or users
-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- Not applicable
-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- Cannot certify live cloud, MFA, CORS, or browser SDK compatibility.
-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
- Run: node --test tests/copilot-chat-host.test.js
-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v0.2.0  2026-10-04  Added configured startup and legacy embed integration tests
v0.1.0  2026-10-02  Initial offline regression coverage
-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Tests never connect to an agent or modify existing demonstration assets.
=============================================================================
*/
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const { validateConfig, postExchange, createAuthMiddleware, createTokenProvider } =
  require("../web resources/sidebar_CopilotChatHost.js");

const origin = "https://deployment.example";
const base = {
  tokenEndpoint: "https://agent.example/token?api-version=2022-03-01-preview",
  directLineDomain: "https://channel.example/v3/directline",
  startConversation: true
};
const auth = {
  clientId: "00000000-0000-0000-0000-000000000001",
  authority: "https://login.microsoftonline.com/tenant",
  redirectUri: `${origin}/WebResources/sidebar_CopilotAuthRedirect.html`,
  scopes: ["api://example/access_as_user"],
  tokenExchangeResourceUri: "api://example/access_as_user"
};
const card = (overrides = {}) => ({
  type: "DIRECT_LINE/INCOMING_ACTIVITY",
  payload: { activity: {
    from: { role: "bot" },
    attachments: [{
      contentType: "application/vnd.microsoft.card.oauth",
      content: {
        connectionName: "agent-connection",
        tokenExchangeResource: { id: "exchange-1", uri: auth.tokenExchangeResourceUri, ...overrides }
      }
    }]
  } }
});
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(config, { token = "mock-identity", id = "invoke-id", error, getToken } = {}) {
  const forwarded = [];
  const posted = [];
  const dispatched = [];
  const messages = [];
  let acquisitions = 0;
  const middleware = createAuthMiddleware({
    config, userID: "dl_test",
    directLine: {
      postActivity(activity) {
        posted.push(activity);
        return { subscribe(observer) {
          if (error) observer.error(new Error("mock failure")); else observer.next(id);
          return { unsubscribe() {} };
        } };
      }
    },
    getToken: getToken || (async () => { acquisitions++; return token; }),
    status: message => messages.push(message)
  });
  const handle = middleware({ dispatch: action => dispatched.push(action) })(action => forwarded.push(action));
  return { handle, forwarded, posted, dispatched, messages, acquisitions: () => acquisitions };
}

test("anonymous config allows channel API-version query and requires no auth metadata", () => {
  const config = validateConfig(base, origin);
  assert.equal(config.auth, undefined);
  assert.equal(config.tokenEndpoint, base.tokenEndpoint);
});

test("valid authenticated configuration keeps configured scopes and cloud", () => {
  for (const host of ["login.microsoftonline.com", "login.microsoftonline.us", "login.partner.microsoftonline.cn"]) {
    const config = validateConfig({ ...base, auth: { ...auth, authority: `https://${host}/tenant` } }, origin);
    assert.deepEqual(config.auth.scopes, auth.scopes);
  }
});

test("reject unsafe endpoints, authority, redirect, credentials, and scopes", () => {
  for (const input of [
    null, [],
    { ...base, tokenEndpoint: "http://agent.example/token" },
    { ...base, tokenEndpoint: "******agent.example/token" },
    { ...base, tokenEndpoint: "https://agent.example/token?secret=placeholder" },
    { ...base, directLineDomain: "https://channel.example/webchat" },
    { ...base, clientSecret: "placeholder" },
    { ...base, nested: [{ accessToken: "placeholder" }] },
    { ...base, auth: { ...auth, authority: "https://untrusted.example/tenant" } },
    { ...base, auth: { ...auth, redirectUri: "https://other.example/sidebar_CopilotAuthRedirect.html" } },
    { ...base, auth: { ...auth, redirectUri: `${origin}/existing.html` } },
    { ...base, auth: { ...auth, scopes: [] } }
  ]) assert.throws(() => validateConfig(input, origin));
});

test("anonymous and ordinary message paths never acquire identity tokens", async () => {
  const h = harness(validateConfig(base, origin));
  h.handle({ type: "DIRECT_LINE/INCOMING_ACTIVITY", payload: { activity: { text: "hello" } } });
  h.handle(card());
  await flush();
  assert.equal(h.forwarded.length, 2);
  assert.equal(h.acquisitions(), 0);
  assert.equal(h.posted.length, 0);
});

test("authentication metadata alone does not cause user sign-in", async () => {
  const h = harness({ ...base, auth });
  h.handle({ type: "DIRECT_LINE/CONNECT_FULFILLED" });
  await flush();
  assert.equal(h.acquisitions(), 0);
  assert.equal(h.dispatched.length, 1);
  h.handle({ type: "DIRECT_LINE/CONNECT_FULFILLED" });
  assert.equal(h.dispatched.length, 1);
});

test("successful exchange uses the same conversation user and suppresses duplicate cards", async () => {
  const h = harness({ ...base, auth });
  h.handle(card());
  h.handle(card());
  await flush();
  h.handle(card());
  assert.equal(h.acquisitions(), 1);
  assert.equal(h.posted.length, 1);
  assert.equal(h.posted[0].name, "signin/tokenExchange");
  assert.deepEqual(h.posted[0].from, { id: "dl_test", role: "user" });
  assert.equal(h.posted[0].value.connectionName, "agent-connection");
  assert.equal(h.forwarded.length, 0);
});

test("mismatched resource, missing resource, and user-origin cards never receive identity tokens", async () => {
  const h = harness({ ...base, auth });
  h.handle(card({ uri: "api://other/access_as_user" }));
  h.handle(card({ id: undefined }));
  const userCard = card();
  userCard.payload.activity.from.role = "user";
  h.handle(userCard);
  await flush();
  assert.equal(h.acquisitions(), 0);
  assert.equal(h.forwarded.length, 3);
});

test("retry, transport error, missing token, and acquisition failure preserve original OAuth card", async () => {
  for (const options of [
    { id: "retry" }, { error: true }, { token: null },
    { getToken: async () => { throw new Error("mock acquisition failure"); } }
  ]) {
    const h = harness({ ...base, auth }, options);
    const action = card();
    h.handle(action);
    await flush();
    assert.deepEqual(h.forwarded, [action]);
  }
});

test("exchange timeout releases its subscription and errors to the caller", async () => {
  let released = false;
  const directLine = { postActivity: () => ({
    subscribe: () => ({ unsubscribe() { released = true; } })
  }) };
  await assert.rejects(postExchange(directLine, {}, 5), /timed out/);
  assert.equal(released, true);
});

test("silent identity acquisition is lazy and reuses exactly one cached account", async () => {
  let initialized = 0;
  let interactive = 0;
  let request;
  const account = { homeAccountId: "mock-account" };
  const provider = createTokenProvider(auth, {
    getClient: async () => {
      initialized++;
      return {
        getAllAccounts: () => [account],
        getActiveAccount: () => null,
        acquireTokenSilent: async value => { request = value; return { accessToken: "mock-identity", account }; },
        setActiveAccount(value) { assert.equal(value, account); }
      };
    },
    interactive: async () => { interactive++; }
  });
  assert.equal(initialized, 0);
  assert.equal(await provider(), "mock-identity");
  assert.deepEqual(request.scopes, auth.scopes);
  assert.equal(request.account, account);
  assert.equal(interactive, 0);
});

test("no cached account uses silent SSO; interaction required shares one explicit fallback", async () => {
  let silent = 0;
  let prompts = 0;
  const provider = createTokenProvider(auth, {
    getClient: async () => ({
      getAllAccounts: () => [],
      getActiveAccount: () => null,
      ssoSilent: async () => { silent++; throw { errorCode: "interaction_required" }; },
      setActiveAccount() {}
    }),
    interactive: async () => { prompts++; return { accessToken: "mock-interactive" }; }
  });
  assert.deepEqual(await Promise.all([provider(), provider()]), ["mock-interactive", "mock-interactive"]);
  assert.equal(silent, 1);
  assert.equal(prompts, 1);
});

test("multiple accounts are not arbitrarily selected", async () => {
  let silent = 0;
  const provider = createTokenProvider(auth, {
    getClient: async () => ({
      getAllAccounts: () => [{}, {}],
      getActiveAccount: () => null,
      ssoSilent: async () => { silent++; return { accessToken: "mock-sso" }; },
      acquireTokenSilent: async () => { assert.fail("Must not choose a cached account arbitrarily."); }
    }),
    interactive: async () => { assert.fail("Silent SSO succeeds."); }
  });
  assert.equal(await provider(), "mock-sso");
  assert.equal(silent, 1);
});

test("unexpected identity errors do not force interactive sign-in", async () => {
  const provider = createTokenProvider(auth, {
    getClient: async () => ({
      getAllAccounts: () => [],
      getActiveAccount: () => null,
      ssoSilent: async () => { throw { errorCode: "invalid_client" }; }
    }),
    interactive: async () => { assert.fail("Invalid registration must not trigger a popup."); }
  });
  await assert.rejects(provider());
});

function browserHarness(configuration, credentials = { token: "mock-conversation" }, options = {}) {
  const elements = new Map();
  for (const id of ["status", "configuration", "start", "auth-controls", "sign-in",
    "agent-sign-in", "setup", "chat", "retry", "preview-notice", "chat-title"]) {
    elements.set(id, { hidden: true, disabled: false, addEventListener(type, handler) { this[type] = handler; } });
  }
  let store;
  let renders = 0;
  let identityClients = 0;
  let popups = 0;
  let boundUser;
  const forwarded = [];
  const posted = [];
  const fetched = [];
  const events = {};
  const window = {
    location: { href: options.href || `${origin}/sidebar_CopilotChatHost.html`, origin, protocol: "https:" },
    document: { getElementById: id => elements.get(id) },
    crypto: { randomUUID: () => "test-conversation" },
    addEventListener: (type, handler) => { events[type] = handler; },
    fetch: async url => {
      fetched.push(url);
      if (options.fetch) return options.fetch(url);
      return { ok: true, json: async () => credentials };
    },
    WebChat: {
      createDirectLine: () => ({
        end() {},
        postActivity(activity) {
          posted.push(activity);
          return { subscribe(observer) { observer.next("mock-exchange-id"); return { unsubscribe() {} }; } };
        }
      }),
      createStore(initial, middleware) {
        store = middleware({ dispatch() {} })(action => forwarded.push(action));
        return store;
      },
      renderWebChat(options) { renders++; boundUser = options.userID; }
    },
    msal: {
      PublicClientApplication: class {
        constructor() { identityClients++; }
        async initialize() {}
        getAllAccounts() { return []; }
        getActiveAccount() { return null; }
        async ssoSilent() { throw { errorCode: "interaction_required" }; }
        acquireTokenPopup(request) {
          popups++;
          assert.deepEqual(Array.from(request.scopes), auth.scopes);
          return Promise.resolve({ accessToken: "mock-popup-identity" });
        }
      }
    }
  };
  runInNewContext(readFileSync(join(__dirname, "../web resources/sidebar_CopilotChatHost.js"), "utf8"),
    { window, URL, URLSearchParams, AbortSignal, setTimeout, clearTimeout });
  elements.get("configuration").value = JSON.stringify(configuration);
  return {
    elements, forwarded, posted, fetched, events,
    start: () => elements.get("start").click(),
    incoming: action => store(action),
    renders: () => renders,
    identityClients: () => identityClients,
    popups: () => popups,
    boundUser: () => boundUser
  };
}

test("browser wiring stays idle until explicit Start and leaves anonymous chat free of MSAL", async () => {
  const h = browserHarness(base);
  assert.equal(h.fetched.length, 0);
  assert.equal(h.renders(), 0);
  await h.start();
  assert.equal(h.renders(), 1);
  assert.equal(h.fetched.length, 1);
  assert.equal(h.identityClients(), 0);
  assert.equal(h.elements.get("start").disabled, true);
  assert.equal(h.boundUser(), "dl_test-conversation");
  assert.equal(h.elements.get("setup").open, false);
});

test("browser wiring uses a broker's enhanced-auth bound ID for chat and exchange", async () => {
  const h = browserHarness({ ...base, auth }, { token: "mock-conversation", userId: "dl_bound-user" });
  await h.start();
  assert.equal(h.identityClients(), 0);
  h.incoming(card());
  await flush();
  assert.equal(h.identityClients(), 1);
  assert.equal(h.popups(), 0);
  assert.equal(h.elements.get("auth-controls").hidden, false);
  h.elements.get("sign-in").onclick();
  // Popup acquisition starts synchronously on the click, preserving its gesture.
  assert.equal(h.popups(), 1);
  await flush();
  assert.equal(h.boundUser(), "dl_bound-user");
  assert.equal(h.posted[0].from.id, "dl_bound-user");
  assert.equal(h.forwarded.length, 0);
  assert.equal(h.elements.get("auth-controls").hidden, true);
});

test("browser interactive fallback cancel releases the original agent card without a popup", async () => {
  const h = browserHarness({ ...base, auth });
  await h.start();
  h.incoming(card());
  await flush();
  h.elements.get("agent-sign-in").onclick();
  await flush();
  assert.equal(h.popups(), 0);
  assert.equal(h.posted.length, 0);
  assert.equal(h.forwarded.length, 1);
  assert.equal(h.elements.get("auth-controls").hidden, true);
});

function resolvePanel(raw) {
  const source = readFileSync(join(__dirname, "../web resources/sidebar_sidebar.html"), "utf8");
  const match = source.match(/  function resolveEmbed\(raw\) \{[\s\S]*?(?=\n  function toggleZoom)/);
  assert.ok(match, "Sidebar resolver is present.");
  return runInNewContext(`${match[0]}\nresolveEmbed(raw)`, {
    raw, encodeURIComponent, console: { log() {} },
    parent: { Xrm: { Utility: { getGlobalContext: () => ({ getClientUrl: () => origin }) } } }
  });
}

test("sidebar opt-in format carries exact per-agent metadata in a pop-out-safe fragment", () => {
  const config = { ...base, title: 'Agent A & + % # "日本語"', auth };
  const target = resolvePanel(`copilot:${JSON.stringify(config)}`);
  const url = new URL(target.url);
  assert.equal(target.mode, "url");
  assert.equal(target.isCopilot, true);
  assert.equal(url.pathname, "/WebResources/sidebar_CopilotChatHost.html");
  assert.equal(url.search, "");
  assert.deepEqual(JSON.parse(new URLSearchParams(url.hash.slice(1)).get("copilot")), config);
});

test("legacy URLs, web resources, HTML, hosted webchat, and empty embeds stay unchanged", () => {
  assert.equal(resolvePanel(""), null);
  for (const url of ["https://external.example/app", "https://copilotstudio.microsoft.com/environments/example/bots/example/webchat"]) {
    assert.equal(resolvePanel(url).url, url);
    assert.equal(resolvePanel(url).isCopilot, undefined);
  }
  assert.equal(resolvePanel("webresource:sidebar_GenericSidebarAgent.html").url,
    `${origin}/WebResources/sidebar_GenericSidebarAgent.html`);
  const html = '<iframe src="https://external.example/app"></iframe>';
  assert.equal(resolvePanel(html).html, html);
  assert.equal(resolvePanel(html).extractedUrl, "https://external.example/app");
  assert.equal(resolvePanel(html).mode, "html");
});

test("configured anonymous sidebar panel starts automatically without setup or MSAL", async () => {
  const target = resolvePanel(`copilot:${JSON.stringify({ ...base, title: "Anonymous helper" })}`);
  const h = browserHarness({}, undefined, { href: target.url });
  await flush();
  assert.equal(h.renders(), 1);
  assert.equal(h.identityClients(), 0);
  assert.equal(h.elements.get("setup").hidden, true);
  assert.equal(h.elements.get("preview-notice").hidden, true);
  assert.equal(h.elements.get("chat-title").textContent, "Anonymous helper");
  assert.deepEqual(h.fetched, [base.tokenEndpoint]);
  // A repeated start gesture must not create a second conversation.
  await h.start();
  assert.equal(h.renders(), 1);
});

test("configured authenticated panel starts chat but waits for the agent before user authentication", async () => {
  const target = resolvePanel(`copilot:${JSON.stringify({ ...base, auth })}`);
  const h = browserHarness({}, undefined, { href: target.url });
  await flush();
  assert.equal(h.renders(), 1);
  assert.equal(h.identityClients(), 0);
  h.incoming(card());
  await flush();
  assert.equal(h.identityClients(), 1);
  assert.equal(h.popups(), 0);
  h.elements.get("sign-in").onclick();
  await flush();
  assert.equal(h.posted.length, 1);
  assert.equal(h.forwarded.length, 0);
});

test("malformed/unsafe configured panels fail locally without a connection or editable bypass", async () => {
  for (const data of ["", "{broken", "null", JSON.stringify({ ...base, auth: { ...auth, authority: "https://untrusted.example/tenant" } })]) {
    const h = browserHarness(base, undefined, {
      href: `${origin}/WebResources/sidebar_CopilotChatHost.html#copilot=${encodeURIComponent(data)}`
    });
    await flush();
    assert.equal(h.renders(), 0);
    assert.equal(h.fetched.length, 0);
    assert.equal(h.identityClients(), 0);
    assert.equal(h.elements.get("setup").hidden, true);
    assert.match(h.elements.get("status").textContent, /Invalid Copilot panel/);
  }
});

test("configured panel connection failure provides retry using the original administrator config", async () => {
  let attempts = 0;
  const target = resolvePanel(`copilot:${JSON.stringify(base)}`);
  const h = browserHarness({}, undefined, {
    href: target.url,
    fetch: async () => {
      attempts++;
      if (attempts === 1) throw new Error("mock offline");
      return { ok: true, json: async () => ({ token: "mock-conversation" }) };
    }
  });
  await flush();
  assert.equal(h.renders(), 0);
  assert.equal(h.elements.get("retry").hidden, false);
  h.elements.get("configuration").value = "{}";
  await h.elements.get("retry").click();
  assert.equal(h.renders(), 1);
  assert.deepEqual(h.fetched, [base.tokenEndpoint, base.tokenEndpoint]);
  assert.equal(h.elements.get("retry").hidden, true);
});

test("separate configured panels and pop-outs preserve metadata but use separate conversations", async () => {
  const targetA = resolvePanel(`copilot:${JSON.stringify(base)}`);
  const second = { ...base, tokenEndpoint: "https://second-agent.example/token", title: "Agent B" };
  const targetB = resolvePanel(`copilot:${JSON.stringify(second)}`);
  const a = browserHarness({}, { token: "mock-A", userId: "dl_A" }, { href: targetA.url });
  const b = browserHarness({}, { token: "mock-B", userId: "dl_B" }, { href: targetB.url });
  const popout = browserHarness({}, { token: "mock-popout", userId: "dl_popout" }, { href: targetA.url });
  await flush();
  assert.deepEqual(a.fetched, [base.tokenEndpoint]);
  assert.deepEqual(b.fetched, [second.tokenEndpoint]);
  assert.deepEqual(popout.fetched, [base.tokenEndpoint]);
  assert.equal(a.boundUser(), "dl_A");
  assert.equal(b.boundUser(), "dl_B");
  assert.equal(popout.boundUser(), "dl_popout");
});

test("sidebar renderer preserves tab state and pop-out configuration alongside legacy panels", async () => {
  function element() {
    const classes = new Set();
    return {
      children: [], dataset: {}, style: {},
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        contains: value => classes.has(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value)
      },
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this[name] = value; },
      set innerHTML(value) { this.html = value; this.children = []; },
      get innerHTML() { return this.html || ""; },
      querySelectorAll() { return this.children.filter(child => child.dataset.configId); },
      querySelector(selector) {
        const index = selector.match(/data-panel-index="(\d+)"/);
        return index ? this.children.find(child => Number(child.dataset.panelIndex) === Number(index[1])) : null;
      }
    };
  }
  const nodes = new Map();
  for (const id of ["host", "instBand", "zoomToggle", "panelContainer", "tabRow", "popoutBtn", "popoutPlaceholder"]) {
    nodes.set(id, element());
  }
  const config = { ...base, title: "Phone agent", auth };
  const record = {
    sidebar_title1: "Phone agent", sidebar_embedcode: `copilot:${JSON.stringify(config)}`,
    sidebar_title2: "Legacy", sidebar_embedcode2: "webresource:sidebar_GenericSidebarAgent.html",
    sidebar_title3: "Invalid Copilot", sidebar_embedcode3: "copilot:{broken"
  };
  const storage = new Map();
  const logs = [];
  let load;
  let reads = 0;
  let opened;
  const context = {
    URL, URLSearchParams, encodeURIComponent, setInterval() {},
    console: { log: (...values) => logs.push(values.join(" ")) },
    screen: { availWidth: 1920, availHeight: 1080 },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    parent: { Xrm: {
      Utility: { getGlobalContext: () => ({ getClientUrl: () => origin }) },
      WebApi: { retrieveRecord: async () => { reads++; return record; } }
    } },
    document: {
      getElementById: id => nodes.get(id),
      createElement: () => element(),
      querySelector: selector => nodes.get("panelContainer").querySelector(selector)
    },
    window: {
      location: { href: `${origin}/WebResources/sidebar_sidebar.html?configId=test-record` },
      addEventListener: (event, callback) => { load = callback; },
      open: url => { opened = url; return null; }
    }
  };
  const source = readFileSync(join(__dirname, "../web resources/sidebar_sidebar.html"), "utf8");
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(script, context);
  await load();
  assert.equal(nodes.get("host").innerHTML, "");
  const frames = nodes.get("panelContainer").children;
  assert.equal(frames.length, 3);
  assert.equal(frames[0].style.display, "block");
  assert.equal(frames[0].classList.contains("force-zoom"), false);
  assert.equal(frames[1].src, `${origin}/WebResources/sidebar_GenericSidebarAgent.html`);
  assert.match(frames[2].src, /sidebar_CopilotChatHost.html#copilot=/);
  assert.equal(logs.some(line => line.includes(auth.tokenExchangeResourceUri)), false);
  nodes.get("tabRow").children[1].onclick();
  assert.equal(frames[0].style.display, "none");
  assert.equal(frames[1].style.display, "block");
  nodes.get("tabRow").children[0].onclick();
  assert.equal(nodes.get("panelContainer").children[0], frames[0]);
  context.popOutPanel();
  assert.equal(opened, frames[0].src);
  assert.deepEqual(JSON.parse(new URLSearchParams(new URL(opened).hash.slice(1)).get("copilot")), config);
  await load();
  assert.equal(reads, 1);
  assert.equal(nodes.get("panelContainer").children[0], frames[0]);
});
