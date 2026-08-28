# Generic.Sidebar — Specification

**Status:** DRAFT
**Version:** 0.2.0
**Created:** 2026-03-04
**Updated:** 2026-08-27

---

## Purpose

Define the functional and non-functional behavior of Generic Sidebar Core as a configurable, table-driven side pane experience for Dynamics 365 model-driven apps. Optional Android Phone and Genesys Softphone demo add-ins have separate requirements, deployments, validation, and certification scopes.

## Scope

### Generic Sidebar Core In Scope

- Sidebar initialization and pane lifecycle behavior
- Dataverse-driven runtime configuration loading
- Multi-panel rendering and tab behavior
- Embed handling for URL and HTML sources
- Instruction-band visibility behavior
- Admin-only affordances where applicable

### Out of Scope

- Changes to external embedded systems (for example, Genesys)
- Android Phone Simulator and Genesys Softphone Simulator packaging, runtime behavior, and `gensoft_*` Dataverse components
- GenericSoftphone solution deployment or validation
- Dataverse schema evolution beyond fields consumed by the sidebar runtime
- Non-Dynamics host application integrations

## Deployment Architecture

### Layer 1: Generic Sidebar Core

- Independently installable Dynamics 365 solution: `GenericSidebar_1_0_0_5.zip` (solution version 1.0.0.5, publisher prefix `sidebar`).
- The installable package and development source have separate runtime evidence. Package HTML has no embedded version marker and package JavaScript is marked 2.3.0; development source HTML is marked 2.14.0 and source JavaScript is marked 2.5.0.
- The package and source differ functionally. The ZIP is authoritative for installed behavior, and source-only multi-panel, pop-out, and navigation-preservation behavior MUST NOT be used to certify solution 1.0.0.5 until a separate runtime/package reconciliation is completed.
- Requires `sidebar_*` configuration and web-resource components only.
- MUST NOT depend on or include Android Phone Simulator, Genesys Softphone Simulator, GenericSoftphone, or `gensoft_*` components.

The package was inspected in memory on 2026-08-27. No Android, Genesys, Softphone, GenericSoftphone, or `gensoft_` string was present in archive names or textual payloads. No package was rebuilt or modified during verification.

### Layer 2: Optional Android Phone Simulator Add-in

- **File:** `Generic.AndroidCellPhone/AndroidCellPhone.html` (2.6.0)
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
- Optionally interoperates with Android 2.6.0 via `localStorage.genericSimCall`: after about three seconds Android enters its own local in-call state, writes outgoing `RINGING` with `startTime: null`, and starts scripted demo transcript playback locally. This is not transcript capture and does not indicate a confirmed connection. Genesys may independently consume the event and transition its shared call to `CONNECTED` when answered; Android does not observe or wait for that transition.

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
| Solution 1.0.0.5; packaged HTML unversioned; packaged JS 2.3.0; development source HTML 2.14.0 and JS 2.5.0; package/source reconciliation blocked | Android Phone 2.6.0 | Compatible as standalone content or as a separately deployed web resource configured in a Core panel. No package-level dependency. | Android acceptance and certification only |
| Solution 1.0.0.5; packaged HTML unversioned; packaged JS 2.3.0; development source HTML 2.14.0 and JS 2.5.0; package/source reconciliation blocked | Current Genesys file (header 1.0.0; embedded marker 1.7.1) | Compatible as separately deployed web content. Version metadata must be resolved before Genesys certification. | Genesys acceptance and certification only |
| Not required for direct interoperability | Android 2.6.0 + current Genesys file | Compatible through `localStorage.genericSimCall` in the same browser origin; Android writes `RINGING` with null `startTime`, while Genesys independently owns its answer flow. | Joint add-in interoperability validation |

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
