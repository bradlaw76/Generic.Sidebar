# Generic.Sidebar — Specification

**Status:** DRAFT
**Version:** 0.1.0
**Created:** 2026-03-04

---

## Purpose

Define the functional and non-functional behavior of Generic.Sidebar as a configurable, table-driven side pane experience for Dynamics 365 model-driven apps.

## Scope

### In Scope

- Sidebar initialization and pane lifecycle behavior
- Dataverse-driven runtime configuration loading
- Multi-panel rendering and tab behavior
- Embed handling for URL and HTML sources
- Instruction-band visibility behavior
- Admin-only affordances where applicable

### Out of Scope

- Changes to external embedded systems (for example, Genesys)
- Dataverse schema evolution beyond fields consumed by the sidebar runtime
- Non-Dynamics host application integrations

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
