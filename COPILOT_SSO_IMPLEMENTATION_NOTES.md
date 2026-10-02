# Copilot Chat Host — Implementation and Integration Notes

**Updated:** 2026-10-02  
**Component version:** 0.1.0 preview  
**Status:** Implemented as isolated files; **not integrated, deployed, or live-tenant certified**.

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

The existing sidebar loader, panel renderer, agent iframe examples, solution ZIP,
GitHub Pages entry points, and Dataverse configuration were **not changed**.
No existing page references the new host. Adding these source files does not
activate them in the demonstration or install them in Dynamics.

## Changes implemented

Repository root for the paths below:
`/home/runner/work/Generic.Sidebar/Generic.Sidebar`.

| Added file | Purpose |
| --- | --- |
| `web resources/sidebar_CopilotChatHost.html` | Standalone chat UI, editable public JSON configuration, explicit Start chat button, and embedded setup/validation instructions. |
| `web resources/sidebar_CopilotChatHost.js` | Configuration validation, Direct Line conversation startup, lazy MSAL identity acquisition, agent-requested token exchange, and fallback handling. |
| `web resources/sidebar_CopilotAuthRedirect.html` | Inert same-origin target for MSAL silent/popup responses; requires an exact Entra SPA redirect registration. |
| `web resources/sidebar_CopilotChatHost.config.example.json` | Empty anonymous-agent configuration template; contains no working environment details or credentials. |
| `tests/copilot-chat-host.test.js` | Offline regression tests using Node's built-in test runner and mocked browser/identity/chat services. |

### Runtime behavior

- Configuration can be pasted into the host or loaded from a same-origin file
  using the host's `config` query parameter.
- Configuration loading does **not** start chat. Selecting Start chat is required
  in this preview.
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
| `startConversation` | Defaults to true; sends the greeting event after connection. This does not bypass the preview's manual Start chat step. |
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

## Validation completed and limitations

At implementation time:

- All **16 offline regression tests passed**, including anonymous behavior,
  configuration validation, scope/resource boundaries, silent acquisition,
  explicit popup wiring, cancellation, bound user IDs, duplicates, and fallback.
- Runtime JavaScript syntax and Git whitespace checks passed.
- Dependency advisory checks and changed-file secret scans reported no findings.
- CodeQL reported zero JavaScript alerts.
- An independent read-only review found no significant issues. The automated code
  review executable was unavailable.
- The implementation diff contained only the five additions listed above.

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
- [ ] Decide how per-panel public configuration will be delivered. The preview
  supports pasted JSON and same-origin JSON URLs, but does not read Dataverse
  fields or automatically select an agent configuration.
- [ ] Confirm a supported deployment mechanism for JSON configuration; do not
  assume Dataverse accepts raw JSON as a web resource type. If a different
  configuration mechanism is needed, implement and validate it separately.

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
- [ ] Decide whether to retain the preview setup UI/manual startup or implement a
  controlled production configuration/startup experience. Automated startup is
  not implemented.

### 4. Perform opt-in sidebar and solution integration

- [ ] Add the tested resources and required dependencies to the appropriate
  Dynamics solution; publish them in a non-production environment first.
- [ ] Point only a test panel at the deployed host resource, carrying its selected
  configuration through the verified deployment mechanism.
- [ ] Retain ordinary URL/HTML embeds and existing hosted-webchat panels unchanged
  unless an administrator explicitly opts them into the new host.
- [ ] Verify the existing sidebar's resource URL resolution, panel switching,
  close/reopen behavior, nested-frame authentication, and conversation isolation.
- [ ] Validate pop-out URLs retain agent configuration. A separate pop-out host
  starts a new conversation; conversation transfer is not implemented.
- [ ] Re-run existing sidebar/demo acceptance checks before modifying a shared
  default configuration or releasing a new solution package.
- [ ] Record exported solution/resource versions and a deployment rollback plan.
  No new installable solution ZIP or core release was produced by this work.

## Documentation updates to make after integration

- Update the main README's capabilities, deployment instructions, and limitations
  only when the host is actually packaged and validated.
- Document anonymous versus authenticated agent setup, public configuration
  delivery, identity registrations, cloud prerequisites, and token-broker needs.
- Add live SSO acceptance cases to the project's acceptance documentation.
- Update the system manifest, binding/architecture documentation, and actual
  solution release/version information to match the integrated deployment.
- Distinguish verified environments from untested combinations; do not describe
  this preview as universal or zero-configuration SSO.

## Commit and rollback reference

The isolated implementation was committed in:

1. `0ca0ba0` — Add isolated reusable Copilot chat host preview without integrating sidebar.
2. `8acfada` — Validate standalone chat host wiring and isolated rollback boundary.

To undo those implementation commits without rewriting history:

`git revert 8acfada 0ca0ba0`

This removes the additive preview/test changes; no existing demo configuration
was changed by those commits. This note is a separate documentation change.
Future deployment or integration changes will require their own rollback steps.
