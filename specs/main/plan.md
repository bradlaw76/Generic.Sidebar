# Implementation Plan: Generic.Sidebar — Sidebar UX Demo

**Branch**: `main` | **Date**: 2026-02-17 | **Spec**: /specs/main/spec.md (to be created)
**Input**: UX demo requirements for Dynamics 365 sidebar kit; configuration-driven behavior via Dataverse
**Security documentation updated**: 2026-10-06

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a configuration-driven Dynamics 365 sidebar that renders up to four panels (title, instructions band, embed content) inside a model-driven app side pane. Panels read from Dataverse (`sidebar_genericsidebar`) and support Copilot, Canvas App, URL, and raw HTML embeds. GitHub Pages provide public documentation, release statistics, and agent guidance.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: HTML5, CSS3, JavaScript (ES6+); PowerShell scripts for agent context  
**Primary Dependencies**: Dynamics 365 `Xrm.WebApi`, `Xrm.App.sidePanes`; Chart.js (GitHub Pages); Tailwind CDN (GitHub Pages only); pinned Web Chat 4.19.1 and MSAL Browser 4.30.0 only for opt-in Copilot host panels
**Storage**: Dataverse (table: `sidebar_genericsidebar`)  
**Testing**: Manual/live acceptance using `TEST_ACCEPTANCE.md`; Copilot host/sidebar mocks use `node --test tests/copilot-chat-host.test.js` (25 recorded passing tests, not live SSO certification)
**Target Platform**: Dynamics 365 model-driven apps (side pane), GitHub Pages  
**Project Type**: web (Dynamics 365 web resources + static website)  
**Performance Goals**: NEEDS CLARIFICATION  
**Constraints**: Zero redeployment for config changes; Safe embedding (`referrerPolicy`, explicit `allow`); WCAG 2.1 AA; graceful degradation on API failures  
**Scale/Scope**: NEEDS CLARIFICATION

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Configuration-Driven: All behavior sourced from Dataverse record fields (pass/fail)
- Zero-Redeployment: Config changes require no web resource redeploy (pass/fail)
- Safe Embedding: Iframes use strict referrer policy, explicit `allow`; no raw `innerHTML` from external APIs (pass/fail)
- Graceful Degradation: Placeholders and error messages render on missing config or API failures (pass/fail)
- Accessibility: WCAG 2.1 AA; `aria-label` on charts, `scope="col"` on table headers; skip-to-content links; consistent navigation (pass/fail)

**2026-10-08 documentation review:** These historical gates are not recorded
passes. The constitution's Technology Constraints prohibit external frameworks
inside web resources, whereas the opt-in chat host uses Web Chat and MSAL.
An approved exception or governance amendment remains required; this documentation
update does not silently amend the constitution. The core renderer does not
depend on those SDKs. Also, full-height HTML processing is layout handling,
not sanitization or proof of XSS isolation. Apply the documented trusted-writer
boundary and complete live acceptance checks before certification.

## Implemented Copilot Security Architecture (source v0.2.0)

The existing renderer accepts opt-in `copilot:` public JSON values and resolves
them to the local chat host with fragment configuration. Legacy embeds are not
migrated. The configured host starts chat automatically; anonymous chat does not
initialize MSAL. Matching agent OAuth cards request scoped Entra SSO, with an
explicit popup when login/MFA/consent is needed and original-card fallback on
rejected or unsupported exchange.

The host validates HTTPS URLs, known credential-bearing keys/query parameters,
Entra authority hosts, and same-origin SPA redirects. MSAL handles PKCE/state/nonce
and sessionStorage caching. Browser bundles are pinned and integrity-checked;
host JSON requests omit credentials, disable caching, reject redirects, and
time out. Fragment metadata is public, integrated active-panel URLs are redacted
in logs, and raw identity/service errors are not displayed.

Configuration writers are trusted administrators: ordinary embeds are not
generally sanitized or sandboxed. Secure endpoint/broker authorization, consent,
rate limits, CSP/CORS, and cloud/channel compatibility require deployment work.
No new solution ZIP, token broker, or live tenant certification has been produced.
Refer to [README security guidance](../../README.md#security-and-authentication)
and [implementation notes](../../COPILOT_SSO_IMPLEMENTATION_NOTES.md) rather than
treating historical plan gates as proof that security acceptance passed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
web resources/
├── sidebar_sidebar.html
├── sidebar_sidebar.js
├── sidebar_welcome.html
├── sidebar_GenericSidebarAgent.html
├── sidebar_CopilotChatHost.html
├── sidebar_CopilotChatHost.js
├── sidebar_CopilotAuthRedirect.html
├── sidebar_CopilotChatHost.config.example.json
├── sidebar_GenericSidebar_AdminSurvey.html
└── generic.sidebar.logo.png

pages/
├── agent/index.html
├── copilot/index.html
└── (site pages and downloads)

specs/main/
├── plan.md
├── spec.md
├── dataverse-schema.md
├── scripts/
│   └── create-dataverse-schema.ps1
└── checklists/
    └── requirements.md

Generic.AndroidCellPhone/
├── AndroidCellPhone.html          # Samsung S25 Ultra phone simulator (v2.5.0)
├── AndroidCellPhone_v2.4.0.html   # Archived v2.4.0 (lock screen, camera, Demo Panel)
├── DOCUMENTATION.md               # Comprehensive technical documentation
├── plans/
│   ├── 2026-03-05-android-phone-simulator.md
│   └── 2026-03-05-android-phone-simulator-design.md
└── Requirmeents.md/               # (sic — legacy folder name)
    ├── s25-ultra-phone-simulator-spec.md
    ├── s25-ultra-phone-simulator-build.md
    └── android_phone_simulator_demo_profiles.md

SidecarItems/
├── Copilot.html
├── Veteran Journey.html
└── Genesys Softphone/
    ├── Genesys Softphone.html      # DO NOT MODIFY
    ├── android_phone_simulator.html
    └── sidebar_generic_call_simulator.html

.specify/
├── memory/constitution.md
└── scripts/powershell/*
```

**Structure Decision**: Use Dynamics 365 web resources for runtime (under `web resources/`) and GitHub Pages for public site (`pages/`, `downloads/`). Feature documentation lives under `specs/main/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
