# Runbook: Enable SSO for Copilot Studio Agent Embedded in Dynamics 365 (GCC)

**Goal:** Stop the repeating sign-in prompt when users open the embedded Copilot agent. After these steps, the agent uses the user's existing Dynamics 365 session silently, and topics that read user identity or call connectors do not re-prompt.

**Audience:** D365 / Power Platform admin + Entra ID admin.
**Time required:** ~60–90 minutes for a first-time setup.

## Solution summary

This runbook embeds a single Copilot Studio agent inside Dynamics 365 (GCC) as a right-rail side pane, with silent single sign-on using the user's existing D365 session.

> 🛈 **Read Part 5 *before* you start authoring topics.** SSO at the channel level is necessary but not sufficient — several topic-authoring patterns (using `System.User.Email`, default Dataverse connector auth mode, unapproved connector connections) will trigger visible OAuth cards even when channel-level SSO is working perfectly. Part 5 covers each one.

> 💡 **Optional add-on:** If you want the agent to know which D365 record the user is viewing (so topics can answer "summarize my current case" or filter Dataverse lookups against the open record), see **Appendix B — Optional: passing D365 record context to the agent**. This is purely additive and not required for SSO.

**Architecture at a glance:**

```
D365 form (parent page)                         Side pane (iframe, same origin)
├─ copilotsidebar.js (JScript web resource)     ├─ copilotcanvas.html (HTML web resource)
│  ├─ Registered on form OnLoad                 │  ├─ Reads user token from pane URL
│  ├─ MSAL silent SSO (PKCE, sessionStorage)    │  ├─ GET <Token Endpoint> (Bearer user token)
│  ├─ Xrm.App.sidePanes.createPane / navigate   │  ├─ Receives Direct Line token + conversationId
│  │   with data="usertoken=<jwt>"              │  ├─ WebChat.createDirectLine + renderWebChat
│  └─ OAuth-card suppression middleware         │  └─ + New Chat button (clears cached DL session)
│      keeps residual sign-in cards silent      │
│                                               │
└───────────────── same-origin ─────────────────┘
                          │
                          ▼
           Copilot Studio agent (GCC)
             └─ Authentication: manual + federated credentials + Token Exchange URL (OBO)
```

**Key design choices:**

- **Two web resources.** A JScript web resource runs in the parent D365 form so it can use the `Xrm` API; a separate HTML web resource is the iframe content that hosts Web Chat. This keeps parent-page code and iframe code cleanly separated.
- **Token flow is OBO (On-Behalf-Of).** The parent acquires an access token for a custom API scope (`api://<auth-app>/<scope>`); Copilot Studio exchanges it for a Direct Line token via the Token Exchange URL configured on the agent. Web Chat never runs its own sign-in flow, which is what eliminates the repeating prompts.
- **Two Entra app registrations.** `CopilotAuthApp` exposes the API scope and holds the OBO client credential; `CopilotCanvasApp` is a SPA that acquires tokens via MSAL.js and is preauthorized on `CopilotAuthApp` so users are never prompted to consent.
- **Session persistence.** The canvas caches the Direct Line token + conversationId in storage so closing and reopening the pane resumes the same conversation until expiry. The **+ New chat** button clears the cache and reloads the iframe for a clean start.
- **Works for B2B guests.** Guests invited from another tenant into the GCC tenant can use the same pattern — MSAL authority is pinned to the GCC (resource) tenant ID, not `common`.

**If you already have a sidebar solution** and just want to stop the login prompts: Parts 1 and 2 (Entra app registrations + Copilot Studio authentication configuration) are the essential parts. From Part 3, you mainly need to adopt the MSAL silent-SSO block from `copilotsidebar.js` and the token-handoff + Token Endpoint call (and the **OAuth-card suppression middleware** — see callout in Part 3A) at the top of `copilotcanvas.html`; the rest of the canvas (+ New chat, session cache) is optional polish.

## Cloud & tenancy note (read this first)

- **GCC Power Platform uses the public (commercial) Microsoft Entra ID plane for authentication.** URLs like `login.microsoftonline.com` and `portal.azure.com` are correct for GCC — you will **not** see `.us` endpoints here.
- All **Entra app registrations, consents, and federated credential configuration in this runbook must happen in the GCC tenant** (the tenant that hosts D365). If you also have a separate commercial tenant (for example, user accounts are homed there and invited as B2B guests into the GCC tenant), *do not* create these app registrations in that commercial tenant — the OBO exchange must occur in the same tenant the D365 session lives in.
- **Guest users (B2B) signing into D365 GCC from another tenant are supported** by this pattern, with the caveats called out in **Part 5 → Guest-user considerations**.

## Multi-environment deployment (dev / test / prod)

You only need **one** set of Entra app registrations (`CopilotAuthApp` + `CopilotCanvasApp`) per **tenant** — not per D365 environment. The same apps, scope, federated credential, and admin consent serve dev, test, and prod environments in the same tenant.

**What you reuse across environments:**
- Both app registrations and the API scope (`api://<auth-app>/Agent.Invoke`)
- The federated credential on `CopilotAuthApp`
- Admin consent

**What's per-environment:**
- The **Copilot Studio agent** itself (each environment has its own agent and its own Token Endpoint URL).
- **Redirect URIs** on `CopilotCanvasApp` — add one SPA redirect URI for *each* environment's canvas web resource URL. A single app registration can list many (e.g., `https://contoso-dev.crm9.dynamics.com/WebResources/<prefix>_copilotcanvas.html`, `https://contoso-test.crm9.dynamics.com/...`, `https://contoso.crm9.dynamics.com/...`).
- **Web resources** deployed into each environment's solution.
- **Pre-provisioned Dataverse connections** (users do this once per environment at `https://make.powerapps.com/connections` — see Part 5.2).

**Per-environment values to swap in the canvas/sidebar code** when promoting:
- `TOKEN_ENDPOINT` — different per agent.
- `WEB_RESOURCE_PATH` — only if the publisher prefix differs across environments.
- `CLIENT_ID`, `TENANT_ID`, `API_SCOPE` — **unchanged**, all environments share these.

**You only need separate app registrations if you're crossing a true trust boundary:** different Entra tenant, different cloud (commercial ↔ GCC ↔ GCCH), or you have an explicit security requirement to isolate prod credentials from non-prod (uncommon for this pattern given the narrow scope).

## Why the current setup prompts every time

The iframe snippet provided on the **Channels → Custom website** page of Copilot Studio points directly at a public agent endpoint. It has no awareness of the user's Entra ID session in D365, so the agent's authentication topic triggers a full OAuth sign-in each time. To achieve SSO you must host a "custom canvas" page that:

1. Silently acquires a user token using MSAL (reusing the D365/Entra session).
2. Exchanges that token with Copilot Studio via the Token Exchange URL (On-Behalf-Of flow).
3. Hands a Direct Line token to the Web Chat control.

### Quick glossary

| Term | What it is |
|---|---|
| **Direct Line** | The Bot Framework REST/WebSocket channel that lets a custom client (a web page, mobile app, etc.) exchange messages with a Copilot Studio agent. It's the underlying transport that Web Chat uses. |
| **Direct Line token endpoint** | A short-lived per-user token issuer hosted by Copilot Studio. Each agent has its own. This is the **Token Endpoint** value you copy from Channels → Mobile app. **The custom canvas calls this to get the token Web Chat connects with.** |
| **Direct Line secret** | A long-lived, tenant-wide secret. *Not used in this pattern.* If you ever wired up a server-side integration, you'd use this; it must never be put in browser code. |
| **Token Exchange URL** | A Copilot Studio setting (`api://<auth-app>/<scope>`) that enables the On-Behalf-Of flow so the agent can call downstream APIs (Graph, Dataverse) as the signed-in user. **This is the toggle that turns SSO on.** |
| **MSAL** | Microsoft Authentication Library — the JS library the canvas uses to silently acquire the user's Entra token. |
| **OBO (On-Behalf-Of)** | OAuth flow in which the agent presents the user's token and gets back a new token scoped to a downstream API. Requires the two-app-registration pattern below. |

---

## Prerequisites

- [ ] Global admin (or permissions to create Entra ID app registrations + grant admin consent).
- [ ] System Customizer / System Admin role in the D365 GCC environment.
- [ ] Maker access in Copilot Studio GCC (`gcc.powerva.microsoft.us`).
- [ ] The exact D365 environment URL (e.g., `https://contoso.crm9.dynamics.com`).

---

## Part 1 — Create two Entra ID app registrations

> ⚠️ Two **separate** registrations are required. Don't reuse one.
>
> **Create both registrations in the GCC tenant** (the tenant that hosts D365), at **`https://portal.azure.com`**.

### 1A. Authentication app registration ("CopilotAuthApp")

1. Go to **https://portal.azure.com** → **Microsoft Entra ID → App registrations → New registration**.
2. Name: `CopilotAuthApp`. Supported account types: **Single tenant**. No redirect URI needed yet.
   > 🛈 **Pick Single tenant even if end users are B2B guests from another tenant.** Guest users have a directory object in the GCC (resource) tenant — from Entra's perspective they are directory users of the resource tenant, so Single tenant is correct. *Multi-tenant* is only for building apps that independently deploy into many customer tenants, which adds unnecessary consent complexity here and does not help SSO.
3. **API permissions → Add a permission → Microsoft Graph → Delegated permissions:**
   - `User.Read` — *already added by Entra by default; leave it in place.*
   - `openid`
   - `profile`
4. Click **Grant admin consent for <tenant>**.
5. **Expose an API → Set** the Application ID URI (accept the default `api://<client-id>`).
6. **Expose an API → Add a scope**:
   - Scope name: `Agent.Invoke`
   - Who can consent: **Admins and users**
   - Admin consent display name: `Agent.Invoke`
   - Admin consent description: `Allows the app to sign the user in.`
   - State: **Enabled**
7. **Authentication → Add a platform → Web**. Redirect URI: `https://token.botframework.com/.auth/web/redirect`. Click **Configure**, then **Save**.
   > 🛈 **Why this is required:** When a user's silent token exchange can't complete (first-time consent, cache cleared, guest fallback), Copilot Studio falls back to an interactive sign-in that redirects through `token.botframework.com/.auth/web/redirect`. If that URL is not registered here, Entra returns `AADSTS500113: No reply address is registered for the application` and the whole sign-in dies. Once the user completes interactive sign-in once, subsequent visits complete silently.
8. **Credentials** — pick **one** of the following (not both):
   - **Option A — Federated credentials (recommended; no long-lived secret).** ✅ Default for this runbook. You will register the federated credential in **Part 2**, not here — Copilot Studio itself is the OIDC issuer and it generates the **issuer URL** and **subject identifier** after you configure the service provider. Skip to step 9 and come back to this app registration once Part 2 tells you to.
   - **Option B — Client secret (fallback).** Only use this if *Microsoft Entra ID V2 with federated credentials* is not available in the Copilot Studio service-provider dropdown for your tenant, or if some other constraint blocks FIC. **Certificates & secrets → Client secrets → New client secret**. Copy the **Value** — you cannot retrieve it later. Remember to rotate before expiry (max 24 months).
9. **Overview** → copy **Application (client) ID**.

### 1B. Canvas app registration ("CopilotCanvasApp")

1. **App registrations → New registration**. Name: `CopilotCanvasApp`. **Single tenant** (same reasoning as 1A step 2 — B2B guests do not require Multi-tenant).
2. **Authentication → Add a platform → Single-page application (SPA)**:
   - Redirect URI: `https://<yourorg>.crm9.dynamics.com/WebResources/new_copilotcanvas.html`
     (Replace with your exact GCC host. If you use a vanity URL, list both.)
3. **API permissions → Add a permission → My APIs → CopilotAuthApp →** select the `Agent.Invoke` scope → **Add permissions** → **Grant admin consent**.
4. **Overview** → copy **Application (client) ID** — this is the canvas client ID.

### 1C. Link the two registrations

1. Return to **CopilotAuthApp → Expose an API → Authorized client applications → Add a client application**.
2. Paste the **CopilotCanvasApp** client ID from step 1B.5.
3. Check the `Agent.Invoke` scope. Save.

---

## Part 2 — Configure the Copilot Studio agent

1. Sign in at **https://gcc.powerva.microsoft.us** and open the agent.
2. **Settings → Security → Authentication**.
3. Select **Authenticate manually** and **turn ON `Require users to sign in`**.
   > ⚠️ If this toggle is **off**, Copilot Studio treats authentication as optional and will **not** perform the OBO exchange — SSO will never fire. This is one of the two most common misconfigurations.
4. **Service provider:** choose to match Part 1A step 8:
   - `Microsoft Entra ID V2 with federated credentials` — **recommended**, matches Part 1A Option A.
   - `Microsoft Entra ID V2 with client secrets` — only if you fell back to Part 1A Option B.
   > 🛈 **GCC availability check:** If the **`Microsoft Entra ID V2 with federated credentials`** option is not in the dropdown for your GCC tenant, switch to the client-secret path (Part 1A Option B). The federated-credentials option has been rolling out to GCC; if your tenant hasn't received it yet, the dropdown will not show it.
5. Fill in:
   - **Client ID**: CopilotAuthApp client ID (from 1A.9)
   - **Token Exchange URL**: `api://<CopilotAuthApp-client-id>/Agent.Invoke`  ← **this single value is what enables SSO. If it is blank, every user will get a sign-in prompt every session, regardless of everything else.**
   - **Login URL**: leave **blank**. This field is only used for Copilot Studio's own interactive magic-code fallback, which this runbook bypasses entirely — the D365 iframe does MSAL silent SSO in the parent page and hands the token to the agent via the Token Exchange URL above.
   - **Scopes**: `openid profile api://<CopilotAuthApp-client-id>/Agent.Invoke` — **the API scope must be fully qualified with its `api://…` URI**. Substitute your actual CopilotAuthApp client ID (the GUID from Part 1A step 9) — for example `openid profile api://00000000-0000-0000-0000-000000000000/Agent.Invoke`. Add any Graph scopes (e.g., `Sites.Read.All`) after, space-separated — Graph scopes do not need a URI prefix.
     > ⚠️ **Common trap #1:** The default value `profile openid` alone is not sufficient. Without your API scope in this field, Copilot Studio's server-side SSO cannot match the user's token and will fall back to emitting a visible Login card for every authenticated topic, even with the Token Exchange URL set correctly.
     > ⚠️ **Common trap #2:** Do NOT put the scope as just `Agent.Invoke`. Entra will assume the scope belongs to Microsoft Graph and sign-in will fail with `AADSTS650053: scope 'Agent.Invoke' doesn't exist on resource 00000003-0000-0000-c000-000000000000`. The `api://<client-id>/` prefix is required.
   - **Client secret** *(Option B only)*: paste the secret value from Part 1A Option B.
6. **Save.** This commits the configuration and, for the federated-credentials path, reveals the two values you need next.

### Part 2.1 — Register the federated credential on `CopilotAuthApp` *(skip if using Option B)*

After the Save in step 6, Copilot Studio displays two read-only fields on the Authentication page:

- **Federated credential issuer** — an OIDC issuer URL owned by Copilot Studio.
- **Federated credential value** — the subject identifier that Copilot Studio will put in the `sub` claim of the assertion it presents to Entra.

Copy both values. Then:

1. Azure portal → **Entra ID → App registrations → `CopilotAuthApp` → Certificates & secrets → Federated credentials** tab.
2. **+ Add credential**.
3. **Federated credential scenario**: **Other issuer**.
4. **Issuer**: paste the *Federated credential issuer* value from Copilot Studio (exact string, no trailing slash changes).
5. **Type**: **Explicit subject identifier** (default).
6. **Subject identifier**: paste the *Federated credential value* from Copilot Studio — exact string, no quotes, no extra whitespace.
7. **Audience**: leave as default `api://AzureADTokenExchange`.
8. **Name**: something descriptive, e.g. `CopilotStudio-FIC`.
9. **Add.**

> 🛈 **Why this works:** Copilot Studio acts as an external OIDC issuer. When it needs to authenticate to Entra as `CopilotAuthApp`, it mints a short-lived signed assertion with `iss` = the issuer you just registered and `sub` = the subject you just registered. Entra trusts that assertion because the federated credential on the app reg matches it. No client secret ever exists.

### Part 2.2 — Publish

7. Back in Copilot Studio, **Publish** the agent.
   > Changes to the Auth configuration require **Publish** before they take effect in the runtime. Saving alone is not enough.
8. **Channels → Direct Line → Copy the value labeled `Token Endpoint`.** Save it — you'll paste it into the HTML below.
   > This is the **Direct Line token endpoint** for the agent. Each call to it returns a short-lived user-scoped Direct Line token that Web Chat uses to open the Direct Line conversation.
   >
   > 🛈 The same URL is also surfaced as the **"Connection string"** under *Channels → Web app* and *Channels → Native app* (Microsoft is mid-rename). Prefer the one under **Direct Line** labeled *Token Endpoint* — it's explicit and future-proof. **Do not copy the iframe snippet shown as "Embed code" under Web app** — that's the anonymous public-agent embed and is the exact source of the prompting problem we're fixing.
   >
   > 🛈 The URL shape varies by region/tenant. You may see either:
   > - `https://gcc.powerva.microsoft.us/environments/<env-id>/bots/<bot-id>/directline/token?api-version=…`
   > - `https://<env-id>.environment.api.gov.powerplatform.microsoft.us/powervirtualagents/.../directline/token?api-version=…`
   >
   > Both are valid and return the same JSON body (`{ token, expires_in, conversationId }`). The HTML below calls the URL generically and does not care which form.

---


## Part 3 — Deploy the two web resources

This solution uses a two-file architecture instead of a single self-contained HTML:

| File | Role |
| --- | --- |
| `<prefix>_copilotsidebar.js` | Parent-page script. Runs in the D365 form context. Acquires the user access token via MSAL (silent) and opens the right-rail side pane. |
| `<prefix>_copilotcanvas.html` | The iframe content. Reads the user token from the side-pane `data=` query param, exchanges it at the Token Endpoint for a Direct Line token, and renders Web Chat. |

> **If you already have a sidebar implementation** (e.g. a Generic.Sidebar-based solution), you do **not** have to swap it out. The piece that eliminates the repeated login prompts is the **token handoff** — your sidebar must acquire an access token silently via MSAL and pass it into your iframe so the iframe can call the Token Endpoint itself (instead of letting Web Chat prompt the user). The canvas HTML below shows exactly how to accept that token and call the Token Endpoint; adapt your existing sidebar to pass a token the same way our `copilotsidebar.js` does.

> ⚠️ **Web resource names matter.** Whatever the final saved names end up being (e.g. `<prefix>_copilotsidebar.js`, `<prefix>_copilotcanvas.html`), the SPA redirect URI on `CopilotCanvasApp` in Entra **must match the canvas path exactly** (case-sensitive). If your publisher prefix is different, go back to Part 1B step 2 and update the redirect URI before smoke-testing.

### 3A. Create the canvas web resource

1. In the D365 maker portal, open your solution.
2. **New → Web resource**
   - Name: `copilotcanvas.html` (becomes `<prefix>_copilotcanvas.html`)
   - Type: **Web Page (HTML)**
3. Paste the HTML below, replacing the five `REPLACE_*` placeholders.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Copilot Assistant</title>
  <style>
    html, body { margin:0; padding:0; height:100%; font-family:"Segoe UI",sans-serif; background:#fff; }
    #header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #e1dfdd; }
    #header .title { font-weight:600; color:#323130; }
    #newChatBtn { background:#0078d4; color:#fff; border:0; border-radius:3px; padding:6px 12px; cursor:pointer; font-size:13px; }
    #newChatBtn:disabled { opacity:.5; cursor:default; }
    #webchat { height:calc(100vh - 45px); width:100%; }
    #status { padding:16px; color:#605e5c; }
  </style>
  <script src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"></script>
</head>
<body>
<div id="header">
  <span class="title">Assistant</span>
  <button id="newChatBtn" type="button">+ New chat</button>
</div>
<div id="status">Connecting…</div>
<div id="webchat" role="main"></div>

<script>
(function () {
  // ---- Config ----------------------------------------------------------
  var CLIENT_ID      = "REPLACE_CANVAS_APP_CLIENT_ID";
  var TENANT_ID      = "REPLACE_TENANT_ID";
  var API_SCOPE      = "api://REPLACE_AUTH_APP_CLIENT_ID/Agent.Invoke";
  var TOKEN_ENDPOINT = "REPLACE_TOKEN_ENDPOINT_FROM_COPILOT_STUDIO";
  var SESSION_KEY    = "copilot_session_v1";
  var DEBUG          = true; // set to false in production to silence token/claim logging

  function log()  { if (DEBUG) console.log.apply(console, ["[canvas]"].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, ["[canvas]"].concat([].slice.call(arguments))); }
  function err()  { console.error.apply(console, ["[canvas]"].concat([].slice.call(arguments))); }

  // ---- Read user token from the side-pane URL fragment -----------------
  function getUserTokenFromHost() {
    var qs = window.location.search.replace(/^\?/, "");
    var data = null;
    qs.split("&").forEach(function (p) {
      var i = p.indexOf("=");
      if (i < 0) return;
      if (decodeURIComponent(p.slice(0, i)) === "data") data = decodeURIComponent(p.slice(i + 1));
    });
    if (!data) return null;
    var frag = {};
    data.split(/[&;]/).forEach(function (p) {
      var i = p.indexOf("=");
      if (i < 0) return;
      frag[decodeURIComponent(p.slice(0, i)).toLowerCase()] = decodeURIComponent(p.slice(i + 1));
    });
    if (frag.usertoken) {
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      return Promise.resolve(frag.usertoken);
    }
    return null;
  }

  // ---- Fallback: iframe does its own silent SSO ------------------------
  async function getUserTokenViaMsal() {
    await new Promise(function (resolve, reject) {
      if (window.msal && window.msal.PublicClientApplication) return resolve();
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js";
      s.onload = resolve; s.onerror = function () { reject(new Error("MSAL CDN load failed")); };
      document.head.appendChild(s);
    });
    var app = new msal.PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: "https://login.microsoftonline.com/" + TENANT_ID,
        redirectUri: window.location.origin + window.location.pathname
      },
      cache: { cacheLocation: "sessionStorage" }
    });
    await app.initialize();
    var account = app.getAllAccounts()[0];
    if (!account) { var sso = await app.ssoSilent({ scopes: [API_SCOPE] }); account = sso.account; }
    app.setActiveAccount(account);
    try {
      var r = await app.acquireTokenSilent({ scopes: [API_SCOPE], account: account });
      return r.accessToken;
    } catch (e) {
      var r2 = await app.acquireTokenPopup({ scopes: [API_SCOPE], account: account });
      return r2.accessToken;
    }
  }

  // ---- Exchange user token for a Direct Line token ---------------------
  async function fetchFreshDL(userToken) {
    var res = await fetch(TOKEN_ENDPOINT, { method: "GET", headers: { "Authorization": "Bearer " + userToken } });
    if (!res.ok) throw new Error("Token endpoint returned " + res.status);
    return res.json();
  }

  // ---- Session cache ---------------------------------------------------
  function loadSession()  { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  // ---- Boot ------------------------------------------------------------
  async function boot() {
    try {
      var userToken = await (getUserTokenFromHost() || getUserTokenViaMsal());

      var directLine, isFresh = false, freshToken = null, freshExpiry = null;
      var cached = loadSession();
      var now = Date.now();
      if (cached && cached.dlToken && cached.conversationId && cached.expiryMs && cached.expiryMs > now + 60000) {
        log("reusing cached conversation", cached.conversationId);
        directLine = WebChat.createDirectLine({ token: cached.dlToken, conversationId: cached.conversationId });
      } else {
        log("starting fresh conversation");
        var data = await fetchFreshDL(userToken);
        freshToken  = data.token;
        freshExpiry = now + ((data.expires_in || 3600) * 1000);
        directLine = WebChat.createDirectLine({ token: data.token });
        isFresh = true;
      }

      // ---- Store + middleware: handle agent sign-in cards silently ----
      var store = WebChat.createStore({}, function (_ref) {
        var dispatch = _ref.dispatch;
        return function (next) { return async function (action) {
          if (action.type === "DIRECT_LINE/CONNECT_FULFILLED" && isFresh) {
            saveSession({ dlToken: freshToken, conversationId: action.payload.directLine.conversationId, expiryMs: freshExpiry });
          }
          if (action.type === "DIRECT_LINE/INCOMING_ACTIVITY") {
            var a = action.payload.activity;
            var needsAuth = a.from && a.from.role === "bot" &&
              (a.attachments || []).some(function (x) { return x.contentType === "application/vnd.microsoft.card.oauth"; });
            if (needsAuth) {
              try {
                var t = userToken; // already an access token for this scope
                dispatch({ type: "WEB_CHAT/SEND_EVENT", payload: { name: "tokens/response", value: { token: t } } });
                return;
              } catch (e) { err("silent OAuth card fulfill failed", e); }
            }
          }
          return next(action);
        }; };
      });

      document.getElementById("status").style.display = "none";
      WebChat.renderWebChat({ directLine: directLine, store: store, locale: "en-US" },
        document.getElementById("webchat"));

      // ---- Start the conversation (triggers greeting on fresh) ------
      if (isFresh) {
        directLine.postActivity({
          type: "event", name: "startConversation",
          from: { id: "copilot-canvas", role: "user" }
        }).subscribe(function () { log("startConversation event sent"); }, function () {});
      }

      // ---- + New chat button ----------------------------------------
      var btn = document.getElementById("newChatBtn");
      if (btn) btn.addEventListener("click", function () {
        log("new chat — clearing cache and reloading iframe");
        btn.disabled = true;
        clearSession();
        setTimeout(function () { window.location.reload(); }, 50);
      });
    } catch (e) {
      err("boot failed", e && (e.message || e));
      document.getElementById("status").textContent = "Failed to start the assistant.";
    }
  }
  boot();
})();
</script>
</body>
</html>
```

**Verify** the web resource loads by opening it directly:
`https://<yourorg>.crm9.dynamics.com/WebResources/<prefix>_copilotcanvas.html`
You should land in the chat with no prompt. (If opened outside a side pane, it falls back to its own MSAL silent-SSO path.)

> 🛈 **About the OAuth-card middleware (lines ~337–357 above).** Even when channel-level SSO is configured correctly, Copilot Studio can still surface a visible **OAuth card** (rendered in Web Chat as "I'll need you to sign in") when a topic references `System.User.Email` / `System.User.PrincipalName`, or when a topic step calls a connector whose connection hasn't been approved by the user yet. The middleware intercepts the inbound `application/vnd.microsoft.card.oauth` attachment and silently dispatches a `tokens/response` event with the same access token the canvas already holds, so the card never reaches the user. This is the difference between "SSO works in the Test pane" and "SSO works in production embedded scenarios." **Do not remove this block.** If you ever see "I'll need you to sign in" surface to the user anyway, jump to Part 5 — the underlying cause is almost always a topic-authoring pattern rather than a missing middleware.

### 3B. Create the sidebar web resource

1. **New → Web resource**
   - Name: `copilotsidebar.js` (becomes `<prefix>_copilotsidebar.js`)
   - Type: **Script (JScript)**
2. Paste the JS below, replacing the four `REPLACE_*` placeholders. Update the `WEB_RESOURCE_PATH` to match your canvas's final name.

```javascript
var APP = APP || {};
APP.Copilot = (function () {
  "use strict";

  var CLIENT_ID          = "REPLACE_CANVAS_APP_CLIENT_ID";
  var TENANT_ID          = "REPLACE_TENANT_ID";
  var API_SCOPE          = "api://REPLACE_AUTH_APP_CLIENT_ID/Agent.Invoke";
  var WEB_RESOURCE_PATH  = "/WebResources/REPLACE_CANVAS_RESOURCE_NAME"; // e.g. /WebResources/<prefix>_copilotcanvas.html
  var PANE_ID            = "copilot_assistant_pane";

  var _msalReady = null;
  var _msalInstance = null;

  function log() { console.log.apply(console, ["[sidebar]"].concat([].slice.call(arguments))); }

  function _canvasUrl() {
    return window.location.origin + WEB_RESOURCE_PATH;
  }

  function _loadMsal() {
    if (_msalReady) return _msalReady;
    var topWin = (function () { try { return window.top || window; } catch (e) { return window; } })();
    var existing = (typeof msal !== "undefined" && msal.PublicClientApplication) ? msal
                  : (window.msal && window.msal.PublicClientApplication) ? window.msal
                  : (topWin.msal && topWin.msal.PublicClientApplication) ? topWin.msal
                  : null;
    if (existing) { _msalReady = Promise.resolve(existing); return _msalReady; }
    _msalReady = new Promise(function (resolve, reject) {
      var s = topWin.document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js";
      s.onload = function () {
        var lib = (topWin.msal && topWin.msal.PublicClientApplication) ? topWin.msal
                 : (window.msal && window.msal.PublicClientApplication) ? window.msal
                 : (typeof msal !== "undefined" && msal.PublicClientApplication) ? msal
                 : (typeof globalThis !== "undefined" && globalThis.msal && globalThis.msal.PublicClientApplication) ? globalThis.msal
                 : (typeof self !== "undefined" && self.msal && self.msal.PublicClientApplication) ? self.msal
                 : null;
        if (lib) resolve(lib);
        else reject(new Error("MSAL loaded but no global reference found"));
      };
      s.onerror = function () {
        // Fallback: fetch + indirect eval (some envs block <script> injection from form-library scope)
        fetch("https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js")
          .then(function (r) { if (!r.ok) throw new Error("MSAL fetch " + r.status); return r.text(); })
          .then(function (code) {
            (0, eval)(code);
            var lib = (typeof msal !== "undefined" && msal.PublicClientApplication) ? msal
                     : (topWin.msal && topWin.msal.PublicClientApplication) ? topWin.msal
                     : (window.msal && window.msal.PublicClientApplication) ? window.msal
                     : (typeof globalThis !== "undefined" && globalThis.msal && globalThis.msal.PublicClientApplication) ? globalThis.msal
                     : (typeof self !== "undefined" && self.msal && self.msal.PublicClientApplication) ? self.msal
                     : null;
            if (lib) resolve(lib);
            else reject(new Error("MSAL did not attach after eval"));
          })
          .catch(reject);
      };
      topWin.document.head.appendChild(s);
    });
    return _msalReady;
  }

  async function _acquireUserToken() {
    var msalLib = await _loadMsal();
    if (!_msalInstance) {
      _msalInstance = new msalLib.PublicClientApplication({
        auth: {
          clientId: CLIENT_ID,
          authority: "https://login.microsoftonline.com/" + TENANT_ID,
          redirectUri: _canvasUrl()
        },
        cache: { cacheLocation: "sessionStorage" }
      });
    }
    await _msalInstance.initialize();
    var account = _msalInstance.getAllAccounts()[0];
    if (!account) {
      try {
        var sso = await _msalInstance.ssoSilent({ scopes: [API_SCOPE] });
        account = sso.account;
      } catch (e) {
        log("ssoSilent failed; falling back to popup", e && e.errorCode);
        var p = await _msalInstance.acquireTokenPopup({ scopes: [API_SCOPE] });
        account = p.account;
        _msalInstance.setActiveAccount(account);
        return p.accessToken;
      }
    }
    _msalInstance.setActiveAccount(account);
    try {
      var r = await _msalInstance.acquireTokenSilent({ scopes: [API_SCOPE], account: account });
      return r.accessToken;
    } catch (e) {
      var r2 = await _msalInstance.acquireTokenPopup({ scopes: [API_SCOPE], account: account });
      return r2.accessToken;
    }
  }

  async function ensureSidebar() {
    try {
      var token = await _acquireUserToken();
      var existing = Xrm.App.sidePanes.getPane(PANE_ID);
      if (existing) {
        existing.navigate({
          pageType: "webresource",
          webresourceName: WEB_RESOURCE_PATH.replace(/^\/WebResources\//, ""),
          data: "usertoken=" + token
        });
        return;
      }
      var pane = await Xrm.App.sidePanes.createPane({
        paneId: PANE_ID,
        title: "Assistant",
        imageSrc: "",
        canClose: true,
        width: 360,
        isSelected: false
      });
      pane.navigate({
        pageType: "webresource",
        webresourceName: WEB_RESOURCE_PATH.replace(/^\/WebResources\//, ""),
        data: "usertoken=" + token
      });
    } catch (e) {
      console.error("[sidebar] ensureSidebar failed", e);
    }
  }

  function onFormLoad() {
    ensureSidebar();
  }

  return { onFormLoad: onFormLoad, ensureSidebar: ensureSidebar };
})();
```

3. **Publish all customizations**.

---

## Part 4 — Wire the sidebar into D365 forms

You can skip this part if you already have your own sidebar and only want to adopt the auth pattern. Otherwise:

1. In the solution, open the form you want the assistant to appear on (e.g. **Opportunity → Main form**).
2. **Form Properties → Events → On Load → + Add**.
3. **Add library** → pick your `<prefix>_copilotsidebar.js` web resource → OK.
4. **Event Handler**:
   - Library: your sidebar web resource
   - Function: `APP.Copilot.onFormLoad`
   - **Enabled**: ✅
   - **Pass execution context as first parameter**: optional (the function does not use it, but leaving it ✅ is harmless and lets you add it later without re-wiring the form)
5. Save and **Publish**.

Repeat for each entity form that should show the assistant. The side pane persists across records within the same app session.

> ℹ️ On the **first** record opened in a session, the pane opens and the greeting appears after the agent connects (you may need to click **+ New chat** once to see the greeting — this is a Web Chat/Direct Line timing quirk, not an auth problem).

---

## Part 5 — Topic authoring under silent SSO

Channel-level SSO (Parts 1–4) silences the *initial* sign-in. But individual topic patterns can still surface a visible OAuth card or a connection-consent prompt to the user, even on a perfectly-configured agent. The four patterns below are the ones we've actually hit in production deployments — review each before authoring topics, and audit any topic that suddenly starts prompting users.

### 5.1 — Do NOT use `System.User.Email` or `System.User.PrincipalName`

**The trap:** Both system variables look harmless, but they are populated by Copilot Studio via a *separate* on-behalf-of token exchange against Microsoft Graph (`User.Read`). That exchange is not covered by your Token Exchange URL configuration, so when a topic references either variable, Copilot Studio emits an OAuth card asking the user to sign in to Graph — **every session, every user, even with SSO fully working**. The canvas middleware (Part 3A) suppresses the visible card, but the topic still stalls waiting for a `tokens/response` that doesn't fulfill the Graph audience.

**The fix:** Use `System.User.Id` (the user's Entra `oid`) and look up email yourself when needed.

| Don't | Do |
| --- | --- |
| `Send a message: Hello {System.User.Email}` | Look up email via Dataverse: `Get a row by ID` on the `systemusers` table, key = `{System.User.Id}` (the user's `oid`), project `internalemailaddress`. This is one of the few cases where **Maker-provided credentials** is appropriate — see 5.2. |
| `Set Topic.UserUpn = System.User.PrincipalName` | Set `Topic.UserId = System.User.Id`, then use that `oid` in any downstream filter. |
| Any agent instruction or generative prompt containing `{System.User.Email}` | Compute `Topic.UserEmail` from the Dataverse lookup once, then reference `{Topic.UserEmail}` in the prompt. |

> 🛈 **`System.User.DisplayName` and `System.User.Id` are safe** — they come from the same OBO token the canvas already holds. Only `Email` / `PrincipalName` trigger the additional Graph exchange.

### 5.2 — Dataverse connector authentication: choose deliberately (this is your biggest security decision)

**Background:** When you add a Dataverse action (`List rows`, `Get a row by ID`, etc.) to a topic, Copilot Studio defaults the action's **Authentication** dropdown to **"End User credentials"**. There is a second option — **"Maker-provided credentials"** — that silences the consent prompt. **They are not interchangeable.** They produce different security postures, and most teams reach for "Maker-provided" instinctively to make the prompts go away, which is how case-visibility leaks and similar data-exposure bugs slip into production.

> ⚠️ **This is the single most important decision in topic authoring under silent SSO.** Read this section in full before changing any Dataverse action's Authentication dropdown.

**What each mode actually does:**

| | End User credentials | Maker-provided credentials |
| --- | --- | --- |
| Who Dataverse sees as the caller | The end user | The maker (you, or whoever owns the connection) |
| Row-level security / column-level security applied against | The end user's roles + teams | The maker's roles + teams |
| Auditing / "modified by" stamps | The end user | The maker |
| First-use UX | Connection-consent prompt ("I'll need you to sign in") that the OAuth-card suppression middleware **cannot** silently fulfill | Silent — no prompt |
| Right choice for | Any read or write where the user must only see/affect their own slice of data | Lookups of non-sensitive metadata where it's acceptable for everyone to see the same thing |

**Concrete examples:**

| Scenario | Correct mode | Why |
| --- | --- | --- |
| `List rows` on `incident` to find "my similar cases" | **End User** | Cases have RLS via team ownership / business units. Maker-mode would return cases the user isn't entitled to see. |
| `List rows` on `account` filtered by the current record | **End User** | Same — account visibility is RLS-controlled in most D365 deployments. |
| `Get a row by ID` on `systemuser` to resolve the calling user's `oid` → `internalemailaddress` (replacement for `System.User.Email` from 5.1) | **Maker-provided** OK | Reading a user's own directory metadata is non-sensitive, and the maker only needs `systemuser` read. RLS isn't meaningful here because the row being read is the user's own. |
| `List rows` on a custom **public reference table** (e.g., a published knowledge taxonomy, product catalog) | **Maker-provided** OK | The data is intentionally available to everyone. RLS isn't applied. |
| Any **write** (`Add a new row`, `Update a row`) — creating a case, updating an account, posting a note | **End User** | Maker-mode would attribute the write to the maker, breaking audit trails. Use end-user mode and accept the one-time consent. |

**The honest trade-off:** for the typical embedded scenario (find similar cases, summarize current case, look up related contacts), you **must** use End User credentials, which means users will see a one-time "Connect to Dataverse" prompt the first time they hit each Dataverse-using topic in each environment. That prompt is by design — it is the platform's row-level-security enforcement point. The OAuth-card suppression middleware in Part 3A cannot silently fulfill it (and shouldn't — silently establishing a Dataverse connection on a user's behalf without their knowledge would be a security regression, not a feature).

**To remove the in-chat consent prompt for End User credentials topics, pre-provision the Dataverse connection at rollout:**

1. Tell users to visit `https://make.powerapps.com/connections` once at rollout.
2. Click **+ New connection** → search for **Microsoft Dataverse** (or **Common Data Service (current environment)** depending on the action) → select your environment → **Create**.
3. Sign in (silently, since they're already signed in to D365 in the same browser).

After this, subsequent invocations of the topic find an approved connection and proceed silently — with full row-level security still intact.

**Decision shortcut:**

- If RLS matters (almost always true for business data) → **End User credentials + pre-provision connections at rollout**.
- If RLS doesn't matter (looking up your own directory metadata, reading a public catalog) → **Maker-provided credentials** is fine and silent out of the box.
- If you're unsure → default to **End User credentials**. The cost is a one-time consent prompt. The cost of guessing wrong with Maker-provided is a data-exposure incident.

### 5.3 — Plan for one-time connector consent (Power Automate, MCP, Graph connectors)

**The trap:** Connectors *other than* Dataverse (Power Automate flows, MCP tools, Office 365 Outlook, SharePoint, custom connectors) cannot use the Maker-provided credentials pattern. The first time a user triggers a topic that calls one of these connectors, they will see a one-time **connection consent prompt** ("Connect to Office 365" etc.) in the agent — even with SSO fully working. After they approve once, subsequent calls are silent.

**The fix:** Two paths:

- **Path A — Pre-provision via Power Apps "Manage your connections"**: tell users to visit `https://make.powerapps.com/connections` once at rollout, click **+ New connection**, and pre-create connections for each connector the agent uses. After this, no in-chat consent prompt appears.
- **Path B — Document the one-time approval** in your end-user comms ("the first time you ask about email, you'll see a Connect to Office 365 prompt — click Allow once and you'll never see it again"). Set expectations rather than fight the platform.

Do **not** rely on the OAuth-card suppression middleware (Part 3A) to silence these — it cannot, because the connector needs an actual connection record in Power Platform, not just a bearer token.

### 5.4 — Generative Answers and Knowledge sources have their own auth surface

**The trap:** Adding a **Knowledge source** (SharePoint site, Dataverse table, public website) to a topic that uses **Generative Answers** can trigger:
- A separate sign-in prompt to the underlying data source (SharePoint), or
- Silent failure where the knowledge source shows "Ready" in the configuration UI but returns zero references at runtime (notably in GCC with Dataverse Knowledge against `incident` and other case tables).

**The fix:**
- For SharePoint knowledge sources: ensure the same admin consent that covers `CopilotAuthApp`'s scope also covers `Sites.Read.All` (Part 1A step 3 lists it as optional — it's *required* if you use SharePoint Knowledge).
- For Dataverse knowledge in GCC: Validate in the Test pane with real user queries before relying on it in production.

### 5.5 — Quick pre-publish audit checklist

Before publishing any new or modified topic, search the topic for these strings and remediate before saving:

- [ ] `System.User.Email` → replace per 5.1
- [ ] `System.User.PrincipalName` → replace per 5.1
- [ ] Any **Dataverse** action → confirm the Authentication dropdown choice matches the decision table in 5.2 — **End User credentials** for any data subject to row-level security (the default-correct answer), **Maker-provided** only for the narrow non-sensitive cases. When in doubt, End User.
- [ ] Any **non-Dataverse connector** → confirm the rollout plan covers connection consent per 5.3
- [ ] Any **Generative Answers** node with a Knowledge source → smoke-test in the Test pane with a real user query and confirm references appear

---

## Part 6 — Troubleshooting

Work the parent (D365 page) console and the iframe console **separately** — right-click inside the pane → Inspect Frame for the iframe's console.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Endless login prompts in the Copilot Studio iframe | Token Exchange URL field is empty in Copilot Studio *Authentication*, or `CopilotCanvasApp` is not listed as an authorized client on `CopilotAuthApp` | Fill `api://<auth-app>/<scope>` and **Publish**; verify the linked client GUID matches the Canvas app's Client ID |
| `AADSTS65001: consent required` on first load | Admin consent wasn't granted in the GCC tenant | In **Entra → App registrations → API permissions → Grant admin consent for <tenant>** on both apps |
| Pane opens but chat shows *Failed to start the assistant* | Canvas redirect URI in Entra doesn't match the actual web resource URL exactly | Update the SPA redirect URI on `CopilotCanvasApp` to the real `/WebResources/<prefix>_copilotcanvas.html` (case-sensitive) |
| `DIRECT_LINE/POST_ACTIVITY 502` just after startup | Transient upstream issue in the commercial→Gov Direct Line proxy | Click **+ New chat** — this clears the stale DL session and usually recovers immediately; no code change needed |
| Greeting doesn't render on the first pane open after a fresh login | Cached DL conversation id + fresh token race during Web Chat bootstrap | Click **+ New chat** once; the reload gets it back into a clean state. Known Web Chat quirk, not an auth issue |
| Prompts only in Edge/Chrome with strict privacy | Third-party cookies blocked in iframe | `cacheLocation: "sessionStorage"` (already in the HTML); confirm the web resource is same-origin as D365 (it is by design) |
| Guest users still can't get answers from SharePoint/Graph | OBO for guest identities has known limitations | See *Guest-user considerations* below |
| Token Exchange URL field is empty in Copilot Studio | SSO is **off** | Fill it with `api://<auth-app-client-id>/<scope>` and **Publish** |
| **"I'll need you to sign in" card appears the first time a topic runs, despite SSO working in other topics** | Topic references `System.User.Email` or `System.User.PrincipalName` (triggers an additional Graph OBO that the canvas suppression cannot fulfill) | Replace with `System.User.Id` + a Dataverse lookup (Part 5.1) |
| **Topic stalls silently after a Dataverse `List rows` step** (no error, no response) | The Dataverse action is set to **"End User credentials"** and the user hasn't pre-approved the connection — the OAuth card was suppressed by the middleware but the action can't proceed without a connection record | **Do not** instinctively switch to Maker-provided credentials — that bypasses row-level security (Part 5.2). Instead, pre-provision the Dataverse connection at rollout via `https://make.powerapps.com/connections`. Switch to Maker-provided **only** if the data being read is non-sensitive (e.g., the user's own directory metadata) per the decision table in 5.2. |
| **"Connect to Office 365" / "Connect to SharePoint" prompt** in the agent UI | A connector (Power Automate, Outlook, SharePoint, custom) requires a one-time connection-consent that suppression middleware cannot silently fulfill | Pre-provision via Power Apps **Manage your connections** (Part 5.3 Path A) or document the one-time approval (Path B) — not fixable in code |
| **First-time deployment: Test pane works but embedded canvas doesn't** | OAuth-card suppression middleware was removed or modified in the canvas | Confirm lines ~337–357 of the canvas HTML (the `WebChat.createStore` middleware block) are intact — this is the silent-fulfillment shim and is mandatory for embedded scenarios (Part 3A callout) |
| **Sidebar console shows `ensureSidebar failed: msal is not defined` or `MSAL did not attach after eval`** | The form library runs in a scope where `<script>`-injected MSAL doesn't attach to a global the sidebar code can see (some D365 envs wrap form-library execution) | The sidebar's `_loadMsal` in Part 3B already handles this — it injects into `window.top.document`, checks five globals, and falls back to fetch+`eval`. If you see this symptom, confirm you deployed the Part 3B code verbatim (the original `<script src="...">` pattern without the top-window fallback fails silently in newer envs) |

### Guest-user considerations (B2B users from another tenant)

If end users are guest accounts invited from a different tenant into the GCC tenant that hosts D365:

1. **Admin consent must be granted in the GCC (resource) tenant**, not the guest's home tenant. Guests cannot self-consent — re-grant consent on both app registrations in the GCC tenant if in doubt.
2. **The guest must have accepted the B2B invite** and completed first-time sign-in to the GCC tenant at least once. A pending invitee will fail silent SSO.
3. **MSAL authority must be the GCC (resource) tenant ID**, not `common` and not the guest's home tenant. The code in Parts 3A/3B already does this (`authority: https://login.microsoftonline.com/<TENANT_ID>`, TENANT_ID = the GCC tenant).
4. **OBO tokens for guest identities may lack `upn` / `email` claims.** If a topic relies on UPN, have it fall back to the `oid` claim. Test any Graph/Dataverse/SharePoint call made on-behalf-of a guest early — this is the most common failure point and is usually not a configuration bug but an OAuth semantics constraint.
5. **SharePoint/OneDrive on-behalf-of guests** is particularly fragile: a guest in Tenant B who has no home footprint in Tenant B's SharePoint may be unable to read even shared content via Graph. Validate with a real guest account before declaring success.

---

## Appendix A — Security review

This section summarizes the trust boundaries, credential flow, and known hardening opportunities so you can make an informed decision before promoting this pattern to production.

> 🛈 **What this section is — and isn't.** This solution uses standard Microsoft OAuth 2.0 / OIDC patterns (MSAL.js 2.x with PKCE, federated credentials, single-tenant app registrations, narrow custom scope, same-origin iframe, admin-consented pre-authorization). The items below are **best-practice hardening opportunities and disclosed residual risks, not vulnerabilities**. Nothing on this list blocks production use of the pattern as designed — the "Already-secure design choices" subsection is the meat of the review; the "Optional hardening" subsection is for environments with elevated security requirements (highly regulated, public-sector enclaves with hardened browser policies, etc.) that want to dial trade-offs further than the defaults.

### Credential and data flow

```
D365 form (parent page)
  └── MSAL.js (SPA, PKCE) → Entra → access token for api://<auth>/<scope>
        └── side-pane iframe ← token passed via URL query (?data=usertoken=<jwt>)
              └── GET <Token Endpoint>  (Bearer: user access token)
                    └── Copilot Studio returns Direct Line token + conversationId
                          └── Web Chat connects to directline.botframework.com using DL token
```

Secrets involved:

| Credential | Lifetime | Where stored | Blast radius |
| --- | --- | --- | --- |
| User access token (audience = `api://<auth>/<scope>`) | ≈ 1 hour | MSAL `sessionStorage`, and transiently in iframe URL | Callers of Copilot Studio Token Endpoint only — cannot call Graph or other APIs |
| Direct Line token | ≈ 1 hour | iframe `localStorage` (key `copilot_session_v1`) | One conversation with one agent on directline.botframework.com |
| MSAL refresh token | Session (tab) | `sessionStorage` | New access tokens for the same SPA + scope, until the session ends |

### ✅ Already-secure design choices

1. **SPA + PKCE** — MSAL.js 2.x is used throughout; Authorization Code flow with PKCE is enforced. Implicit grant is disabled on both app registrations (Part 1B step 3).
2. **Single-tenant app registrations** — only users (including B2B guests) in the GCC tenant can sign in.
3. **Narrow custom scope** — a single scope with a specific audience; cannot be used to call Graph or other APIs.
4. **MSAL cache in `sessionStorage`** — tokens die when the tab closes.
5. **Same-origin iframe** — the canvas loads from the D365 origin, so `BroadcastChannel`, MSAL cache and cookies are same-origin-isolated. No third-party script runs in the D365 page by design.
6. **Admin-consented authorized-client linkage** — `CopilotCanvasApp` is preauthorized on `CopilotAuthApp`, so users never see a consent prompt for this scope.
7. **Standard interactive fallback** — the agent sign-in card redirects to `token.botframework.com/.auth/web/redirect`, a Microsoft-owned URL.

### Optional hardening for higher-security environments

The defaults above are appropriate for typical D365 deployments. The items below are **opt-in tightenings** for environments with elevated requirements (highly regulated industries, sovereign clouds, agencies with strict browser-policy baselines). None of them are required for the pattern to be safely production-deployed as written.

| # | Finding | Recommendation |
| --- | --- | --- |
| 1 | **Access token passed in iframe URL query.** The token appears in `window.location.search` of the iframe, in the iframe's `src` attribute, and briefly in the iframe's history state. The code calls `history.replaceState` to strip it, but it still exists in the DOM for a window. | Switch to a `postMessage` handshake: parent posts the token to `iframe.contentWindow` after the iframe's `load` event and the iframe's `message` listener reads it. Keeps the token out of any URL. If this is too intrusive, the current mechanism is defensible because the iframe is same-origin and the scope is narrow. |
| 2 | **Direct Line token cached in `localStorage`.** Persists across tab/browser restarts until expiry. XSS on the D365 page would yield ≈1 hour of agent access. | Change `localStorage` to `sessionStorage` for the `SESSION_KEY` reads/writes. Trade-off: session ends when the tab closes. |
| 3 | **Web Chat script is unpinned (`latest`).** A breaking CDN update could silently change behavior. | Pin to a tested version (e.g., `https://cdn.botframework.com/botframework-webchat/4.16.0/webchat.js`) and add a Subresource Integrity (`integrity="sha384-…"`) hash to both the Web Chat and MSAL `<script>` tags. Optionally host both libraries as D365 web resources to eliminate the CDN dependency. |
| 4 | **Debug logging of JWT claims.** The canvas logs decoded access-token and DL-token claims to the console by default (useful during initial rollout). | Already parameterized — set the `DEBUG` flag to `false` before promoting to production. |
| 5 | **Scope name `Agent.Invoke` is descriptive of the OBO action.** ✅ Addressed by default in this runbook. | If you rename the scope in your environment, remember to update all four places it appears: Entra app reg, the Token Exchange URL in Copilot Studio, the Scopes field in Copilot Studio, and the `API_SCOPE` constant in both web resources. Users remain consented since the admin already consented to the app itself. |
| 6 | **Long-term credentials on `CopilotAuthApp`.** ✅ Addressed by default in this runbook — Part 1A step 8 / Part 2 use **federated credentials** (no stored secret, no rotation). Only applies if you fell back to the client-secret option. | If a client secret is in use, migrate to federated credentials per Part 2.1. A client secret has a maximum lifetime of 24 months and must be rotated. |

### 🔒 Accepted residual risks

- A compromise of the **D365 origin itself** (XSS in D365, malicious browser extension with page access) would let an attacker read the MSAL and DL token caches. This is inherent to any browser-based SSO — mitigated at the Power Platform / browser policy level, not in these web resources.
- The user's access token is transiently visible to anything running in the iframe during boot. Since no third-party code runs in the D365 web resource iframe (same-origin by design), this is defensible for production use; tighten via the `postMessage` handshake (Finding #1 above) if your threat model requires it.

### Optional hardening menu (if your environment requires it)

These are the same items as the table above, listed in rough order of value-add for environments that want to tighten further than the defaults. None are prerequisites for production rollout.

1. Pin Web Chat and MSAL to specific versions and add SRI hashes.
2. Switch Direct Line session cache from `localStorage` to `sessionStorage`.
3. Set `DEBUG = false` in the canvas production copy.
4. Replace URL-query token handoff with a `postMessage` handshake.
5. *(Done by default.)* Confirm the scope name is descriptive (`Agent.Invoke` in this runbook). If you change it in your environment, update all four places: Entra app reg, Copilot Studio Token Exchange URL, Copilot Studio Scopes field, and the `API_SCOPE` constant in both web resources.
6. *(Done by default.)* Confirm `CopilotAuthApp` is using a federated credential and no client secret is configured. If you fell back to a secret, migrate per Part 2.1.

---

## Executive summary

> The repeating login prompts in your embedded iframe come from Web Chat trying to run its own OAuth sign-in flow inside the iframe without sharing the user's D365 session. The fix has three parts: **(1)** perform a silent SSO in the **parent** D365 page using MSAL, and pass the resulting access token into the iframe so the iframe can call the Copilot Studio Token Endpoint directly (Part 3A code) — Web Chat then never has to sign the user in again. **(2)** keep the OAuth-card suppression middleware in the canvas (Part 3A callout) — it silently fulfills any residual sign-in cards the platform emits. **(3)** audit your topics against Part 5 — even a fully-SSO-configured agent will prompt users if topics use `System.User.Email`, default Dataverse connector auth, or unapproved connector connections.
>
> If you already have a sidebar implementation you want to keep, you only need to port two things: (1) the MSAL silent-SSO block from `copilotsidebar.js`, and (2) the token-handoff + Token Endpoint call + **OAuth-card suppression middleware** at the top of `copilotcanvas.html`. The rest of the canvas (+New chat, session cache) is optional polish.
>
> The **Authentication** configuration on the agent in Copilot Studio (Part 2) is mandatory regardless of which sidebar you use — an empty Token Exchange URL field is the single most common cause of the repeated-prompt symptom.

---

## Appendix B — Optional: passing D365 record context to the agent

Everything above gets you a working, silent-SSO embedded agent. **This appendix is optional add-on functionality** for when you want the agent to know *which D365 record the user is currently viewing*, so topics can answer questions like "summarize my current case" or filter Dataverse lookups against the open record without the user having to paste an ID.

The pattern adds:

- A `BroadcastChannel` in the parent sidebar that publishes `{entityName, recordId, recordName}` whenever a form loads.
- A listener in the canvas iframe that forwards each message to the agent as a Direct Line `event` activity named `recordContext`.
- A small "Record Context Received" topic in the agent that captures the event into Global variables for other topics to consume.

If you don't need this, skip the appendix entirely — the SSO solution works without it.

### B1. Canvas HTML additions

In `<prefix>_copilotcanvas.html`, add the channel-name constant alongside `SESSION_KEY`:

```javascript
  var CONTEXT_CHANNEL = "copilot-context-channel";
  var SESSION_KEY    = "copilot_session_v1";
```

In the boot function, immediately after `WebChat.renderWebChat(...)` and **before** the `startConversation` block, add the record-context bridge:

```javascript
      // ---- Record-context bridge from parent ------------------------
      var contextChannel = null;
      try {
        contextChannel = new BroadcastChannel(CONTEXT_CHANNEL);
        contextChannel.onmessage = function (e) {
          var ctx = e.data || {};
          log("recordContext event sent", ctx);
          directLine.postActivity({
            type: "event",
            name: "recordContext",
            from: { id: "copilot-canvas", role: "user" },
            value: ctx
          }).subscribe(function () {}, function (err2) { warn("postActivity failed", err2); });
        };
      } catch (e) { warn("BroadcastChannel unavailable", e); }
```

In the **+ New chat** button handler, close the channel before reloading:

```javascript
      if (btn) btn.addEventListener("click", function () {
        log("new chat — clearing cache and reloading iframe");
        btn.disabled = true;
        clearSession();
        try { if (contextChannel) contextChannel.close(); } catch (e) {}
        setTimeout(function () { window.location.reload(); }, 50);
      });
```

### B2. Sidebar JS additions

In `<prefix>_copilotsidebar.js`, add the channel constant and a module-scoped channel handle alongside the existing `_msalReady` / `_msalInstance` declarations:

```javascript
  var CONTEXT_CHANNEL    = "copilot-context-channel";

  var _contextChannel = null;
```

Add the `publishRecordContext` helper function inside the IIFE (next to `ensureSidebar`):

```javascript
  function publishRecordContext(formContext) {
    try {
      if (!_contextChannel) _contextChannel = new BroadcastChannel(CONTEXT_CHANNEL);
      var id   = formContext.data.entity.getId().replace(/[{}]/g, "");
      var name = formContext.data.entity.getEntityName();
      var pname;
      try { pname = formContext.data.entity.getPrimaryAttributeValue(); } catch (e) {}
      _contextChannel.postMessage({ entityName: name, recordId: id, recordName: pname || "" });
    } catch (e) { console.warn("[sidebar] publishRecordContext failed", e); }
  }
```

Replace the `onFormLoad` function so it pulls the form context and publishes after ensuring the sidebar is open:

```javascript
  function onFormLoad(executionContext) {
    var formContext = executionContext.getFormContext();
    ensureSidebar();
    publishRecordContext(formContext);
  }
```

### B3. Form-handler update

On the **Form Properties → Event Handler** for `APP.Copilot.onFormLoad` (Part 4 step 4), confirm:

- **Pass execution context as first parameter**: ✅ (required — the function now consumes it)

Re-publish each form you wired in Part 4.

### B4. Agent-side: "Record Context Received" topic

The canvas now sends a Direct Line `event` activity named `recordContext` whenever the user opens or switches records. Capture it in a dedicated topic so other topics can read the values from Global variables.

1. In Copilot Studio, open your agent → **Topics → + New topic → From blank**.
2. Name it **Record Context Received**.
3. **Trigger → Event activity received**.
4. Add a **Condition** node directly under the trigger:
   - Left: `Activity.Name` (select from variable picker)
   - Operator: **is equal to**
   - Right: `recordContext` — **enter this as a raw string, with NO surrounding quotes**. Typing `"recordContext"` in the value field makes the condition look for a 14-character string that includes the quotes and will never match.
5. On the **True** branch, add three **Set a variable value** nodes:
   | Variable (Global scope) | Value |
   | --- | --- |
   | `Global.CurrentEntityName` | `Activity.Value.entityName` |
   | `Global.CurrentRecordId`   | `Activity.Value.recordId` |
   | `Global.CurrentRecordName` | `Activity.Value.recordName` |
   Declare each as **Global** scope (not Topic) the first time you reference it, so other topics can read them.
6. End the topic (no message to the user).
7. **Save → Publish**.

### B5. (Optional) "Current Record" verification topic

Useful for end-user smoke testing that record context is flowing. Create a topic triggered on a phrase such as *"what record am I viewing"* that returns:

> You're currently viewing the **{Global.CurrentEntityName}** record **{Global.CurrentRecordName}** ({Global.CurrentRecordId}).

Add a fallback branch for when `Global.CurrentEntityName` is blank:

> I don't have a record in focus right now. Open a record in Dynamics and try again.

**Publish** after each change — topic edits require a publish before the new conversation picks them up.

### B6. Troubleshooting (record-context-specific)

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Record context never reaches the agent | Condition in *Record Context Received* compares against `"recordContext"` (with quotes) | Edit the condition value to `recordContext` with no quotes; Save + Publish |
| Record context works when switching records but not on first open | `onFormLoad` runs before the pane's iframe has registered its `BroadcastChannel` listener | Covered by the `ensureSidebar()` call order — first navigation reliably includes the pending event once the iframe finishes boot. If reproducing, check that the canvas console logs `recordContext event sent` |
| Agent reply: *"I don't have a record in focus right now"* after record context works | The answering topic reads the Global variables before *Record Context Received* has completed its Set-variable nodes | Give the context topic priority (move it above your answering topic in the topic list) and ensure the answering topic reads **Global.** variables, not Topic-scoped ones |
