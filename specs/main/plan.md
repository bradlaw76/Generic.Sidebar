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
**Testing**: Manual acceptance using `TEST_ACCEPTANCE.md`; automated tests NEEDS CLARIFICATION  
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
├── (spec.md — to be created)
└── (Phase 0/1 outputs: research.md, data-model.md, quickstart.md, contracts/)

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
