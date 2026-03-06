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

Users switch among up to four configured panels via tabs. For phone or Genesys embeds, the user can toggle zoom to fit the content. **Chat state and other iframe content is preserved when switching tabs.**

**Why this priority**: Improves usability and supports varied embed types; secondary to core rendering.

**Independent Test**: Configure two panels with different embeds; verify tab switching and zoom toggle behavior. Verify chat messages persist when switching away and back.

**Acceptance Scenarios**:
1. Given 2+ panels have embed content, When tabs are clicked, Then the active panel contents and instructions update accordingly.
2. Given a panel title includes "phone" or "genesys", When the zoom toggle is clicked, Then `force-zoom` applies and resets on second click.
3. Given a chat conversation is in progress in panel 1, When the user switches to panel 2 and back to panel 1, Then the chat messages are still visible.

---

### User Story 2a — Sidebar Persists Across Record Navigation (Priority: P2)

When navigating between records in D365 (e.g., moving from one case to another), the sidebar should remain open with its embedded content intact. The chat window and other iframe content should not reload unless the configuration changes.

**Why this priority**: Agents frequently navigate between records; losing chat context forces re-engagement with Copilot, wasting time.

**Independent Test**: Open a case with sidebar → Start a chat conversation → Navigate to another case → Verify sidebar content is preserved.

**Acceptance Scenarios**:
1. Given the sidebar is open with chat in progress, When the user navigates to a different case record, Then the sidebar remains visible without reloading.
2. Given the same configuration is used across entities, When `openSidebar` is called multiple times, Then the pane brings to front without calling `navigate()` again.
3. Given the user closes the sidebar and reopens it, When the pane is recreated, Then the content loads fresh (tracking is reset).

---

### User Story 2b — Pop-out Window for External Pane Switches (Priority: P2)

When the D365 platform switches to an OOB sidecar (e.g., Copilot Studio, Smart Assist), our custom sidebar pane is unloaded. Users can "pop out" the embedded content to a separate window to preserve their chat session across these platform pane switches.

**Why this priority**: Platform limitation cannot be bypassed; pop-out provides a workaround that preserves user context during OOB pane activations.

**Independent Test**: Open sidebar → Start chat → Click pop-out button → D365 opens OOB pane → Verify chat continues in pop-out window → Click "Bring to Front" in sidebar placeholder.

**Acceptance Scenarios**:
1. Given a URL or HTML-with-iframe panel is active, When the pop-out button is clicked, Then a new window opens at the right edge of the screen (split-screen ready).
2. Given content is popped out, When the sidebar placeholder is visible, Then "Bring to Front" and "Restore Here" buttons are displayed.
3. Given the user clicks "Bring to Front", When the pop-out window exists, Then it receives focus; if closed, the embedded iframe restores automatically.
4. Given the user clicks "Restore Here", When the pop-out window is open, Then it closes and the embedded iframe reappears in the sidebar.
5. Given the user closes the pop-out window externally, When the sidebar detects closure (polling), Then the embedded iframe restores automatically.

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
- **FR-017**: Tab switching MUST hide/show iframes (not destroy/recreate) to preserve embedded content state including chat conversations.
- **FR-018**: When `openSidebar` is called and the pane already displays the same `configId`, the system MUST skip `navigate()` to preserve iframe content.
- **FR-019**: The system MUST track the loaded `configId` on `window` object to persist across form navigations within the same browser session.
- **FR-020**: When the sidebar pane is closed and recreated, the tracking state MUST reset and content MUST reload normally.
- **FR-021**: URL and HTML-with-iframe panels MUST display a pop-out button allowing the user to open content in a separate window.
- **FR-022**: The pop-out window MUST use a named window (`SidebarPopout`) to prevent duplicate windows and enable focus management.
- **FR-023**: The pop-out window MUST be positioned at the right edge of the screen for easy split-screen snapping.
- **FR-024**: When content is popped out, the sidebar MUST display a placeholder with "Bring to Front" and "Restore Here" buttons.
- **FR-025**: The sidebar MUST auto-detect when the pop-out window is closed externally and restore the embedded iframe.
- **FR-026**: HTML content containing `<iframe src="...">` MUST have the URL extracted via regex for pop-out capability.
- **FR-030**: Non-zoomed iframes MUST display with subtle visual framing (margin, border, border-radius) for visual separation.
- **FR-031**: Zoomed iframes (Genesys/phone) MUST NOT have visual framing; zoom CSS MUST override framing styles.
- **FR-032**: Raw HTML embeds (no iframe) MUST have `ensureFullHeightHtml()` applied for proper scrolling.
- **FR-033**: Iframe widget embeds (Copilot, Canvas Apps) MUST NOT have `ensureFullHeightHtml()` applied; widgets control their own layout.
- **FR-034**: Auto-zoom MUST be triggered by title keywords ("phone", "genesys") regardless of embed type.

- **FR-027**: Performance targets — Pane open: p50 ≤ 2s, p95 ≤ 4s; Site interactions: p50 ≤ 1s, p95 ≤ 2s.
- **FR-028**: Automated testing scope [NEEDS CLARIFICATION: include unit/integration tests or rely on manual acceptance only?].
- **FR-029**: Admin-only banner visibility rules [NEEDS CLARIFICATION: which roles or security groups control visibility?].

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

### Session 2026-02-19 (Visual Framing & Generic Embeds)
- Q: Veteran Journey content butts against edges, Copilot not top-justified → A: Added visual framing (4px margin, border) for all non-zoomed iframes. Separated embed handling: raw HTML gets full-height styling, iframe widgets render natively. (FR-030 through FR-034)

### Session 2026-02-19 (Pop-out Feature)
- Q: OOB sidecars cause sidebar to unload, losing chat state → A: Implemented pop-out window with named window, split-screen positioning, "Bring to Front" / "Restore Here" buttons, and auto-restore on external close. (FR-021 through FR-026)

### Session 2026-02-19
- Q: Chat resets when switching tabs or navigating records → A: Implemented iframe preservation (hide/show vs destroy/recreate) and configId tracking to skip navigate when same config is already loaded. (FR-017 through FR-020)

### Session 2026-02-17
- Q: Define performance targets for pane open and site interactions → A: Pane p50 ≤ 2s, p95 ≤ 4s; Site p50 ≤ 1s, p95 ≤ 2s.

## Clarifications Needed

1. Automated testing scope — include unit/integration tests or rely on manual acceptance? [NEEDS CLARIFICATION]
2. Admin banner visibility — specify roles/groups that control visibility. [NEEDS CLARIFICATION]

---

## Sidecar Components

### User Story 4 — Android Cell Phone Simulator for Contact Center Demos (Priority: P2)

A pre-built Samsung S25 Ultra phone simulator (`AndroidCellPhone.html` v2.3.0) is embedded as a sidecar within the sidebar or run standalone. It enables realistic call scenarios for contact center demonstrations.

**Why this priority**: Enables end-to-end demo flow with the Genesys Softphone without a real phone device.

**Independent Test**: Open AndroidCellPhone.html locally → Use Demo Panel (Ctrl+Shift+D) → Select profile → Place and receive calls → Test browser.

**Acceptance Scenarios**:
1. Given standalone mode, When the simulator loads without Xrm, Then fallback config, contacts, and profiles are used.
2. Given D365 mode, When Xrm.WebApi is available, Then config/contacts/profiles load from Dataverse tables.
3. Given a demo profile is selected, When applied, Then queue name, caller info, transcript text, and wallpaper update.
4. Given Chrome icon is tapped, When a URL is pre-configured in Demo Panel, Then the browser auto-loads that URL.
5. Given a URL is typed in the browser bar, When the site blocks iframe embedding, Then a blocked message appears with "Open in New Tab" button.

#### Functional Requirements (Sidecar)
- **FR-S01**: The phone simulator MUST communicate via `localStorage.genericSimCall` with `state: CONNECTED` (outgoing) and `state: RINGING` (incoming).
- **FR-S02**: The simulator MUST operate in dual mode — D365 (Xrm.WebApi) and Standalone (fallback JSON).
- **FR-S03**: Demo Control Panel MUST be accessible via Ctrl+Shift+D.
- **FR-S04**: Browser screen MUST use sandboxed iframe with DuckDuckGo as the search engine fallback.
- **FR-S05**: Sites that refuse iframe embedding MUST show a blocked indicator with an "Open in New Tab" escape hatch.
- **FR-S06**: The synthesized ringtone MUST use Web Audio API and MUST not leave orphaned audio resources when stopped.
- **FR-S07**: Genesys Softphone.html MUST NOT be modified — all integration is via localStorage contract.

### Dataverse Schema — GenericSoftphone Solution (v1.0.0.11)

- **Table 1**: `gensoft_genericsoftphone` — 13 columns (ringtone, transcript, pop mode, wallpaper, etc.)
- **Table 2**: `gensoft_demo_profile` — 7 columns (queue, caller name, caller phone, scenario, config lookup)
- **Deployment**: `specs/main/scripts/create-dataverse-schema.ps1` — 3-phase script (ReviewOnly → Apply → SampleData)
- **Schema spec**: `specs/main/dataverse-schema.md`
