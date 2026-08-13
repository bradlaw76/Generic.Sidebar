# Generic.Sidebar — Specification

**Status:** FUNCTIONAL BASELINE — HOSTED SSO VALIDATION PENDING
**Version:** 2.0.1
**Created:** 2026-03-04
**Updated:** 2026-08-05
**Release:** Enterprise SSO Integration with Complete Admin Toolkit

---

## Purpose

Define the functional and non-functional behavior of Generic.Sidebar as a configurable, table-driven side pane experience for Dynamics 365 model-driven apps.

## Scope

### In Scope (v2.0.0)

- Sidebar initialization and pane lifecycle behavior
- Dataverse-driven runtime configuration loading (including 8 new SSO fields)
- Multi-panel rendering and tab behavior
- Embed handling for URL, HTML, and Copilot Studio canvas sources
- SSO authentication flow: MSAL token acquisition → Copilot token exchange → Direct Line connection
- OAuth card middleware suppression and loop guard
- Instruction-band visibility behavior
- Admin-only affordances (configuration validator, setup guide, troubleshooting)
- Token caching and session lifecycle management
- Region-aware configuration guidance (Commercial, GCC, GCCH environments; hosted validation required)
- Graceful fallback for non-SSO configurations

### Out of Scope

- Changes to external embedded systems (for example, Genesys)
- Dataverse schema evolution beyond fields consumed by the sidebar runtime
- Non-Dynamics host application integrations
- Custom topic-authoring patterns in Copilot Studio (covered in ADMIN_SETUP_GUIDE.md)
- AI model training or Copilot agent design (assumes agents pre-built)

## SSO Architecture (v2.0.0)

Generic Sidebar now includes enterprise-grade Single Sign-On powered by MSAL 2.38.3 (OAuth PKCE):

```
D365 Form (Parent)
  ├─ sidebar_sidebar.js
  │  ├─ Detects sidebar_sso_enabled flag in Dataverse config
  │  ├─ Loads SSO bootstrap + setup libraries if enabled
  │  └─ Routes to SSO canvas or standard canvas
  │
  ├─ sidebar_sso_bootstrap.js (if SSO enabled)
  │  └─ MSAL 2.38.3 token acquisition (silent + popup)
  │
  ├─ sidebar_sso_setup.js (if SSO enabled)
  │  └─ Fetches config from Dataverse + validates + acquires token
  │
  └─ [Pane Navigation]
     └─ sidebar_sso_canvas.html (SSO) OR sidebar_sidebar.html (standard)
        ├─ Receives userToken from parent
        ├─ Exchanges token with Copilot token endpoint
        ├─ OAuth card middleware suppression (max 2 silent attempts)
        ├─ Web Chat rendering with Direct Line connection
      └─ Direct Line connection for the active browser session
```

**Key Features:**
- **Zero Hardcoding:** Runtime configuration (Client IDs, Token Endpoints) comes from Dataverse
- **Silent SSO:** Users log in once, then seamless re-authentication via token cache
- **Token Caching:** sessionStorage for browser session, cleared on close
- **Fallback:** Non-SSO embeds unaffected; optional adoption per environment
- **Multi-Region:** Commercial, GCC, and GCCH guidance is documented; validate the target cloud in hosted Dynamics before production use
- **Security:** PKCE, no token logging, and immediate URL parameter stripping; query-token handoff is a documented residual risk

**Admin Deployment:**
- Dataverse `sidebar_genericsidebar` table extended with 8 SSO fields
- One-time Entra app registration per tenant (reused across all environments)
- PowerShell automation script: `Add-SidebarSSOFields.ps1`
- Configuration validator tool: `sidebar_sso_config_validator.html`
- Admin validation and rollback checklist: `ADMIN_VALIDATION_CHECKLIST.md`

---

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

### Non-Functional Requirements

- The sidebar must fail gracefully when Dataverse or embed targets are unavailable.
- UI behavior must remain consistent across supported records in the host app.
- External embeds must enforce safe referrer policy settings.
- Changes should preserve backward compatibility for existing config records.
