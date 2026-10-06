# Copilot Chat Host — Implementation and Integration Notes

**Updated:** 2026-10-06

**Component version:** 0.2.0
**Status:** Opt-in source integration implemented; **not deployed, packaged in a
new solution ZIP, or live-tenant certified**.

## Purpose and safety boundary

Generic Sidebar remains the container for configurable embedded content. The new
reusable chat host provides a possible authentication bridge for Copilot Studio
agents without hardcoding an environment, tenant, or agent.

The agent's Copilot Studio authentication configuration remains authoritative:

- Anonymous agents do not trigger user sign-in or initialize MSAL.
- An authenticated agent's matching OAuth token-exchange request triggers a
  silent SSO attempt.
- If interaction is required, a user-selected Sign in button opens a popup for
  login, MFA, or consent.
- Failed or unsupported exchanges fall back to the agent's original sign-in card.
  The host never changes an authenticated agent to anonymous mode.

The initial v0.1.0 work added isolated files only. The v0.2.0 work adds a small
opt-in branch to the sidebar panel renderer for `copilot:` configuration.
The existing loader, agent iframe examples, solution ZIP, GitHub Pages entry
points, and deployed Dataverse configuration remain unchanged. Existing embed
values retain their behavior; administrators must publish resources and
explicitly configure a panel to use this integration.

## Source integration implemented on 2026-10-04

- `web resources/sidebar_sidebar.html` now recognizes `copilot:` followed by
  public JSON configuration in an existing panel embed field.
- The renderer resolves that value to the same-environment
  `sidebar_CopilotChatHost.html`, with encoded configuration in a `copilot` URL
  fragment. Configuration does not require a JSON web resource, schema changes,
  a configuration script, or host-side Dataverse reads.
- The URL fragment preserves special characters and per-panel metadata on
  pop-out, while keeping configuration out of HTTP request/referrer URLs.
  Configured Copilot URLs are redacted in the renderer's active-panel log.
- The chat host validates the supplied metadata, hides standalone setup controls,
  and starts chat automatically. This starts the conversation, **not** user
  authentication. Agent-triggered SSO remains unchanged.
- Malformed metadata produces a local configuration error without connecting
  to an agent. It does not break neighboring legacy panels.
- A failed token fetch or terminal Direct Line connection offers Retry connection using the same
  administrator configuration; duplicate startup is prevented.
- Existing iframe tab reuse remains in place. A pop-out uses the same configuration
  but creates a separate conversation; it does not transfer chat history.
- Standalone host use without the fragment still supports manual JSON/file
  configuration and requires Start chat.
- README deployment guidance and offline regression coverage were updated.

The required deployed resource names are `sidebar_sidebar.html`,
`sidebar_CopilotChatHost.html`, `sidebar_CopilotChatHost.js`, and
`sidebar_CopilotAuthRedirect.html`. These filenames are the current integration
contract; arbitrary resource renaming is not implemented.

## Changes implemented

Repository root for the paths below:
`/home/runner/work/Generic.Sidebar/Generic.Sidebar`.

| Added file | Purpose |
| --- | --- |
| `web resources/sidebar_CopilotChatHost.html` | Standalone setup UI plus automatic configured-panel chat, retry controls, and embedded setup/validation instructions. |
| `web resources/sidebar_CopilotChatHost.js` | Configuration validation, Direct Line conversation startup, lazy MSAL identity acquisition, agent-requested token exchange, and fallback handling. |
| `web resources/sidebar_CopilotAuthRedirect.html` | Inert same-origin target for MSAL silent/popup responses; requires an exact Entra SPA redirect registration. |
| `web resources/sidebar_CopilotChatHost.config.example.json` | Empty anonymous-agent configuration template; contains no working environment details or credentials. |
| `tests/copilot-chat-host.test.js` | Offline host/sidebar regression tests using Node's built-in test runner and mocked browser/identity/chat services. |

The existing `web resources/sidebar_sidebar.html` was updated only for opt-in
resolution, Copilot URL log redaction, and avoiding phone-title autozoom for these
new chat panels.

### Runtime behavior

- Configuration can be pasted into the host or loaded from a same-origin file
  using the host's `config` query parameter.
- Standalone file/pasted configuration does **not** start chat until Start chat.
  A sidebar-supplied `copilot` fragment starts validated chat automatically.
- Web Chat 4.19.1 loads on startup. MSAL Browser 4.30.0 loads only when a matching
  agent authentication request needs it.
- Both browser bundles are pinned and integrity-checked, with jsDelivr URLs.
- The host obtains a short-lived conversation token from the configured endpoint
  and connects to the configured Direct Line domain.
- Identity tokens are separate from conversation tokens. Only an OAuth card with
  the configured exchange resource URI receives the SSO token-exchange attempt,
  using configured scopes rather than scopes taken from arbitrary messages.
- Exchange requests are bounded by a timeout and protected against duplicate
  pending/completed requests.
- Silent acquisition uses an active or single cached account, or attempts silent
  SSO. Multiple cached accounts are not arbitrarily selected.
- Chat and token exchange use a consistent conversation user ID, including a
  supported broker-provided bound ID when supplied.
- The component has no Xrm dependency and performs no Dataverse reads or writes.

### Public configuration

| Field | Requirement |
| --- | --- |
| `tokenEndpoint` | Required HTTPS JSON endpoint returning a short-lived `token`; a hosted webchat URL is not a substitute. Public API-version query parameters are allowed, credential-bearing parameters are rejected. |
| `directLineDomain` | Required HTTPS cloud-appropriate endpoint ending in `/v3/directline`. |
| `title` | Optional display metadata. |
| `startConversation` | Defaults to true; sends the greeting event after connection. Configured sidebar panels start chat automatically; standalone setup still requires Start chat. This is not an authentication-policy switch. |
| `auth` | Omit for anonymous agents; supplies identity metadata for SSO-capable authenticated agents. Its presence alone does not initiate sign-in. |
| `auth.clientId` | Entra SPA/public-client application GUID. |
| `auth.authority` | Supported Entra authority with the appropriate cloud host and tenant path. |
| `auth.redirectUri` | Exact same-origin HTTPS URL ending in `/sidebar_CopilotAuthRedirect.html`; register it as an SPA redirect URI. |
| `auth.scopes` | Nonempty list of delegated scopes appropriate for the agent's token-exchange setup. |
| `auth.tokenExchangeResourceUri` | Exact resource URI expected from that agent's OAuth card. |
| `auth.loginHint` | Optional silent SSO hint; not proof of identity. |

Configuration is public metadata, not a security policy or credential store.
Do not include client secrets, passwords, identity tokens, or Direct Line secrets.
If a secured channel needs a token broker, that broker must be separately designed,
secured, and operated; none was implemented here.

### Security controls and trust boundaries (documentation verified 2026-10-06)

- HTTPS and URL validation reject embedded credentials/fragments. Known sensitive
  property names and credential-bearing token-endpoint query parameters are
  rejected, but validation cannot recognize every secret hidden in arbitrary
  strings. Public metadata must never contain credentials.
- Entra authorities accept only tenant paths under `login.microsoftonline.com`,
  `login.microsoftonline.us`, or `login.partner.microsoftonline.cn`. The exact
  same-origin blank redirect URL must be registered as an SPA redirect.
- MSAL implements PKCE/state/nonce and uses `sessionStorage` for its cache.
  Tokens are not added to panel configuration or application logs; do not claim
  identity tokens are stored only in memory. Same-origin hosts may share cached
  identity context even though their conversations are separate.
- Configured scopes and an exact resource URI match constrain supported
  bot-origin OAuth card exchanges. Neither the optional login hint nor the
  conversation user ID establishes authorization; the agent/services enforce it.
- Web Chat 4.19.1 and MSAL Browser 4.30.0 load from pinned jsDelivr URLs with
  SHA-384 integrity and anonymous cross-origin loading. Integrity checks do not
  replace dependency review or cloud/compliance approval.
- The host's JSON fetches use `credentials: omit`, `cache: no-store`,
  `redirect: error`, and a 20-second timeout. Token-exchange posting also times
  out after 20 seconds; duplicate pending/completed exchanges are suppressed.
  These settings are not a claim that all SDK-internal requests have those options.
- Fragment metadata stays out of server request/referrer URLs but remains visible
  in the browser. The renderer redacts configured Copilot URLs in its active-panel
  log, and the host uses generic error messages rather than exposing raw service
  or identity errors.
- Restrict Dataverse configuration writes to trusted administrators. The generic
  renderer accepts configured HTML and URLs; it provides neither general HTML
  sanitization nor a sandbox boundary against all same-origin scripts.
- Server-side token broker security, endpoint authorization, token lifetime,
  rate limiting, and channel/origin restrictions are deployment responsibilities.
  No broker was added, and the host does not forward Dynamics credentials through
  its JSON fetches. CORS is not an authorization mechanism.
- SSO failure retains the agent's sign-in card, not anonymous access. Retrying a
  terminal connection can start a fresh conversation; it is not a history-transfer
  or guaranteed conversation-resumption mechanism.

## Validation completed and limitations

At implementation time:

- The original **16 offline regression tests passed**, including anonymous behavior,
  configuration validation, scope/resource boundaries, silent acquisition,
  explicit popup wiring, cancellation, bound user IDs, duplicates, and fallback.
- Runtime JavaScript syntax and Git whitespace checks passed.
- Dependency advisory checks and changed-file secret scans reported no findings.
- CodeQL reported zero JavaScript alerts.
- An independent read-only review found no significant issues. The automated code
  review executable was unavailable.
- The initial implementation diff contained only the five additions listed above.

For v0.2.0, **25 offline tests passed**, including all original cases plus
legacy embed resolution, encoded per-agent configuration, automatic anonymous
and authenticated-panel startup, invalid-configuration isolation, retry,
separate panels/pop-outs, terminal connection failure recovery, and renderer tab/frame reuse. Real browser automation
was again unavailable; live deployment/authentication checks remain outstanding.

The test command, run from the repository root, is:

`node --test tests/copilot-chat-host.test.js`

These are mock tests, **not successful live SSO or deployment evidence**. Real
browser automation was unavailable and CDN access was blocked in the sandbox.
Tenant authentication, MFA, consent, CORS, cookies, cloud/channel compatibility,
and published SDK delivery still require real-environment testing.

## Still required before integration with the existing solution

### 1. Establish a separate test deployment

- [ ] Keep the current demonstration deployment and panel records unchanged.
- [ ] Deploy the new HTML host, JavaScript runtime, and inert redirect page as
  separate resources on one HTTPS origin.
- [ ] Preserve relative script resolution and the redirect filename expected by
  validation when selecting Dynamics web resource names.
- [x] Implement per-panel public configuration using `copilot:` plus JSON in the
  existing embed field. The existing renderer reads that field and passes the
  metadata to the host; no new table/column or raw JSON web resource is required.
- [ ] Enter real public connection metadata for a test panel. Do not paste a
  hosted webchat iframe URL or credentials as the token endpoint.

### 2. Configure each agent and identity integration

- [ ] Publish an agent on a compatible Direct Line/custom-website channel and
  obtain its actual token endpoint and cloud-appropriate Direct Line domain.
- [ ] Confirm the token endpoint permits the host origin through CORS and returns
  the expected token contract. For enhanced authentication, validate its bound
  user-ID contract as well.
- [ ] For authenticated agents, configure supported Copilot Studio user
  authentication and token exchange, Entra app registrations, delegated scopes,
  consent, and any required preauthorization.
- [ ] Register the exact deployed blank redirect URL as an Entra SPA redirect.
- [ ] Supply matching public client/authority/scope/resource metadata for each
  authenticated agent. Leave `auth` absent for anonymous agents.
- [ ] Provide a secure token broker if channel security requires it; do not move
  service secrets into the browser configuration.
- [ ] Verify cloud-specific endpoints, SDK/CDN availability, compliance policies,
  CSP, WebSockets, and Entra access. Accepted authority hosts are not a guarantee
  that every commercial/GCC/GCC High/DoD/China channel combination works.

### 3. Validate before connecting a sidebar panel

- [ ] Exercise anonymous and authenticated agents in a real browser and tenant.
- [ ] Test existing/no Microsoft session, multiple accounts, MFA, consent,
  rejected exchange, expired tokens, popup blocking, and restrictive cookies.
- [ ] Verify unsupported or failed SSO leaves a usable agent sign-in path and does
  not bypass agent/downstream authorization.
- [ ] Test two separate hosts with different agent configurations.
- [x] Implement configured-panel automatic startup without editable setup UI,
  retaining manual setup for standalone use.
- [ ] Validate automatic startup and retry against real published agents.

### 4. Perform opt-in sidebar and solution integration

- [ ] Add the tested resources and required dependencies to the appropriate
  Dynamics solution; publish them in a non-production environment first.
- [x] Implement opt-in panel resolution and preserve legacy URL/HTML/webresource
  and hosted-webchat embed paths.
- [ ] Configure only a test panel with `copilot:` plus public configuration after
  publishing the updated renderer and all three host resources.
- [ ] Verify the existing sidebar's resource URL resolution, panel switching,
  close/reopen behavior, nested-frame authentication, and conversation isolation.
- [x] Verify configuration-preserving pop-out URLs in offline renderer/host tests.
- [ ] Validate actual browser pop-out and nested-frame authentication. A separate
  pop-out starts a new conversation; conversation transfer is not implemented.
- [ ] Re-run existing sidebar/demo acceptance checks before modifying a shared
  default configuration or releasing a new solution package.
- [ ] Record exported solution/resource versions and a deployment rollback plan.
  No new installable solution ZIP or core release was produced by this work.

## Documentation updates to make after integration

- Source-level opt-in deployment guidance is now in the README; update actual
  packaged release capabilities only after packaging and live validation.
- Anonymous versus authenticated setup and implemented security controls are now
  documented in the README, these notes, both specs, the manifest, and UX/acceptance
  references. Continue updating verified deployment evidence and release packaging.
- Maintain anonymous versus authenticated agent setup, public configuration
  delivery, identity registrations, cloud prerequisites, and token-broker needs.
- Live SSO/security acceptance cases are listed in `TEST_ACCEPTANCE.md`; execute
  them and attach evidence before certification rather than marking mocks as live passes.
- Update the system manifest, binding/architecture documentation, and actual
  solution release/version information to match the integrated deployment.
- Distinguish verified environments from untested combinations; do not describe
  this preview as universal or zero-configuration SSO.

## Commit and rollback reference

The isolated implementation was committed in:

1. `0ca0ba0` — Add isolated reusable Copilot chat host preview without integrating sidebar.
2. `8acfada` — Validate standalone chat host wiring and isolated rollback boundary.

For the original standalone-only revision, those two commits could be undone with:

`git revert 8acfada 0ca0ba0`

**After v0.2.0 integration, do not revert only those old commits:** first restore
any deployed test panel embed values and revert the newer integration commits
in reverse chronological order. Otherwise the renderer could reference deleted
host files. Use Git history to identify the integration/documentation commits.

Source rollback alone does not restore deployed web resources. Before deployment,
export the current solution/resources and save prior panel embed values. To roll
back a deployed integration, restore those values and publish the previous
renderer/resources (or import the saved solution according to your environment's
release process). No tenant configuration or solution archive was changed by
the source implementation.
