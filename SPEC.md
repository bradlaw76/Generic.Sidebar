# Generic.Sidebar — Specification

**Status:** DRAFT
**Version:** 0.3.0
**Created:** 2026-03-04
**Updated:** 2026-10-06

---

## Purpose

Define the functional and non-functional behavior of Generic.Sidebar as a configurable, table-driven side pane experience for Dynamics 365 model-driven apps.

## Scope

### In Scope

- Sidebar initialization and pane lifecycle behavior
- Dataverse-driven runtime configuration loading
- Multi-panel rendering and tab behavior
- Embed handling for URL and HTML sources
- Opt-in `copilot:` public JSON panels and agent-requested Entra SSO (chat host v0.2.0 source integration)
- Instruction-band visibility behavior
- Admin-only affordances where applicable

### Out of Scope

- Changes to external embedded systems (for example, Genesys)
- Dataverse schema evolution beyond fields consumed by the sidebar runtime
- Non-Dynamics host application integrations
- Automatic tenant deployment, Entra registrations, server-side token broker implementation, and universal cloud/channel certification

## Sidecar Components

### Android Cell Phone Simulator (Samsung S25 Ultra)

- **File:** `Generic.AndroidCellPhone/AndroidCellPhone.html` (v2.5.0)
- **Documentation:** `Generic.AndroidCellPhone/DOCUMENTATION.md`
- Embeddable phone simulator for contact center demos
- Outgoing/incoming call flows via `localStorage.genericSimCall`
- Dual mode: D365 (Xrm.WebApi) and Standalone (fallback JSON)
- Settings screen (Ctrl+Shift+D or home grid icon) for profile selection, transcript toggle, browser URL config
- Standalone profile & transcript editing with localStorage persistence (D365 mode: read-only)
- Embedded iframe browser with DuckDuckGo search and blocked-site fallback
- Lock screen with swipe-to-unlock gesture, power button lock/unlock, and configurable wallpaper
- Camera screen with live webcam viewfinder (getUserMedia), shutter flash animation, front/rear flip, and graceful fallback
- Web Audio API synthesized ringtone, fallback wallpaper, default transcript

### Genesys Softphone Simulator

- **File:** `SidecarItems/Genesys Softphone/Genesys Softphone.html`
- Call handling, transcript streaming, CRM writeback via Xrm.WebApi
- Writes `gensoft_transcriptcompleted = true` on transcript completion

### Dataverse Schema (GenericSoftphone Solution)

- **Solution:** GenericSoftphone v1.0.0.11, Unmanaged, Publisher prefix `gensoft_`
- **Table 1:** `gensoft_genericsoftphone` — 13 columns (ringtone, transcript, pop mode, wallpaper, etc.)
- **Table 2:** `gensoft_demo_profile` — 7 columns (queue, caller, scenario presets)
- **Deployment:** `specs/main/scripts/create-dataverse-schema.ps1` (3-phase: review, apply, sample data)
- **Schema spec:** `specs/main/dataverse-schema.md`

## Requirements

### Functional Requirements

- Sidebar must open through the Dynamics 365 side pane API.
- Runtime config must be loaded from `sidebar_genericsidebar` records.
- Sidebar must support up to four configured panels.
- Tab UI must render only when at least two panels have content.
- Switching tabs must preserve iframe state and not recreate loaded frames.
- Missing or invalid config must show a graceful placeholder.
- Configured Copilot panels must start validated chat automatically without setup
  controls; standalone host setup must retain manual Start chat.
- Legacy URL/HTML/webresource paths must not be migrated implicitly. Copilot
  pop-out must retain configuration but starts a separate conversation.

### Non-Functional Requirements

- The sidebar must fail gracefully when Dataverse or embed targets are unavailable.
- UI behavior must remain consistent across supported records in the host app.
- External embeds must enforce safe referrer policy settings.
- Changes should preserve backward compatibility for existing config records.

### Copilot Authentication and Security

- Agent configuration remains authoritative: anonymous agents must not initiate
  user authentication; matching bot OAuth cards may trigger silent SSO using
  configured scopes and an exact token-exchange resource URI match.
- Interaction-required login/MFA/consent must use an explicit user-initiated popup.
  Unsupported or failed exchange must retain the original sign-in card without
  downgrading the agent to anonymous mode.
- Public metadata must contain no secrets/tokens. Validate HTTPS endpoints,
  reject URL credentials/fragments and known sensitive keys/query parameters,
  constrain Entra authority hosts, and require the exact registered same-origin
  `sidebar_CopilotAuthRedirect.html` SPA redirect URL.
- Use MSAL PKCE/state/nonce and sessionStorage caching; keep identity and
  conversation tokens separate. Hints/user IDs are not authorization.
- Pin and integrity-check browser SDKs. Host JSON fetches must omit credentials,
  disable caching, reject redirects, and time out; bounded token-exchange posting
  and duplicate suppression must preserve a fallback sign-in path.
- Treat Dataverse embed writers as trusted administrators: ordinary HTML embeds
  are not generally sanitized or sandboxed. Restrict configuration writes and
  secure token endpoints/brokers independently of client validation or CORS.
- Only public metadata may travel in the fragment; this is not encryption.
  Avoid raw identity/service errors and redact integrated URLs in active-panel logs.

**Validation status:** Source integration is implemented, but no new solution ZIP
or live tenant certification was produced. Recorded offline mocks do not verify
actual MFA, consent, cookies, CORS, or cloud compatibility. See
[deployment/security details](./COPILOT_SSO_IMPLEMENTATION_NOTES.md) and
[acceptance checks](./TEST_ACCEPTANCE.md).
