# Implementation Plan: Generic Sidebar Core and Optional Add-ins

**Branch**: `feature/sso-integration-v2` | **Date**: 2026-08-27 | **Spec**: `/specs/main/spec.md`
**Input**: Configuration-driven Dynamics 365 sidebar Core with separately deployed Android and Genesys demo add-ins

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Maintain an independently installable, configuration-driven Generic Sidebar Core that renders up to four panels inside a model-driven app side pane. Core reads `sidebar_genericsidebar` and supports generic Copilot, Canvas App, URL, and approved HTML embeds. Android Phone and Genesys Softphone remain optional demo add-ins with separate packaging, requirements, deployment, validation, and certification. GitHub Pages provide public documentation, release statistics, and agent guidance.

## Deployment Layers

| Layer | Required assets | Excluded from layer |
| --- | --- | --- |
| Generic Sidebar Core | `GenericSidebar_1_0_0_5.zip`, `sidebar_*` Dataverse and web-resource components | Android, Genesys, GenericSoftphone, and all `gensoft_*` components |
| Android Phone Simulator add-in | `Generic.AndroidCellPhone/AndroidCellPhone.html` 2.6.0; optional separate GenericSoftphone schema for Dynamics mode | Base Core solution package |
| Genesys Softphone Simulator add-in | `SidecarItems/Genesys Softphone/Genesys Softphone.html`; optional separate GenericSoftphone schema | Base Core solution package |

The base package boundary was verified read-only on 2026-08-27. No package rebuild, import, deployment, publication, or overwrite is part of this plan.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: HTML5, CSS3, JavaScript (ES6+); PowerShell scripts for agent context  
**Primary Dependencies**: Dynamics 365 `Xrm.WebApi`, `Xrm.App.sidePanes`; Chart.js (GitHub Pages); Tailwind CDN (GitHub Pages only)  
**Storage**: Core uses Dataverse table `sidebar_genericsidebar`; optional add-ins may separately use `gensoft_*` tables and `localStorage.genericSimCall`
**Testing**: Layer-specific manual acceptance in `TEST_ACCEPTANCE.md`; documentation integrity validation uses `git diff --check`, exact conflict-marker scans, local Markdown link checks, and JSON parsing for `SYSTEM_MANIFEST.json.md`
**Target Platform**: Dynamics 365 model-driven apps (side pane), GitHub Pages  
**Project Type**: web (Dynamics 365 web resources + static website)  
**Performance Goals**: NEEDS CLARIFICATION  
**Constraints**: Zero redeployment for config changes; Safe embedding (`referrerPolicy`, explicit `allow`); WCAG 2.1 AA; graceful degradation on API failures  
**Scale/Scope**: One independently deployable Core solution plus two optional demo add-ins

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Configuration-Driven: All behavior sourced from Dataverse record fields (pass/fail)
- Zero-Redeployment: Config changes require no web resource redeploy (pass/fail)
- Safe Embedding: Iframes use strict referrer policy, explicit `allow`; no raw `innerHTML` from external APIs (pass/fail)
- Graceful Degradation: Placeholders and error messages render on missing config or API failures (pass/fail)
- Accessibility: WCAG 2.1 AA; `aria-label` on charts, `scope="col"` on table headers; skip-to-content links; consistent navigation (pass/fail)

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
├── AndroidCellPhone.html          # Optional Samsung S25 Ultra simulator (2.6.0)
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
    ├── README.md                    # Optional add-in deployment and compatibility
    ├── Genesys Softphone.html      # Separately deployed simulator; version metadata unresolved
    ├── android_phone_simulator.html
    └── sidebar_generic_call_simulator.html

.specify/
├── memory/constitution.md
└── scripts/powershell/*
```

**Structure Decision**: Core runtime remains under `web resources/` and in the `sidebar`-prefixed solution. Optional add-ins remain in `Generic.AndroidCellPhone/` and `SidecarItems/Genesys Softphone/`; their `gensoft_*` schema and scripts are not Core assets. GitHub Pages public content remains under the root site entry point, `pages/`, and `downloads/` pending a separately authorized site-only `dist/` workflow.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
