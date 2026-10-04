/*
=============================================================================
COMPONENT:    Copilot Chat Host runtime
FILE:         web resources/sidebar_CopilotChatHost.js
VERSION:      0.2.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-10-04
ENVIRONMENT:  Browser JavaScript | Node built-in unit tests
PORTAL URL:   Deployment-specific
-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Configuration-driven Direct Line chat with agent-triggered Entra token exchange.
Accepts opt-in sidebar configuration without Xrm or a fixed tenant/agent.
-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source: Public configuration and configured HTTPS token endpoint
- Entity/Table / OData: None
- Auth Model: Lazy MSAL PKCE, silent acquisition then explicit popup
- Rendering: Pinned Web Chat SDK
- API Pattern: signin/tokenExchange invoke, fallback to original OAuth card
-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Validation: HTTPS, public metadata, exact resource match, same-origin redirect
- UX Notes: Configured-panel startup; manual standalone setup; bounded exchange
-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Companion host HTML, blank redirect page, compatible agent channel.
2. SSO registration/scopes for authenticated agents; none for anonymous agents.
-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- CSRF Token: MSAL state/nonce/PKCE
- Auth Scope: Configured scopes only, not arbitrary scopes supplied by messages
- Data Exposure: Identity tokens in memory; MSAL session cache; no token logging
- Role Dependency: Agent/downstream authorization remains authoritative
-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- Root Scope ID: #copilot-chat-host (companion HTML)
-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- No host identity token extraction, token broker, or automatic cloud discovery.
- Live tenant validation required; see companion HTML setup notes.
-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
- See tests/copilot-chat-host.test.js; anonymous, SSO, failure, and validation.
-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v0.2.0  2026-10-04  Added validated per-panel startup and retry without setup UI
v0.1.0  2026-10-02  Added isolated, reusable runtime
-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Never change legacy embed behavior or downgrade authentication on failure.
- Never use client secrets or forward identity tokens to configuration URLs.
=============================================================================
*/
(function (root) {
  "use strict";

  const libraries = {
    webchat: {
      url: "https://cdn.jsdelivr.net/npm/botframework-webchat@4.19.1/dist/webchat.js",
      integrity: "sha384-XBSHlJ+fLnLFHOpyz+LIXdnKBvKGHZXNhLqdpbjSE+OvfXmurYk6c/MqKGyNUD/D"
    },
    msal: {
      url: "https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.30.0/lib/msal-browser.min.js",
      integrity: "sha384-RGxxfG5yRS8DLU7ZJ8OoLhbV/BsJFHyPuMVHrTLbpj3t5Z15LnviJmaznKY/a7LZ"
    }
  };

  function httpsUrl(value, name) {
    let url;
    try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute HTTPS URL.`); }
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new Error(`${name} must use HTTPS without credentials or a fragment.`);
    }
    return url;
  }

  function publicMetadata(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Configuration must be a JSON object.");
    }
    for (const [key, item] of Object.entries(value)) {
      if (/secret|password|accessToken|idToken|refreshToken|authorization/i.test(key) || key === "token") {
        throw new Error("Configuration must not contain secrets or tokens.");
      }
      if (Array.isArray(item)) {
        for (const entry of item) {
          if (entry && typeof entry === "object") publicMetadata(entry);
        }
      } else if (item && typeof item === "object") publicMetadata(item);
    }
  }

  function validateConfig(input, origin) {
    publicMetadata(input);
    const tokenEndpoint = httpsUrl(input.tokenEndpoint, "tokenEndpoint");
    for (const key of tokenEndpoint.searchParams.keys()) {
      if (/secret|password|token|authorization|^(sig|code|key)$/i.test(key)) {
        throw new Error("tokenEndpoint must not contain credentials; use a public token endpoint.");
      }
    }
    const domain = httpsUrl(input.directLineDomain, "directLineDomain");
    if (domain.search || !/\/v3\/directline\/?$/.test(domain.pathname)) {
      throw new Error("directLineDomain must end in /v3/directline without query parameters.");
    }
    const config = {
      tokenEndpoint: tokenEndpoint.href,
      directLineDomain: domain.href.replace(/\/$/, ""),
      title: typeof input.title === "string" ? input.title.slice(0, 100) : "Copilot",
      startConversation: input.startConversation !== false
    };
    if (input.auth !== undefined && input.auth !== null) {
      const auth = input.auth;
      if (!auth || typeof auth !== "object" || Array.isArray(auth)) throw new Error("auth must be an object.");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.clientId || "")) {
        throw new Error("auth.clientId must be an Entra application ID.");
      }
      const authority = httpsUrl(auth.authority, "auth.authority");
      const hosts = ["login.microsoftonline.com", "login.microsoftonline.us", "login.partner.microsoftonline.cn"];
      if (!hosts.includes(authority.hostname) || authority.port || authority.search ||
          !/^\/[^/]+\/?$/.test(authority.pathname)) {
        throw new Error("Use a supported Entra cloud authority with a tenant path.");
      }
      const redirect = httpsUrl(auth.redirectUri, "auth.redirectUri");
      if (redirect.origin !== origin || redirect.search ||
          !redirect.pathname.endsWith("/sidebar_CopilotAuthRedirect.html")) {
        throw new Error("auth.redirectUri must point to the same-origin sidebar_CopilotAuthRedirect.html.");
      }
      if (!Array.isArray(auth.scopes) || !auth.scopes.length ||
          auth.scopes.some(scope => typeof scope !== "string" || !scope.trim() || /\s/.test(scope))) {
        throw new Error("auth.scopes must contain nonempty scope strings.");
      }
      if (typeof auth.tokenExchangeResourceUri !== "string" || !auth.tokenExchangeResourceUri.trim()) {
        throw new Error("auth.tokenExchangeResourceUri must exactly match the agent's configured exchange URI.");
      }
      config.auth = {
        clientId: auth.clientId,
        authority: authority.href.replace(/\/$/, ""),
        redirectUri: redirect.href,
        scopes: [...auth.scopes],
        tokenExchangeResourceUri: auth.tokenExchangeResourceUri,
        loginHint: typeof auth.loginHint === "string" ? auth.loginHint : undefined
      };
    }
    return config;
  }

  function postExchange(directLine, activity, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let subscription;
      const finish = (error, id) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (subscription) subscription.unsubscribe();
        if (error) reject(error); else resolve(id);
      };
      const timer = setTimeout(() => finish(new Error("Token exchange timed out.")), timeoutMs);
      try {
        subscription = directLine.postActivity(activity).subscribe({
          next: id => finish(null, id),
          error: error => finish(error),
          complete: () => finish(null, "retry")
        });
        if (settled && subscription) subscription.unsubscribe();
      } catch (error) { finish(error); }
    });
  }

  function createAuthMiddleware({ config, directLine, userID, getToken, status, timeoutMs }) {
    const pending = new Set();
    const completed = new Set();
    let greeted = false;
    return ({ dispatch }) => next => action => {
      if (action.type === "DIRECT_LINE/CONNECT_FULFILLED" && config.startConversation && !greeted) {
        greeted = true;
        const result = next(action);
        dispatch({
          type: "DIRECT_LINE/POST_ACTIVITY",
          payload: { activity: { type: "event", name: "startConversation", channelData: { postBack: true } } }
        });
        return result;
      }
      const activity = action.payload && action.payload.activity;
      if (action.type !== "DIRECT_LINE/INCOMING_ACTIVITY" || !activity ||
          !activity.from || activity.from.role !== "bot" ||
          !Array.isArray(activity.attachments) || activity.attachments.length !== 1) {
        return next(action);
      }
      const card = activity.attachments[0];
      const content = card.content;
      if (card.contentType !== "application/vnd.microsoft.card.oauth" || !content) return next(action);
      const resource = content.tokenExchangeResource;
      if (!config.auth || !resource || !resource.id || !content.connectionName ||
          resource.uri !== config.auth.tokenExchangeResourceUri) {
        status("Agent sign-in is required. SSO is unavailable for this authentication request.");
        return next(action);
      }
      const key = JSON.stringify([content.connectionName, resource.id]);
      if (pending.has(key) || completed.has(key)) return;
      pending.add(key);
      Promise.resolve().then(() => getToken()).then(async token => {
        if (!token) throw new Error("No identity token available.");
        const id = await postExchange(directLine, {
          type: "invoke",
          name: "signin/tokenExchange",
          from: { id: userID, role: "user" },
          value: { id: resource.id, connectionName: content.connectionName, token }
        }, timeoutMs);
        if (typeof id !== "string" || !id || id === "retry") throw new Error("Agent rejected token exchange.");
        completed.add(key);
        status("Agent authentication token exchange completed.");
      }).catch(() => {
        status("SSO did not complete. Use the agent's sign-in card to continue.");
        next(action);
      }).finally(() => pending.delete(key));
      return;
    };
  }

  function createTokenProvider(auth, { getClient, interactive }) {
    let acquisition;
    return function getToken() {
      if (acquisition) return acquisition;
      acquisition = (async () => {
        const client = await getClient();
        const accounts = client.getAllAccounts();
        const account = client.getActiveAccount() || (accounts.length === 1 ? accounts[0] : null);
        const request = { scopes: auth.scopes, loginHint: auth.loginHint };
        let response;
        try {
          response = account ?
            await client.acquireTokenSilent({ ...request, account }) :
            await client.ssoSilent(request);
        } catch (error) {
          const codes = ["interaction_required", "login_required", "consent_required",
            "no_account_error", "silent_sso_error", "monitor_window_timeout"];
          if (error.name !== "InteractionRequiredAuthError" && !codes.includes(error.errorCode)) throw error;
          response = await interactive(client, request);
        }
        if (!response || !response.accessToken) return null;
        if (response.account) client.setActiveAccount(response.account);
        return response.accessToken;
      })().finally(() => { acquisition = null; });
      return acquisition;
    };
  }

  async function fetchJson(url) {
    const response = await root.fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Endpoint returned HTTP ${response.status}.`);
    return response.json();
  }

  function loadLibrary(name) {
    if (name === "webchat" && root.WebChat || name === "msal" && root.msal) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      script.src = libraries[name].url;
      script.integrity = libraries[name].integrity;
      script.crossOrigin = "anonymous";
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`${name} library load timed out.`));
      }, 20000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error(`${name} library could not load.`)); };
      root.document.head.appendChild(script);
    });
  }

  async function mount() {
    const document = root.document;
    const status = message => { document.getElementById("status").textContent = message; };
    const editor = document.getElementById("configuration");
    const start = document.getElementById("start");
    const controls = document.getElementById("auth-controls");
    const signIn = document.getElementById("sign-in");
    const agentSignIn = document.getElementById("agent-sign-in");
    const setup = document.getElementById("setup");
    const retry = document.getElementById("retry");
    const url = new URL(root.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const integrated = fragment.has("copilot");
    let deploymentConfig;
    let running = false;
    let starting = false;
    editor.value = JSON.stringify({ tokenEndpoint: "", directLineDomain: "", title: "Copilot", startConversation: true }, null, 2);

    if (integrated) {
      setup.hidden = true;
      editor.disabled = true;
      document.getElementById("preview-notice").hidden = true;
      document.getElementById("chat-title").textContent = "Copilot";
      try {
        deploymentConfig = validateConfig(JSON.parse(fragment.get("copilot")), root.location.origin);
        document.getElementById("chat-title").textContent = deploymentConfig.title;
        document.title = deploymentConfig.title;
      } catch {
        status("Invalid Copilot panel configuration. Ask your administrator to check this panel's public connection settings.");
        return;
      }
    }
    const file = url.searchParams.get("config");
    if (!integrated && file) {
      start.disabled = true;
      try {
        const url = new URL(file, root.location.href);
        if (url.origin !== root.location.origin || url.username || url.password || url.hash || url.search) {
          throw new Error("Configuration files must be same-origin URLs without credentials, queries, or fragments.");
        }
        const loaded = await fetchJson(url);
        publicMetadata(loaded);
        editor.value = JSON.stringify(loaded, null, 2);
      } catch {
        status("Configuration could not load. Paste public configuration manually; no chat has started.");
      } finally { start.disabled = false; }
    }

    const startChat = async () => {
      if (starting || running) return;
      starting = true;
      start.disabled = true;
      retry.hidden = true;
      let directLine;
      try {
        if (root.location.protocol !== "https:") throw new Error("Deploy this preview on HTTPS before starting chat.");
        const config = deploymentConfig || validateConfig(JSON.parse(editor.value), root.location.origin);
        status("Loading chat…");
        await loadLibrary("webchat");
        const credentials = await fetchJson(config.tokenEndpoint);
        if (typeof credentials.token !== "string" || !credentials.token) throw new Error("Token endpoint did not return a conversation token.");
        const userID = `dl_${root.crypto.randomUUID()}`;
        if (credentials.userId && credentials.userId !== userID) {
          // Enhanced-auth tokens bind a user ID; use the endpoint's ID consistently.
          if (typeof credentials.userId !== "string" || !/^dl_[A-Za-z0-9_-]{1,100}$/.test(credentials.userId)) {
            throw new Error("Token endpoint returned an unsupported bound userId.");
          }
        }
        const chatUserID = credentials.userId || userID;
        directLine = root.WebChat.createDirectLine({ token: credentials.token, domain: config.directLineDomain });
        let clientPromise;
        const getClient = () => {
          if (!clientPromise) clientPromise = (async () => {
            await loadLibrary("msal");
            const client = new root.msal.PublicClientApplication({
              auth: { clientId: config.auth.clientId, authority: config.auth.authority, redirectUri: config.auth.redirectUri },
              cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false }
            });
            await client.initialize();
            return client;
          })().catch(error => { clientPromise = null; throw error; });
          return clientPromise;
        };
        const interactive = (client, request) => new Promise((resolve, reject) => {
          controls.hidden = false;
          status("The agent requires sign-in. Select Sign in to complete any required MFA or consent.");
          const finish = (response, error) => {
            controls.hidden = true;
            signIn.onclick = null;
            agentSignIn.onclick = null;
            signIn.disabled = false;
            agentSignIn.disabled = false;
            if (error) reject(error); else resolve(response);
          };
          signIn.onclick = () => {
            signIn.disabled = true;
            agentSignIn.disabled = true;
            // Called directly from the user gesture, not after another async step.
            try { client.acquireTokenPopup(request).then(response => finish(response), error => finish(null, error)); }
            catch (error) { finish(null, error); }
          };
          agentSignIn.onclick = () => finish(null);
        });
        const getToken = config.auth ? createTokenProvider(config.auth, { getClient, interactive }) : () => Promise.resolve(null);
        const store = root.WebChat.createStore({}, createAuthMiddleware({ config, directLine, userID: chatUserID, getToken, status }));
        root.WebChat.renderWebChat({
          directLine, store, userID: chatUserID,
          styleOptions: { hideUploadButton: true, botAvatarInitials: config.title.slice(0, 2) }
        }, document.getElementById("chat"));
        editor.disabled = true;
        setup.open = false;
        running = true;
        status("Chat started. Authentication is requested only if the agent asks for it.");
        root.addEventListener("pagehide", () => directLine.end(), { once: true });
      } catch (error) {
        if (directLine) directLine.end();
        // Do not display raw service/identity errors, URLs, or token responses.
        status(error instanceof SyntaxError ? "Invalid JSON configuration." :
          "Chat could not start. Check connection settings, HTTPS, CORS, and SDK network policy.");
        start.disabled = false;
        retry.hidden = !integrated;
      } finally {
        starting = false;
      }
    };
    start.addEventListener("click", startChat);
    retry.addEventListener("click", startChat);
    if (integrated) await startChat();
  }

  const api = { validateConfig, postExchange, createAuthMiddleware, createTokenProvider };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else if (root.document) mount().catch(() => {
    root.document.getElementById("status").textContent = "Preview could not initialize. No chat has started.";
  });
})(typeof window === "undefined" ? globalThis : window);
