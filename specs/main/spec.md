# Generic.Sidebar — Baseline Specification

**Feature Branch**: `main`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: Configuration-driven sidebar UX demo for Dynamics 365; public site pages for docs and stats.

## User Scenarios & Testing (mandatory)

### User Story 1 — Admin Configures and Renders Sidebar (Priority: P1)

Admins create or update a `sidebar_genericsidebar` record to control title, instructions band, and embed content. Users opening the form see the sidebar rendered in the side pane with the active panel.

**Why this priority**: Core value — the sidebar must function from data-driven configuration without redeployment.

**Independent Test**: Update config record fields and refresh form; verify title, instructions, and embed render accordingly.

**Acceptance Scenarios**:
1. Given a default config row exists, When the form loads and the pane opens, Then the sidebar title matches `sidebar_title` and panel 1 renders its embed.
2. Given `sidebar_instructions` has content, When panel 1 is active, Then the instructions band is visible; When content is blank, Then the band is hidden.
3. Given `sidebar_embedcode` contains a URL, When panel 1 is active, Then the iframe loads the URL with required policies.

---

### User Story 2 — User Switches Panels and Toggles Zoom (Priority: P2)

Users switch among up to four configured panels via tabs. For phone or Genesys embeds, the user can toggle zoom to fit the content.

**Why this priority**: Improves usability and supports varied embed types; secondary to core rendering.

**Independent Test**: Configure two panels with different embeds; verify tab switching and zoom toggle behavior.

**Acceptance Scenarios**:
1. Given 2+ panels have embed content, When tabs are clicked, Then the active panel contents and instructions update accordingly.
2. Given a panel title includes "phone" or "genesys", When the zoom toggle is clicked, Then `force-zoom` applies and resets on second click.

---

### User Story 3 — Public Site Provides Docs, Stats, and Agent Help (Priority: P3)

Visitors can view the landing page with release statistics, a downloads page with per-asset counts and CSV export, and an agent page with usage guidance.

**Why this priority**: Supports adoption, visibility, and self-service help; not required for core sidebar runtime.

**Independent Test**: Visit site pages; verify chart loads, table updates, CSV export escapes correctly, and links work.

**Acceptance Scenarios**:
1. Given GitHub releases exist, When the landing page loads, Then the chart and data table render with totals.
2. Given the downloads page filter is used, When a filter substring is entered, Then only matching assets remain in chart and table.
3. Given the agent page loads, When the download badge fetches totals, Then the count updates or displays `n/a` gracefully on failure.

### Edge Cases

- Missing `configId` in pane navigation → Show placeholder "No configuration selected" instead of blank screen.
- API failure for Dataverse read → Render inline error message in panel container.
- GitHub API rate limit → Show status warning and still render page chrome without crash.
- Draft releases and zero-asset releases → Exclude drafts; display zero counts safely.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: The system MUST read the default configuration record from `sidebar_genericsidebar` (fallback to most recent if none default).
- **FR-002**: The sidebar MUST render up to 4 panels; each panel reads title, instructions, and embed content from corresponding fields.
- **FR-003**: The instructions band MUST be shown only when content exists; hidden otherwise.
- **FR-004**: The embed renderer MUST support three content sources: inline HTML, external URL, and platform-hosted resources. Platform-specific resolution details MUST remain abstracted from end users.
- **FR-005**: Embedded content MUST protect user privacy and security by limiting referrer sharing and isolating third-party content. External links MUST prevent external sites from affecting the host application.
- **FR-006**: The Copilot page MUST show fallback content if the iframe fails to load or times out.
- **FR-007**: CSV exports MUST escape commas, quotes, and newlines consistently across pages.
- **FR-008**: No redeployment MUST be required for configuration changes; refresh reflects updates.
- **FR-009**: The downloads page MUST paginate GitHub releases and compute per-asset and total counts.
- **FR-010**: The site MUST include a consistent navigation bar and skip-to-content links.
- **FR-011**: The chart canvas elements MUST include `aria-label` and `role="img"`; table headers MUST have `scope="col"`.
- **FR-012**: Error states MUST render visible messages (not blank screens) for Dataverse/GitHub failures.
- **FR-013**: README typos MUST be corrected and docs MUST link to the public site pages.
- **FR-014**: Public site styling MAY use external design libraries; sidebar runtime MUST avoid external dependencies to maintain reliability and predictable behavior.
- **FR-015**: The zoom toggle MUST appear only when embedded content benefits from zoom (e.g., externally hosted pages), not for inline HTML or platform-hosted resources.
- **FR-016**: The pane MUST set title from `sidebar_title` and bring to front when opened.

- **FR-017**: Performance targets — Pane open: p50 ≤ 2s, p95 ≤ 4s; Site interactions: p50 ≤ 1s, p95 ≤ 2s.
- **FR-018**: Automated testing scope [NEEDS CLARIFICATION: include unit/integration tests or rely on manual acceptance only?].
- **FR-019**: Admin-only banner visibility rules [NEEDS CLARIFICATION: which roles or security groups control visibility?].

### Key Entities

- **SidebarConfig**: Represents a `sidebar_genericsidebar` record; key attributes: `sidebar_title`, `sidebar_instructions`, `sidebar_embedcode`, variants for panels 2–4; theming fields; file type.
- **Panel**: Derived from `SidebarConfig` for each index (1–4); attributes: title, instructions, embed target (mode + value).
- **SitePage**: Landing, Downloads, Agent; behaviors: chart/table, filters, CSV export; accessibility attributes.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Users see the sidebar render in under 2 seconds on typical D365 environments (median).
- **SC-002**: Public site interactions (chart updates, table filter, CSV export) meet: p50 ≤ 1s and p95 ≤ 2s.
- **SC-003**: 100% of configuration changes reflect after a single form refresh (no redeploy).
- **SC-004**: Accessibility checks pass with WCAG 2.1 AA on all pages (skip links, aria labels, scoped headers).
- **SC-005**: Error states visible within 500 ms when Dataverse/GitHub calls fail.

## Assumptions

- Admin users manage Dataverse configuration records; end users have read access to pane content only.
- Public site is hosted via GitHub Pages with unauthenticated GitHub API calls; low-traffic assumption.
- Browser baseline is Microsoft Edge (Chromium) for D365; modern evergreen browsers for public site.

## Clarifications

### Session 2026-02-17
- Q: Define performance targets for pane open and site interactions → A: Pane p50 ≤ 2s, p95 ≤ 4s; Site p50 ≤ 1s, p95 ≤ 2s.

## Clarifications Needed

1. Automated testing scope — include unit/integration tests or rely on manual acceptance? [NEEDS CLARIFICATION]
2. Admin banner visibility — specify roles/groups that control visibility. [NEEDS CLARIFICATION]
