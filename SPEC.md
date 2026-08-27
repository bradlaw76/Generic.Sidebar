# Generic.Sidebar — Specification

**Status:** FUNCTIONAL BASELINE — HOSTED SSO VALIDATION PENDING
**Version:** 2.1.0
**Created:** 2026-03-04
**Updated:** 2026-08-27
**Release:** Core deployment-boundary clarification; runtime versions unchanged

---

## Purpose

Define the functional and non-functional behavior of Generic Sidebar Core as a configurable, table-driven side pane experience for Dynamics 365 model-driven apps. Optional Android Phone and Genesys Softphone demo add-ins have separate requirements, deployments, validation, and certification scopes.

## Scope

### Generic Sidebar Core In Scope

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
- Android Phone Simulator and Genesys Softphone Simulator packaging, runtime behavior, and `gensoft_*` Dataverse components
- GenericSoftphone solution deployment or validation
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

## Deployment Architecture

### Layer 1: Generic Sidebar Core

- Independently installable Dynamics 365 solution: `GenericSidebar_1_0_0_5.zip` (solution version 1.0.0.5, publisher prefix `sidebar`).
- Core runtime versions are tracked independently: `sidebar_sidebar.html` 2.15.5 and `sidebar_sidebar.js` 2.6.0.
- Requires `sidebar_*` configuration and web-resource components only.
- MUST NOT depend on or include Android Phone Simulator, Genesys Softphone Simulator, GenericSoftphone, or `gensoft_*` components.

The package was inspected in memory on 2026-08-27. No Android, Genesys, Softphone, GenericSoftphone, or `gensoft_` string was present in archive names or textual payloads. No package was rebuilt or modified during verification.

### Layer 2: Optional Android Phone Simulator Add-in

- **File:** `Generic.AndroidCellPhone/AndroidCellPhone.html` (2.8.2)
- **Documentation:** `Generic.AndroidCellPhone/DOCUMENTATION.md`
- Independently deployed as standalone HTML or a separate Dynamics web resource; it is never added to the base Core package.
- Embeddable phone simulator for contact center demos
- Outgoing/incoming call flows via `localStorage.genericSimCall`
- Dual mode: D365 (Xrm.WebApi) and Standalone (fallback JSON)
- Settings screen (Ctrl+Shift+D or home grid icon) for profile selection, transcript toggle, browser URL config
- Standalone profile & transcript editing with localStorage persistence (D365 mode: read-only)
- Embedded iframe browser with DuckDuckGo search and blocked-site fallback
- Lock screen with swipe-to-unlock gesture, power button lock/unlock, and configurable wallpaper
- Camera screen with live webcam viewfinder (getUserMedia), shutter flash animation, front/rear flip, and graceful fallback
- Web Audio API synthesized ringtone, fallback wallpaper, default transcript

### Layer 3: Optional Genesys Softphone Simulator Add-in

- **File:** `SidecarItems/Genesys Softphone/Genesys Softphone.html`
- **Documentation:** `SidecarItems/Genesys Softphone/README.md`
- Independently deployed and never added to the base Core package.
- Call handling, transcript streaming, CRM writeback via Xrm.WebApi
- Writes `gensoft_transcriptcompleted = true` on transcript completion
- Optionally interoperates with Android 2.8.2 via `localStorage.genericSimCall`: Android writes outgoing `RINGING` with `startTime: null`; Genesys transitions to `CONNECTED` when answered.

### Optional Add-in Dataverse Schema

- **Solution:** GenericSoftphone v1.0.0.11, Unmanaged, Publisher prefix `gensoft_`
- **Table 1:** `gensoft_genericsoftphone` — 13 columns (ringtone, transcript, pop mode, wallpaper, etc.)
- **Table 2:** `gensoft_demo_profile` — 7 columns (queue, caller, scenario presets)
- **Deployment:** `specs/main/scripts/create-dataverse-schema.ps1` (3-phase: review, apply, sample data)
- **Schema spec:** `specs/main/dataverse-schema.md`

The GenericSoftphone solution and all `gensoft_*` components support optional add-in scenarios only. They are not Generic Sidebar Core dependencies or Core certification evidence.

## Compatibility Matrix

| Generic Sidebar Core | Optional add-in | Compatibility statement | Validation scope |
| --- | --- | --- | --- |
| Solution 1.0.0.5; HTML 2.15.5; JS 2.6.0 | Android Phone 2.8.2 | Compatible as standalone content or as a separately deployed web resource configured in a Core panel. No package-level dependency. | Android acceptance and certification only |
| Solution 1.0.0.5; HTML 2.15.5; JS 2.6.0 | Current Genesys file (header 1.0.0; embedded marker 1.7.1) | Compatible as separately deployed web content. Version metadata must be resolved before Genesys certification. | Genesys acceptance and certification only |
| Not required for direct interoperability | Android 2.8.2 + current Genesys file | Compatible through `localStorage.genericSimCall` in the same browser origin; current outgoing contract begins at `RINGING` with null `startTime`. | Joint add-in interoperability validation |

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
