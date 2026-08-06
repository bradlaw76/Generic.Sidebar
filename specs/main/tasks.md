# Tasks: Generic.Sidebar — Sidebar UX Demo

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md (loaded), spec.md (loaded), dataverse-schema.md (loaded)

**Tests**: Not included — spec marks automated testing scope as NEEDS CLARIFICATION. Manual acceptance via `TEST_ACCEPTANCE.md`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US2a, US2b, US3, US4)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and confirm all source files exist

- [ ] T001 Verify project folder structure matches plan.md layout (web resources/, pages/, specs/main/, Generic.AndroidCellPhone/, SidecarItems/)
- [ ] T002 [P] Confirm Chart.js CDN link is present and functional in pages/index.html and downloads/index.html
- [ ] T003 [P] Confirm Tailwind CDN link is present and functional in all pages/ HTML files
- [ ] T004 [P] Verify Dataverse publisher prefix `gensoft_` is consistent across all schema references in specs/main/dataverse-schema.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Dataverse schema and base sidebar code structure that MUST be complete before user story work

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Run Dataverse schema script to add 4 new columns to `gensoft_genericsoftphone` table using specs/main/scripts/create-dataverse-schema.ps1
- [ ] T006 Run Dataverse schema script to create `gensoft_demo_profile` table with 7 columns using specs/main/scripts/create-dataverse-schema.ps1
- [ ] T007 Insert 3 sample demo profiles (FDA Safety Recall, Veteran Benefits, Insurance Inquiry) using specs/main/scripts/create-dataverse-schema.ps1
- [ ] T008 [P] Establish error handling pattern in web resources/sidebar_sidebar.js — inline error messages for Dataverse/API failures (FR-012), visible within 500ms (SC-005)
- [ ] T009 [P] Establish iframe security baseline in web resources/sidebar_sidebar.html — `referrerPolicy="no-referrer"`, explicit `allow` attributes, `rel="noopener noreferrer"` on external links (FR-005)

**Checkpoint**: Dataverse schema deployed, base patterns established — user story implementation can begin

---

## Phase 3: User Story 1 — Admin Configures and Renders Sidebar (Priority: P1) MVP

**Goal**: Admins configure a Dataverse record; users see the sidebar render with title, instructions band, and embed content — no redeployment needed.

**Independent Test**: Update config record fields in Dataverse and refresh the D365 form; verify title, instructions, and embed render per acceptance scenarios.

### Implementation for User Story 1

- [ ] T010 [US1] Implement default config record retrieval from `sidebar_genericsidebar` via Xrm.WebApi in web resources/sidebar_sidebar.js (FR-001) — fallback to most recent record if none marked default
- [ ] T011 [US1] Implement sidebar pane creation using `Xrm.App.sidePanes.createPane()` with title from `sidebar_title` in web resources/sidebar_sidebar.js (FR-016)
- [ ] T012 [US1] Implement panel 1 rendering — read `sidebar_instructions` and `sidebar_embedcode` fields and render instructions band + embed content in web resources/sidebar_sidebar.html (FR-002, FR-003)
- [ ] T013 [US1] Implement instructions band show/hide logic — visible only when content exists, hidden otherwise in web resources/sidebar_sidebar.js (FR-003)
- [ ] T014 [US1] Implement embed renderer supporting three content sources: inline HTML, external URL, and platform-hosted resources in web resources/sidebar_sidebar.js (FR-004)
- [ ] T015 [US1] Apply iframe security policies — `referrerPolicy`, explicit `allow`, sandbox attributes per embed type in web resources/sidebar_sidebar.js (FR-005)
- [ ] T016 [US1] Implement Copilot embed fallback — placeholder content when iframe fails or times out in web resources/sidebar_sidebar.html (FR-006)
- [ ] T017 [US1] Implement missing `configId` edge case — show "No configuration selected" placeholder when pane has no config in web resources/sidebar_sidebar.html
- [ ] T018 [US1] Verify zero-redeployment — confirm config changes reflect after form refresh without republishing web resource (FR-008)

**Checkpoint**: US1 complete — sidebar renders from Dataverse config. Core MVP functional.

---

## Phase 4: User Story 2 — Panel Switching and Zoom Toggle (Priority: P2)

**Goal**: Users switch among up to 4 panels via tabs; zoom toggle for phone/Genesys embeds; chat state preserved across tab switches.

**Independent Test**: Configure 2+ panels with different embeds; verify tab switching preserves iframe content and zoom toggle applies/resets correctly.

### Implementation for User Story 2

- [ ] T019 [US2] Implement tab navigation UI for up to 4 panels — read panel 2–4 fields from config record in web resources/sidebar_sidebar.html
- [ ] T020 [US2] Implement tab switching logic — hide/show iframes (not destroy/recreate) to preserve embedded content state in web resources/sidebar_sidebar.js (FR-017)
- [ ] T021 [US2] Implement instructions band update on tab switch — each panel shows its own instructions content in web resources/sidebar_sidebar.js
- [ ] T022 [US2] Implement zoom toggle button — appears only for embeds that benefit from zoom (URL embeds, not inline HTML or platform resources) in web resources/sidebar_sidebar.js (FR-015)
- [ ] T023 [US2] Implement `force-zoom` CSS class toggle — apply on first click, reset on second click in web resources/sidebar_sidebar.js
- [ ] T024 [US2] Implement auto-zoom for title keywords — trigger zoom when panel title includes "phone" or "genesys" regardless of embed type in web resources/sidebar_sidebar.js (FR-034)
- [ ] T025 [P] [US2] Implement visual framing for non-zoomed iframes — 4px margin, subtle border, border-radius in web resources/sidebar_sidebar.html (FR-030)
- [ ] T026 [P] [US2] Implement zoom CSS override — zoomed iframes (Genesys/phone) must NOT have visual framing in web resources/sidebar_sidebar.html (FR-031)
- [ ] T027 [US2] Implement `ensureFullHeightHtml()` for raw HTML embeds (no iframe) — proper scrolling behavior in web resources/sidebar_sidebar.js (FR-032)
- [ ] T028 [US2] Ensure iframe widget embeds (Copilot, Canvas Apps) do NOT get `ensureFullHeightHtml()` — widgets control their own layout in web resources/sidebar_sidebar.js (FR-033)

**Checkpoint**: US2 complete — multi-panel switching with zoom and state preservation works independently.

---

## Phase 5: User Story 2a — Sidebar Persists Across Record Navigation (Priority: P2)

**Goal**: Sidebar remains open with content intact when navigating between D365 records; chat context is not lost.

**Independent Test**: Open case with sidebar → start chat → navigate to another case → verify sidebar content preserved.

### Implementation for User Story 2a

- [ ] T029 [US2a] Implement configId tracking on `window` object to persist across form navigations in web resources/sidebar_sidebar.js (FR-019)
- [ ] T030 [US2a] Implement skip-navigate logic — when `openSidebar` is called and pane already shows same configId, bring to front without calling `navigate()` in web resources/sidebar_sidebar.js (FR-018)
- [ ] T031 [US2a] Implement tracking reset — when sidebar is closed and recreated, reset configId and reload content normally in web resources/sidebar_sidebar.js (FR-020)

**Checkpoint**: US2a complete — sidebar survives record navigation without content reload.

---

## Phase 6: User Story 2b — Pop-out Window for External Pane Switches (Priority: P2)

**Goal**: Users pop out embedded content to a separate window when D365 switches to OOB sidecars, preserving chat sessions.

**Independent Test**: Open sidebar → start chat → click pop-out → verify chat continues in pop-out → click Bring to Front → verify focus. Click Restore Here → verify iframe restores inline.

### Implementation for User Story 2b

- [ ] T032 [US2b] Implement pop-out button — display for URL and HTML-with-iframe panels only in web resources/sidebar_sidebar.js (FR-021)
- [ ] T033 [US2b] Implement URL extraction from HTML embed content — regex to find `<iframe src="...">` URL for pop-out in web resources/sidebar_sidebar.js (FR-026)
- [ ] T034 [US2b] Implement pop-out window creation — named window `SidebarPopout` to prevent duplicates in web resources/sidebar_sidebar.js (FR-022)
- [ ] T035 [US2b] Implement pop-out window positioning — right edge of screen for split-screen snapping in web resources/sidebar_sidebar.js (FR-023)
- [ ] T036 [US2b] Implement sidebar placeholder when content is popped out — show "Bring to Front" and "Restore Here" buttons in web resources/sidebar_sidebar.html (FR-024)
- [ ] T037 [US2b] Implement "Bring to Front" button logic — focus existing pop-out window; if closed, restore iframe automatically in web resources/sidebar_sidebar.js
- [ ] T038 [US2b] Implement "Restore Here" button logic — close pop-out and restore embedded iframe in sidebar in web resources/sidebar_sidebar.js
- [ ] T039 [US2b] Implement auto-detect pop-out closure — polling to detect when user closes pop-out externally, then auto-restore iframe in web resources/sidebar_sidebar.js (FR-025)

**Checkpoint**: US2b complete — pop-out window workflow handles all platform pane switch scenarios.

---

## Phase 7: User Story 3 — Public Site: Docs, Stats, and Agent Help (Priority: P3)

**Goal**: Public GitHub Pages site with release statistics, downloads with CSV export, and agent guidance page.

**Independent Test**: Visit each page; verify chart renders, table filters work, CSV export escapes correctly, and all links function.

### Implementation for User Story 3

- [ ] T040 [P] [US3] Implement landing page with Chart.js release statistics chart and data table in index.html (FR-009)
- [ ] T041 [P] [US3] Implement downloads page with per-asset counts, filter input, and paginated GitHub release fetching in downloads/index.html (FR-009)
- [ ] T042 [P] [US3] Implement agent page with usage guidance and download badge in pages/agent/index.html
- [ ] T043 [US3] Implement CSV export with proper escaping of commas, quotes, and newlines in downloads/index.html (FR-007)
- [ ] T044 [US3] Implement consistent navigation bar across all site pages with skip-to-content links in index.html, downloads/index.html, pages/agent/index.html (FR-010)
- [ ] T045 [US3] Add WCAG 2.1 AA accessibility — `aria-label` and `role="img"` on chart canvas elements, `scope="col"` on table headers across all pages (FR-011)
- [ ] T046 [US3] Implement GitHub API error handling — status warning on rate limit, page renders without crash in index.html and downloads/index.html (FR-012)
- [ ] T047 [US3] Implement draft release exclusion and zero-asset release handling in index.html and downloads/index.html
- [ ] T048 [US3] Implement download badge with graceful `n/a` fallback on failure in pages/agent/index.html
- [ ] T049 [P] [US3] Apply Tailwind CDN styling to all site pages — FR-014 allows external deps for public site only (FR-014)

**Checkpoint**: US3 complete — public site fully functional with charts, downloads, and agent guidance.

---

## Phase 8: User Story 4 — Android Cell Phone Simulator (Priority: P2)

**Goal**: Samsung S25 Ultra phone simulator operates in dual mode (D365/Standalone) for contact center demos with realistic call flows.

**Independent Test**: Open AndroidCellPhone.html standalone → use Settings → select profile → place/receive calls → test browser and camera.

### Implementation for User Story 4

- [ ] T050 [US4] Implement localStorage integration contract — write `genericSimCall` payload with state CONNECTED (outgoing) and RINGING (incoming) in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S01)
- [ ] T051 [US4] Implement dual-mode operation — detect `Xrm.WebApi` for D365 mode, use fallback JSON for standalone in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S02)
- [ ] T052 [US4] Implement Settings screen — accessible via Ctrl+Shift+D and gear icon on home screen in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S03)
- [ ] T053 [US4] Implement standalone profile editing — inline edit with localStorage persistence (`genericSimProfiles` key) in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S03a)
- [ ] T054 [US4] Implement D365 mode profile read-only — disable editing when Xrm.WebApi available, read from `gensoft_demo_profile` table in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S03b)
- [ ] T055 [US4] Implement browser screen — sandboxed iframe with DuckDuckGo search fallback in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S04)
- [ ] T056 [US4] Implement iframe blocked detection — show blocked indicator with "Open in New Tab" escape hatch in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S05)
- [ ] T057 [US4] Implement synthesized ringtone via Web Audio API — no orphaned audio resources when stopped in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S06)
- [ ] T058 [US4] Implement lock screen with swipe-to-unlock gesture and power button lock/unlock in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S08)
- [ ] T059 [US4] Implement camera screen — `getUserMedia` for live viewfinder, graceful fallback when denied in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S09)
- [ ] T060 [US4] Implement camera extras — shutter flash animation, front/rear camera flip toggle in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S10)
- [ ] T061 [US4] Implement camera stream cleanup — stop all media streams when navigating away from camera in Generic.AndroidCellPhone/AndroidCellPhone.html (FR-S11)
- [ ] T062 [US4] Implement config reading from `gensoft_genericsoftphone` — queue name, pop mode, case title, transcript, ringtones, wallpaper in Generic.AndroidCellPhone/AndroidCellPhone.html
- [ ] T063 [US4] Implement demo profile loading from `gensoft_demo_profile` — override config with scenario-specific values when profile selected in Generic.AndroidCellPhone/AndroidCellPhone.html
- [ ] T064 [US4] Implement outgoing ringtone URL support — read `gensoft_outgoingringtoneurl` field, override default ringtone for outgoing calls in Generic.AndroidCellPhone/AndroidCellPhone.html
- [ ] T065 [US4] Implement phone wallpaper URL support — read `gensoft_phonewallpaperurl` field, apply as home screen background in Generic.AndroidCellPhone/AndroidCellPhone.html
- [ ] T066 [US4] Implement transcript completed flag — set `gensoft_transcriptcompleted` to Yes via Xrm.WebApi when transcript playback finishes in Generic.AndroidCellPhone/AndroidCellPhone.html
- [ ] T067 [US4] Implement outbound organization name — read `gensoft_outboundorganizationname`, fall back to `gensoft_queuename` if blank in Generic.AndroidCellPhone/AndroidCellPhone.html

**Checkpoint**: US4 complete — phone simulator operates in both D365 and standalone modes with full call flows.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, accessibility, and performance improvements across all stories

- [ ] T068 [P] Correct README typos and add links to public site pages in README.md (FR-013)
- [ ] T069 [P] Update DOCUMENTATION.md with new Dataverse columns and demo profile table in Generic.AndroidCellPhone/DOCUMENTATION.md
- [ ] T070 Validate performance targets — pane open p50 ≤ 2s, p95 ≤ 4s; site interactions p50 ≤ 1s, p95 ≤ 2s (FR-027, SC-001, SC-002)
- [ ] T071 Run WCAG 2.1 AA accessibility audit on all sidebar pages and public site pages (SC-004)
- [ ] T072 Verify 100% of config changes reflect after single form refresh, no redeploy required (SC-003)
- [ ] T073 Validate error states visible within 500ms for Dataverse and GitHub API failures (SC-005)
- [ ] T074 Verify Genesys Softphone.html is NOT modified — all integration via localStorage contract only (FR-S07)
- [ ] T075 Run full manual acceptance using TEST_ACCEPTANCE.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3, P1)**: Depends on Foundational — **MVP target**
- **US2 (Phase 4, P2)**: Depends on US1 (builds on panel rendering)
- **US2a (Phase 5, P2)**: Depends on US1 (extends pane management)
- **US2b (Phase 6, P2)**: Depends on US2 (extends panel with pop-out)
- **US3 (Phase 7, P3)**: Depends on Foundational only — **can parallelize with US2 group**
- **US4 (Phase 8, P2)**: Depends on Foundational only — **can parallelize with US1–US2 group**
- **Polish (Phase 9)**: Depends on all desired stories complete

### User Story Dependencies

- **US1 (P1)**: Core sidebar — must complete first
- **US2 (P2)**: Panel switching — depends on US1 panel rendering
- **US2a (P2)**: Persistence — depends on US1 pane creation logic
- **US2b (P2)**: Pop-out — depends on US2 panel management
- **US3 (P3)**: Public site — independent of sidebar, can parallelize
- **US4 (P2)**: Phone simulator — independent of sidebar core, can parallelize

### Within Each User Story

- Models/data access before services
- Services before UI rendering
- Core implementation before edge cases
- Story complete and testable before moving to next priority

### Parallel Opportunities

- Setup tasks T002, T003, T004 can run in parallel
- Foundational tasks T008, T009 can run in parallel
- US3 tasks T040, T041, T042 can run in parallel (different pages)
- US3 and US4 can run in parallel with each other (independent of US1/US2)
- US2 tasks T025, T026 can run in parallel (different CSS concerns)

---

## Parallel Example: After Foundational Phase

```
Team member A (sidebar):  US1 → US2 → US2a → US2b
Team member B (site):     US3 (all tasks independently)
Team member C (phone):    US4 (all tasks independently)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (Dataverse schema + base patterns)
3. Complete Phase 3: User Story 1 — Admin Configures and Renders Sidebar
4. **STOP and VALIDATE**: Sidebar renders from config? Test independently.
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Sidebar renders from config → **MVP!**
3. US2 → Multi-panel switching + zoom → Deploy
4. US2a → Persistence across navigation → Deploy
5. US2b → Pop-out window → Deploy
6. US3 → Public site live → Deploy
7. US4 → Phone simulator integrated → Deploy
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 → US2 → US2a → US2b (sequential, sidebar core)
   - Developer B: US3 (public site, fully independent)
   - Developer C: US4 (phone simulator, fully independent)
3. Polish phase after all stories complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Genesys Softphone.html is NEVER modified (FR-S07) — all integration via localStorage
- No automated tests included — spec defers to manual acceptance (TEST_ACCEPTANCE.md)
- Sidebar runtime MUST NOT use external CSS/JS libraries (FR-014); public site MAY use Tailwind/Chart.js
- Two NEEDS CLARIFICATION items remain in spec — automated testing scope and admin banner visibility
