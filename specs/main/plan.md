# Implementation Plan: Generic.Sidebar — Sidebar UX Demo

**Branch**: `main` | **Date**: 2026-02-17 | **Spec**: /specs/main/spec.md (to be created)
**Input**: UX demo requirements for Dynamics 365 sidebar kit; configuration-driven behavior via Dataverse

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
**Primary Dependencies**: Dynamics 365 `Xrm.WebApi`, `Xrm.App.sidePanes`; Chart.js (GitHub Pages); Tailwind CDN (GitHub Pages only)  
**Storage**: Dataverse (table: `sidebar_genericsidebar`)  
**Testing**: Core/package Vitest and SSO/agent characterization suites plus lint/static schema gates; H009 owner-approved backup/export verification is complete, but hosted acceptance remains blocked on separate exact authorization and dependency/schema closure. No restore tested. See [H009 evidence](../../docs/H009_ACCEPTANCE.md) and [acceptance criteria](../../TEST_ACCEPTANCE.md).  
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

## H009 deployment-readiness gate - 2026-11-17

**BLOCKED; no live acceptance passed.** The selected Sandbox backup/export
stage is complete, all 32 private evidence hashes reverify, and the existing
backup expires November 24, 2026 at 18:36:22 as printed (timezone unspecified).
No tenant deployment or further mutation is authorized.

[H009 assessment](../../docs/H009_ACCEPTANCE.md) is the authoritative proposed
A-H sequence: prerequisite/backup/layer closure; schema/package preparation;
reviewed Core import; separate optional solution; exact app/form configuration;
separately approved SSO; functional validation; approved rollback decision points.
Each step records components, dependencies, permissions, changes, validation,
recovery limits and authorization. None of the deployment steps was executed.

Resolve HTML/JS GUID conflicts, the explicit Case CardFeed removal, app
membership/settings differences and activated default-record flow scope before
an import proposal. Core owns twelve new parent fields and its formulas; do not
run optional schema scripts to precreate them. All six exported relationship
definitions and Sidebar form/view identities match, but effective layering and
CSR source-role importer resolution remain uncertified. App role templates and
actual Administrator/Customizer associations were confirmed.

Safe Embedding is **not certified**: unsandboxed raw-HTML `srcdoc` paths in Core
and linked-agent UI require coordinated mitigation and C06 browser/hosted origin
isolation proof, separately from legacy compatibility. Existing local/CI passes
do not close this gate. Enterprise resources/schema, real SSO and agent bindings
also remain missing/unverified; the optional delivery ZIP is not a solution.

Next request is bounded local-only remediation/packaging decisions and owner
confirmation of durable private backup storage, not permission to deploy the
unchanged ZIP. Keep draft #26/H000 synchronized and H010 gated. Do not alter the
unrelated simulator schema/tasks under this Spec Kit tree.

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
