/*
=============================================================================
COMPONENT:    Isolated Copilot chat host regression tests
FILE:         tests/copilot-chat-host.test.js
VERSION:      0.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-10-02
ENVIRONMENT:  Node.js built-in test runner
PORTAL URL:   None
-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Offline tests for the new host only; no live agents, tenants, or demo assets.
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
