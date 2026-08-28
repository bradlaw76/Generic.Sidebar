🚀 Generic Sidebar for Dynamics 365 — Release v1.0.5
The Generic Sidebar kit provides a flexible, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps.
Instead of writing custom HTML/JS each time, you configure a single Dataverse table row to control instructions, embeds, icons, and theming.

## Deployment Layers

This repository contains three separate deployment layers. They share integration contracts, not a single solution package or certification result.

| Layer | Current version evidence | Deployment boundary |
| --- | --- | --- |
| **Generic Sidebar Core** | Solution `1.0.0.5`; active web resources `sidebar_sidebar.html` 2.15.5 and `sidebar_sidebar.js` 2.6.0 | Independently installable base Dynamics 365 solution. Requires only `sidebar_*` components and does not include or depend on Android, Genesys, GenericSoftphone, or `gensoft_*` components. |
| **Android Phone Simulator add-in** | `AndroidCellPhone.html` 2.6.0 | Optional demo add-in. Deploy standalone or as a separate web resource. Its optional Dataverse mode uses the separate GenericSoftphone schema. Never add it to the base Core package. |
| **Genesys Softphone Simulator add-in** | Current file has component header 1.0.0 and embedded UI marker 1.7.1; version identity remains unresolved | Optional demo add-in deployed separately. It can interoperate with Android 2.6.0 through `localStorage.genericSimCall`. Never add it to the base Core package. |

The historical SSO release label `v2.0.0`, specification versions, solution package version, and individual web-resource versions identify different artifacts. They are intentionally reported separately rather than being overwritten with one arbitrary version.

### Base Package Verification

On 2026-08-27, `GenericSidebar_1_0_0_5.zip` was inspected in memory without extraction or modification. The solution identifies itself as `GenericSidebar` 1.0.0.5 with publisher prefix `sidebar`. No archive entry name or textual payload contains Android, AndroidCellPhone, Genesys, Softphone, GenericSoftphone, or `gensoft_` content. The package must remain Core-only.

✨ What’s New in v1.0.5

✅ Admin Acknowledgement Banner
* Added a demo disclaimer banner visible only to admins.
* Includes a “Acknowledge” button that flips sidebar_acknowledged = Yes in the default row.
* Ensures clear consent before use in production.

✅ PowerApps Canvas App support
* The sidebar_embedcode field now accepts Canvas App embed code alongside Copilot, URLs, HTML snippets, and web resources.

✅ Improved Copilot Embeds
* Full-height rendering ensured.
* Optional theming applied via sidebar_primarycolor, sidebar_textcolor, sidebar_linkcolor.

✅ Flow Template (Docs)
* Release notes & docs now include a recommended Power Automate Flow to enforce a single default row at any time.

🛠 Features
* Table-driven config (sidebar_genericsidebar) — no redeployments required.
* Rich instructions band with bullet/heading normalization.
* Embed options:
  * Copilot Studio Bot
  * External Websites
  * Raw HTML Snippets
  * PowerApps Canvas Apps

🪖 Optional
* Optional icon field (sidebar_sidebaricon) in header.
* Full iframe customization (allow, style, width, height).
* Safe defaults (auto-applied allow attributes, strict referrer policy).

---

## Optional Add-in: Android Phone Simulator

A self-contained Samsung S25 Ultra HTML phone simulator used for contact center demos. It is not part of Generic Sidebar Core and its deployment or validation does not certify Core.

**File:** `Generic.AndroidCellPhone/AndroidCellPhone.html` — **Version 2.6.0**
**Documentation:** `Generic.AndroidCellPhone/DOCUMENTATION.md`

### Features
* Samsung S25 Ultra chassis with realistic home screen, dock, status bar
* Outgoing + incoming call flows via `localStorage.genericSimCall`
* Dual mode: **D365 Mode** (Xrm.WebApi reads from Dataverse) / **Standalone Mode** (embedded fallback JSON)
* Settings screen (Ctrl+Shift+D or home grid icon) — profile selector, transcript toggle, browser URL config
* Standalone profile & transcript editing with localStorage persistence (D365 mode: read-only profiles)
* Embedded iframe browser (Chrome icon) with DuckDuckGo search, blocked-site detection, "Open in New Tab" fallback
* Web Audio API synthesized ringtone (440+480 Hz dual-tone, 2s on / 4s off cadence)
* Lock screen with swipe-to-unlock gesture, power button lock/unlock, real-time clock
* Camera screen with live webcam viewfinder (getUserMedia), shutter flash, front/rear flip, graceful fallback
* Fallback wallpaper, default Insurance Inquiry transcript

### Optional Add-in Dataverse Schema
* **Table 1:** `gensoft_genericsoftphone` — softphone configuration (ringtone, transcript, pop mode, wallpaper)
* **Table 2:** `gensoft_demo_profile` — pre-built demo profiles (queue/caller/scenario presets)
* **Solution:** GenericSoftphone v1.0.0.11 (Unmanaged)
* **Deployment script:** `specs/main/scripts/create-dataverse-schema.ps1`

These `gensoft_*` components belong to the optional add-in deployment. They are not prerequisites or members of `GenericSidebar_1_0_0_5.zip`.

## Optional Add-in: Genesys Softphone Simulator

The current Genesys simulator is stored at `SidecarItems/Genesys Softphone/Genesys Softphone.html` and is deployed separately from Generic Sidebar Core. Its D365 demo configuration uses the separate `gensoft_*` schema. It can also independently receive Android Phone Simulator events through `localStorage.genericSimCall`; Android 2.6.0 enters its own local in-call state after about three seconds, writes `RINGING` with `startTime: null`, and starts its transcript immediately. Genesys manages its own ringing and answer flow and may change the shared call to `CONNECTED`; Android does not observe or wait for that change.

See [Genesys Softphone add-in documentation](SidecarItems/Genesys%20Softphone/README.md) for requirements, deployment, validation, and compatibility.

---


⚡ Usage Instructions
1. Import the Solution
2. Import the managed/unmanaged solution into your Dynamics 365 environment.
3. Create a Config Row
   Open the Generic Sidebar Configuration table (sidebar_genericsidebar) and create one record with sidebar_default = Yes.
4. Set Key Fields
   Fill in:
   * sidebar_title — header title (shown in the pane chrome).
   * sidebar_instructions — rich text instructions (bullets/headings supported).
   * sidebar_embedcode — choose:

   https://... (External URL)
   <iframe ...></iframe> (Copilot or Canvas App)
   Raw HTML

Example of HTML Configuration
![Import Solution Screenshot](./screenshots/Generic.Sidebar.Admin.HTML.png)

Example Displayed to End User
![Import Solution Screenshot](./screenshots/Generic.Sidebar.Admin.HTML.Embed.png)


Example of Copilot Studio Configuration
![Import Solution Screenshot](./screenshots/Generic.Sidebar.Admin.CSStudio.Embed.png)

Example Displayed to End User
![Import Solution Screenshot](./screenshots/Generic.Sidebar.CopilotStudio.Embed.png)

Help, Issue Reporting and Survey\
![Import Solution Screenshot](./screenshots/Generic.Sidebar.Admin.AgentSurvey.png)

How to Add JS to a new Form
1. Add the generic_sidebar.js web resource to your form and set OnLoad handler → Generic_OpenSidebar.
2. Publish & Refresh
3. Publish all customizations, then hard refresh (Ctrl/Cmd+Shift+R).

## GitHub Pages Publishing Boundary

The current workflow at `.github/workflows/static.yml` uploads `path: '.'`, so GitHub Pages publishes the entire checked-out repository rather than only the intended public site. This includes internal specifications, scripts, tests, archives, and certification documents.

The recommended future approach is to assemble a site-only `dist/` directory containing `index.html`, `downloads/`, approved `pages/` content, and only the public assets those pages require, then configure `actions/upload-pages-artifact` with `path: dist`. A direct site-directory artifact is also acceptable if the public files are consolidated first. This task does not change the workflow or deployment behavior; workflow scoping requires separate authorization and validation.

📋 Known Limitations
* External sites may block embedding (X-Frame-Options / CSP).
* sidebar_acknowledged is optional; banner skipped if missing.


⚠️ Disclaimer
This kit is provided as-is. It is intended primarily for demo / proof-of-concept purposes.
Before production use, admins must acknowledge the disclaimer via the welcome banner (sets sidebar_acknowledged = Yes).
