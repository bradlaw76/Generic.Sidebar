# Generic Sidebar for Dynamics 365

Generic Sidebar Core provides a flexible, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps with enterprise Single Sign-On (SSO) support.

Instead of writing custom HTML/JS each time, you configure a single Dataverse table row to control instructions, embeds, icons, theming, and SSO authentication—with **zero hardcoding** and **full backwards compatibility**.

## Deployment Layers

This repository contains three separate deployment layers. They share integration contracts, not a single solution package or certification result.

| Layer | Current version evidence | Deployment boundary |
| --- | --- | --- |
| **Generic Sidebar Core** | Solution `1.0.0.5`; active web resources `sidebar_sidebar.html` 2.15.5 and `sidebar_sidebar.js` 2.6.0 | Independently installable base Dynamics 365 solution. Requires only `sidebar_*` components and does not include or depend on Android, Genesys, GenericSoftphone, or `gensoft_*` components. |
| **Android Phone Simulator add-in** | `AndroidCellPhone.html` 2.8.2 | Optional demo add-in. Deploy standalone or as a separate web resource. Its optional Dataverse mode uses the separate GenericSoftphone schema. Never add it to the base Core package. |
| **Genesys Softphone Simulator add-in** | Current file has component header 1.0.0 and embedded UI marker 1.7.1; version identity remains unresolved | Optional demo add-in deployed separately. It can interoperate with Android 2.8.2 through `localStorage.genericSimCall`. Never add it to the base Core package. |

The historical SSO release label `v2.0.0`, specification versions, solution package version, and individual web-resource versions identify different artifacts. They are intentionally reported separately rather than being overwritten with one arbitrary version.

### Base Package Verification

On 2026-08-27, `GenericSidebar_1_0_0_5.zip` was inspected in memory without extraction or modification. The solution identifies itself as `GenericSidebar` 1.0.0.5 with publisher prefix `sidebar`. No archive entry name or textual payload contains Android, AndroidCellPhone, Genesys, Softphone, GenericSoftphone, or `gensoft_` content. The package must remain Core-only.

## Historical Release v2.0.0: Enterprise SSO Integration

🔐 **Single Sign-On (SSO) for Copilot Studio**
* Users authenticate once to Dynamics 365, then access Copilot agents seamlessly (no sign-in prompts).
* MSAL 2.38.3 OAuth PKCE flow with silent token acquisition.
* Session-scoped token caching — tokens cleared on browser close for security.
* Graceful fallback — if SSO fails, standard canvas embeds continue working.

🛠 **Complete Admin Toolkit**
* **ADMIN_SETUP_GUIDE.md** — Step-by-step configuration (10 sections, Entra app registration to end-to-end testing).
* **SECURITY_GUIDE.md** — Token lifecycle, credential storage, HIPAA compliance, GCC/GCCH region support.
* **TROUBLESHOOTING.md** — 26 error categories with root causes and remediation steps.
* **Add-SidebarSSOFields.ps1** — PowerShell automation to extend Dataverse table with 8 SSO fields.
* **Configuration Validator Tool** — Admin preflight checks for SSO setup.

📊 **Product-Grade Architecture**
* Runtime configuration is stored in Dataverse (Client IDs, Token Endpoints) — not in code. Do not store browser client secrets in configuration records.
* Single configuration per Dataverse row — reusable across environments (dev/test/prod).
* Multi-region support: Commercial, GCC, GCCH endpoints.
* OAuth card middleware suppression — prevents infinite login loops.

🔄 **Full Backwards Compatibility**
* Non-SSO configs work exactly as before (no changes required).
* v1.0.5 → v2.0.0 upgrade is seamless (optional SSO adoption).

---

### Previous Release Highlights (v1.0.5)

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

## Getting Started with SSO (v2.0.0)

If you're deploying Generic Sidebar with Copilot Studio agents:

1. **Read:** [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md) — Complete step-by-step configuration
2. **Review:** [SECURITY_GUIDE.md](SECURITY_GUIDE.md) — Token lifecycle and compliance requirements
3. **Run:** `Add-SidebarSSOFields.ps1` — Automatically extend Dataverse table with SSO fields
4. **Validate:** Use `sidebar_sso_config_validator.html` — Preflight checks before deployment
5. **Troubleshoot:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — 26 error scenarios with solutions

**First-time setup takes ~30 minutes.** Re-environment deployment is a single Dataverse record copy.

## SSO Validation Status (2026-07-23)

The Dataverse-driven multi-agent picker and SSO handoff were validated in this branch.

Validated behaviors:
- Agent picker renders from Dataverse child-table model with fallback list when Dataverse rows are unavailable.
- Picker selection transitions UI state from action panel to active chat frame mode.
- Selected agent metadata is encoded and passed to the SSO canvas via data query payload.
- SSO canvas parses tokenEndpoint and usertoken parameters and performs Direct Line token exchange logic.

Validation caveat:
- Local file:// preview cannot complete real Entra interactive token acquisition in all environments. Final sign-in validation must be executed in hosted Dynamics context.
- The local configuration validator checks format and field consistency only; it does not perform live Dataverse, Entra, or Copilot Studio validation.
- The functional pre-admin-review source baseline is tagged `admin-review-baseline-2026-08-05`.

Deployment validation checklist:
1. Open the side panel from Dynamics (not from file://).
2. Select one agent row from the picker.
3. Confirm Entra token acquisition succeeds (silent or popup).
4. Confirm chat frame loads and Direct Line conversation starts.
5. Confirm Change button returns to picker.

See also:
- ADMIN_SETUP_GUIDE.md (operations + setup)
- ADMIN_VALIDATION_CHECKLIST.md (deployment, hosted-runtime validation, and rollback)
- TROUBLESHOOTING.md (runtime issues)
- SECURITY_GUIDE.md (token handling and hardening)
- docs/sso-validation-report-2026-07-23.md (validation evidence)

---

## Optional Add-in: Android Phone Simulator

A self-contained Samsung S25 Ultra HTML phone simulator used for contact center demos. It is not part of Generic Sidebar Core and its deployment or validation does not certify Core.

**File:** `Generic.AndroidCellPhone/AndroidCellPhone.html` — **Version 2.8.2**
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

The current Genesys simulator is stored at `SidecarItems/Genesys Softphone/Genesys Softphone.html` and is deployed separately from Generic Sidebar Core. Its D365 demo configuration uses the separate `gensoft_*` schema. It can also receive Android Phone Simulator events through `localStorage.genericSimCall`; Android 2.8.2 initiates outgoing calls as `RINGING` with `startTime: null`, and Genesys changes the call to `CONNECTED` when answered.

See [Genesys Softphone add-in documentation](SidecarItems/Genesys%20Softphone/README.md) for requirements, deployment, validation, and compatibility.

---


⚡ Usage Instructions
1. Import the Solution
2. Import the managed/unmanaged solution into your Dynamics 365 environment.
3. Use Packaged Generic Sidebar Forms
   The solution now includes pre-built Generic Sidebar forms for common OOB tables:
   * Case -> `Case Generic.Sidebar`
   * Account -> `Account Generic.Sidebar`
   * Contact -> `Contact Generic.Sidebar`
   * Lead -> `Lead Generic.Sidebar`
   * Opportunity -> `Opportunity Generic.Sidebar`
   Select these forms in app designer or form order based on your deployment preference.
4. Create a Config Row
   Open the Generic Sidebar Configuration table (sidebar_genericsidebar) and create one record with sidebar_default = Yes.
5. Set Key Fields
   Fill in:
   * sidebar_title — header title (shown in the pane chrome).
   * sidebar_instructions — rich text instructions (bullets/headings supported).
   * sidebar_embedcode — choose:

   https://... (External URL)
   <iframe ...></iframe> (Copilot or Canvas App)
   Raw HTML

### Configure the Sidebar in the Admin App

The **Generic Sidebar Configuration** table in the model-driven admin app controls what users see on every packaged `* Generic.Sidebar` form. The forms launch the sidebar; the configuration record supplies its title, panels, linked agents, and optional SSO settings.

1. Open the model-driven app that contains the **Generic Sidebar Configuration** table.
2. Open an existing configuration record or create a new record.
3. Set **Default** (`sidebar_default`) to **Yes** for exactly one intended configuration record. This is the shared configuration loaded by the packaged forms.
4. Configure up to four panels using the corresponding title, instructions, and embed fields:
   * Panel 1: `sidebar_title1`, `sidebar_instructions`, `sidebar_embedcode`
   * Panel 2: `sidebar_title2`, `sidebar_instructions2`, `sidebar_embedcode2`
   * Panel 3: `sidebar_title3`, `sidebar_instructions3`, `sidebar_embedcode3`
   * Panel 4: `sidebar_title4`, `sidebar_instructions4`, `sidebar_embedcode4`
5. Use an embed field for a URL, `webresource:Name.html`, raw HTML, a Copilot Studio iframe, or a Canvas App embed.
6. To use linked agents, create related **Generic Sidebar Agent** rows, set `sidebar_isactive = Yes`, leave the Dataverse record active, and choose the target tab through **Agent Menu Tab** (`sidebar_agentmenutab`).
7. Enable and complete SSO fields only when the selected sidebar experience requires SSO. Keep browser client secrets out of configuration records.
8. Save the configuration record, publish customizations when form or web-resource changes were made, and open a packaged form to test the result.

Configuration edits normally do not require form rework or solution re-import. Updating the selected default configuration record changes the shared sidebar experience for all five packaged forms.

For the single optional **Agent Menu Tab** administration field, including the exact Choice values and UI-only creation steps, see [Agent Menu Tab field setup](docs/agent-menu-tab-field-setup.md).

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

Packaged Form Wiring
1. `Generic_OpenSidebar` is already wired on the packaged `* Generic.Sidebar` forms.
2. For additional custom forms you create later, add `sidebar_sidebar.js` and OnLoad handler `Generic_OpenSidebar`.
3. Publish all customizations, then hard refresh (Ctrl/Cmd+Shift+R).

## Packaged OOB Forms

Generic Sidebar can be delivered as a solution-managed experience for the following out-of-box tables:

| Table | Logical name | Packaged form |
| --- | --- | --- |
| Case | `incident` | `Case Generic.Sidebar` |
| Account | `account` | `Account Generic.Sidebar` |
| Contact | `contact` | `Contact Generic.Sidebar` |
| Lead | `lead` | `Lead Generic.Sidebar` |
| Opportunity | `opportunity` | `Opportunity Generic.Sidebar` |

Each is a new standard main form that calls the existing `Generic_OpenSidebar` entry point on form load. The OOB primary forms remain intact; administrators choose whether to expose the Generic.Sidebar form through app designer or form order.

The sidebar behavior remains shared and configuration-driven: forms reuse the default `sidebar_genericsidebar` record maintained in the Generic Sidebar Configuration admin app, including panel layout, linked-agent selection, and SSO/non-SSO routing behavior. No form-specific embed code or runtime routing is required.

Implementation and release artifacts:

* [Packaged forms implementation guide](docs/packaged-generic-sidebar-forms-implementation.md)
* [Packaged forms release sign-off](docs/packaged-generic-sidebar-forms-release-signoff.md)
* [Agent Menu Tab field setup](docs/agent-menu-tab-field-setup.md)
* [Admin validation checklist](ADMIN_VALIDATION_CHECKLIST.md)

## GitHub Pages Publishing Boundary

The current workflow at `.github/workflows/static.yml` uploads `path: '.'`, so GitHub Pages publishes the entire checked-out repository rather than only the intended public site. This includes internal specifications, scripts, tests, archives, and certification documents.

The recommended future approach is to assemble a site-only `dist/` directory containing `index.html`, `downloads/`, approved `pages/` content, and only the public assets those pages require, then configure `actions/upload-pages-artifact` with `path: dist`. A direct site-directory artifact is also acceptable if the public files are consolidated first. This task does not change the workflow or deployment behavior; workflow scoping requires separate authorization and validation.

## Presentation Summary

Use this six-part narrative when presenting the feature:

1. **Opportunity:** provide one consistent Generic Sidebar experience across records teams already use.
2. **Change:** move from per-form JavaScript setup to solution-packaged forms.
3. **Scope:** deliver standard forms for Case, Account, Contact, Lead, and Opportunity.
4. **Architecture:** every packaged form calls `Generic_OpenSidebar`, which loads the shared Dataverse configuration and existing sidebar runtime.
5. **Governance:** package forms directly in the solution; validate handler wiring, runtime behavior, SSO behavior, and OOB primary-form safety.
6. **Decision:** approve creation, sandbox validation, and managed-solution release of the five forms.

📋 Known Limitations
* External sites may block embedding (X-Frame-Options / CSP).
* sidebar_acknowledged is optional; banner skipped if missing.


⚠️ Disclaimer
This kit is provided as-is. It is intended primarily for demo / proof-of-concept purposes.
Before production use, admins must acknowledge the disclaimer via the welcome banner (sets sidebar_acknowledged = Yes).

## License

Generic Sidebar is licensed under the [MIT License](LICENSE).
