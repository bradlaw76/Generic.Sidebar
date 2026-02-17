<!--
Sync Impact Report
- Version change: N/A → 1.0.0 (initial ratification)
- Modified principles: N/A (first version)
- Added sections: Core Principles (5), Technology Constraints, Development Workflow, Governance
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check section present)
  - .specify/templates/spec-template.md ✅ aligned (no constitution-specific gates)
  - .specify/templates/tasks-template.md ✅ aligned (no constitution-specific task types)
  - .github/prompts/*.md ✅ aligned (no outdated agent-specific references)
- Follow-up TODOs: None
-->

# Generic.Sidebar Constitution

## Core Principles

### I. Configuration-Driven

All sidebar behavior MUST be driven by Dataverse table rows
(`sidebar_genericsidebar`), not by hard-coded values in HTML or JS.

- Every visual element (title, instructions, embed content, theming)
  MUST originate from a configuration record field.
- Adding a new panel, embed, or instruction band MUST NOT require
  editing web resource source code.
- The JS entry point (`sidebar_sidebar.js`) MUST read its config
  at runtime via `Xrm.WebApi`; static defaults are permitted only
  as fallbacks when no record exists.

### II. Zero-Redeployment Changes

End-user-facing changes MUST be achievable by updating a Dataverse
row and refreshing the form — no solution re-import required.

- Embed sources (Copilot, Canvas App, URL, raw HTML) MUST be
  swappable via the `sidebar_embedcode` family of fields.
- Theming (primary color, text color, link color) MUST be
  applied from record fields at render time.
- The sidebar title MUST be read from `sidebar_title` (or
  fallback to "Sidebar") without redeploying the web resource.

### III. Safe Embedding

All embedded content MUST be rendered with defense-in-depth
protections against XSS, clickjacking, and data leakage.

- Iframes MUST set `referrerPolicy="strict-origin-when-cross-origin"`.
- User-supplied HTML inserted via `srcdoc` MUST be processed
  through `ensureFullHeightHtml()` — raw `innerHTML` from
  external API data is prohibited.
- The `allow` attribute on iframes MUST be explicitly declared;
  blanket `allow="*"` is prohibited.
- External links MUST include `rel="noopener noreferrer"`.
- CSV exports MUST escape commas, quotes, and newlines.

### IV. Graceful Degradation

The sidebar and GitHub Pages site MUST remain usable when
upstream services are unavailable or partially broken.

- If `configId` is missing, a "No configuration selected"
  placeholder MUST appear — never a blank screen or JS error.
- If `Xrm.WebApi.retrieveRecord` fails, an error message
  MUST render in the sidebar panel.
- GitHub API rate limits or network errors MUST produce a
  visible status message; the page MUST NOT crash.
- The Copilot iframe page MUST show fallback content if the
  bot endpoint is unreachable.

### V. Accessibility & Standards Compliance

All user-facing pages MUST meet WCAG 2.1 Level AA and follow
semantic HTML best practices.

- Every page MUST declare `<html lang="en">`.
- Interactive charts MUST have `aria-label` and `role="img"`.
- Data table headers MUST use `scope="col"`.
- Skip-to-content links MUST be present on all GitHub Pages.
- Consistent site-wide navigation MUST appear on every
  public-facing page.

## Technology Constraints

- **Runtime**: Dynamics 365 model-driven app side pane
  (`Xrm.App.sidePanes`) — no external frameworks allowed
  inside the web resource.
- **Styling**: Vanilla CSS inside D365 web resources; Tailwind
  CDN permitted on GitHub Pages only.
- **APIs**: `Xrm.WebApi` for Dataverse reads; GitHub REST API
  (unauthenticated) for public statistics pages.
- **Browser support**: Must work in Microsoft Edge (Chromium)
  as the primary D365 browser.
- **Solution packaging**: Managed and unmanaged Dynamics 365
  solution ZIPs; web resources named with `sidebar_` prefix.

## Development Workflow

- **Branching**: All feature work MUST happen on a named branch
  and be merged to `main` via pull request.
- **Commit messages**: Follow Conventional Commits format
  (e.g., `feat:`, `fix:`, `docs:`).
- **Code standards**: SpeckKit component header blocks MUST be
  applied to every new component file (auto-enforced via
  `.github/copilot-instructions.md`).
- **Version bumps**: Update `SYSTEM_MANIFEST.json.md` version
  and README release notes on every user-facing change.
- **UX invariants**: Changes MUST NOT violate any invariant
  listed in `UX_INVARIANTS.md`; violations require an
  amendment to the invariants file first.

## Governance

This constitution is the authoritative source for project-wide
rules. It supersedes ad-hoc decisions and informal conventions.

- **Amendments** require: (1) a documented rationale,
  (2) an update to this file with a version bump, and
  (3) propagation to dependent templates and artifacts.
- **Versioning** follows Semantic Versioning:
  - MAJOR: principle removal or incompatible redefinition.
  - MINOR: new principle or materially expanded guidance.
  - PATCH: wording clarifications or typo fixes.
- **Compliance review**: Every pull request SHOULD include a
  Constitution Check confirming no principle violations.
  The plan template's "Constitution Check" gate references
  the principles defined here.
- **Guidance**: See `UX_INVARIANTS.md` and `TEST_ACCEPTANCE.md`
  for runtime development guidance derived from these principles.

**Version**: 1.0.0 | **Ratified**: 2026-02-17 | **Last Amended**: 2026-02-17
