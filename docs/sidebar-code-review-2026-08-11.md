# Generic Sidebar Code Review Tracker

<!-- markdownlint-disable MD024 -->

**Review date:** 2026-08-11
**Review scope:** `web resources/sidebar_sidebar.html`, `web resources/sidebar_sidebar.js`, related specifications, security guidance, and acceptance criteria
**Current recommendation:** Do not distribute broadly until findings GS-001 through GS-005 are resolved and validated.
**Status:** Open

## How to Use This Tracker

Work through one finding at a time. For each finding:

1. Confirm the intended security or behavior contract.
2. Implement the smallest focused change.
3. Run the listed validation checks.
4. Record notes and evidence.
5. Mark the finding complete only after validation passes.

### Status Summary

| ID | Severity | Release Blocking | Status | Finding |
| --- | --- | ---: | --- | --- |
| GS-001 | Critical | Yes | Open | Dataverse HTML can execute code in the Dynamics origin |
| GS-002 | High | Yes | Closed | SSO failures now preserve a secure, retryable failure state |
| GS-003 | High | Yes | Open | Every embed receives camera and microphone capability |
| GS-004 | High | Yes | Open | Embed and pop-out URLs lack protocol and origin validation |
| GS-005 | High | Yes | Open | Pop-outs retain an opener relationship |
| GS-006 | Medium | No | Closed | Route state is recorded only after successful navigation |
| GS-007 | Medium | No | Open | Dataverse retrieval failures are hidden as missing configuration |
| GS-008 | Medium | No | Open | Retrieved configuration fields are ignored |
| GS-009 | Medium | No | Open | Error text is injected through HTML |
| GS-010 | Medium | No | Open | Tab and iframe accessibility semantics are incomplete |
| GS-011 | Low | No | Deferred - decision recorded | Preserve pop-out restoration behavior; no production change approved |
| GS-012 | Release risk | Yes | Open - foundation validated | Executable automated tests exist; hosted validation remains pending |

---

## GS-001: Isolate and Sanitize Dataverse HTML

- [ ] **Status: Open**
- **Severity:** Critical
- **Release blocking:** Yes
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** Configured HTML is assigned to `iframe.srcdoc` after layout CSS is added. The iframe has no `sandbox`. Instructions are assigned with `innerHTML`.
- **Relevant areas:** `ensureFullHeightHtml()`, `ensureFullHeightIframeWidget()`, iframe creation in `loadConfigAndRender()`, and instruction rendering in `setActivePanel()`.

### Risk

`ensureFullHeightHtml()` changes layout but does not remove scripts, event handlers, forms, dangerous URLs, or other active content. An unsandboxed `srcdoc` document can inherit the embedding origin. A user who can modify the Dataverse embed fields may therefore gain a code-execution path in the Dynamics browser context, potentially including access to `parent.Xrm` and Dataverse APIs under the current user's permissions.

### Recommended Resolution

- Define whether raw HTML is genuinely required or whether embeds can be limited to validated URLs and iframe snippets.
- Sanitize rich-text instructions with a structured allowlist.
- Sanitize raw HTML before assigning it to `srcdoc`.
- Add a restrictive `sandbox` to untrusted `srcdoc` content.
- Do not grant `allow-same-origin` together with `allow-scripts` unless the content is explicitly trusted and the risk is documented.
- Treat write access to embed configuration as privileged administrative access.

### Validation

- [ ] `<script>` content from Dataverse does not execute.
- [ ] Inline event handlers such as `onerror` and `onclick` do not execute.
- [ ] `javascript:` and unsafe `data:` navigation is rejected.
- [ ] Instructions retain approved formatting such as headings, lists, emphasis, and links.
- [ ] Approved Copilot, Canvas App, phone, Genesys, and same-origin web-resource embeds still render.
- [ ] Sandboxed content cannot access `parent.Xrm` unless explicitly approved by policy.

### Resolution Notes

_To be completed during remediation._

---

## GS-002: Make SSO-Enabled Configurations Fail Closed

- [x] **Status: Closed**
- **Severity:** High
- **Release blocking:** Yes
- **Affected file:** `web resources/sidebar_sidebar.js`
- **Evidence:** Failure to load SSO libraries or complete SSO navigation falls back to `sidebar_sidebar.html`.
- **Relevant areas:** SSO dependency-loading `catch` and `handlePaneNavigation(...).catch(...)` in `openSidebar()`.

### Risk

A configuration explicitly marked as SSO-enabled can silently downgrade to the standard non-SSO canvas. If the standard embed is reachable without the intended identity flow, this bypasses the administrator's authentication expectation.

### Recommended Resolution

- Fail closed for SSO-enabled configurations.
- Display a clear SSO error state with retry and support details.
- Permit legacy fallback only through a separate explicit administrator setting with a documented security warning.
- Do not navigate to the standard canvas merely because a dependency or token exchange failed.

### Validation

- [x] Simulated SSO bootstrap failure shows an error and does not load the standard canvas.
- [x] Simulated setup-library failure shows an error and does not load the standard canvas.
- [x] Simulated token/navigation failure shows an error and permits retry.
- [x] Non-SSO configurations continue loading the standard canvas.
- [x] No legacy-fallback policy was added; secure failure is unconditional for SSO-enabled configurations.

### Resolution Notes

**Phase 3A remediation evidence (2026-08-13):**

- **Root cause:** `sidebar_sidebar.js` caught SSO dependency and orchestration failures, navigated to `sidebar_sidebar.html`, and then treated that downgrade as a completed route. Separately, `sidebar_sso_bootstrap.js` returned the `void` result of `PublicClientApplication.initialize()` instead of the initialized client.
- **Production files changed:** `web resources/sidebar_sidebar.js`, `web resources/sidebar_sso_bootstrap.js`, `web resources/sidebar_sso_setup.js`, and `web resources/sidebar_sso_canvas_fallback.html`.
- **Before:** Dependency, validation, token, and navigation failures silently loaded the legacy canvas. The fallback page's Retry button only reloaded the error resource. MSAL token operations failed after a standards-compliant `initialize()` resolved `void`.
- **After:** Every SSO failure navigates only to `sidebar_sso_canvas_fallback.html`; legacy navigation is not attempted. Failed attempts clear loaded config and route state. Retry invokes the parent `Generic_OpenSidebar` launcher. MSAL initialization awaits completion and continues with the original client instance. SSO setup awaits asynchronous pane navigation before reporting success.
- **Tests:** `tests/unit/pane-and-sso-characterization.test.js` executes the real launcher, bootstrap, setup, and fallback sources. It covers bootstrap/setup load failure, configuration validation, silent and popup token paths, terminal token failure, asynchronous navigation rejection, explicit retry, successful retry, and success-only route state.
- **Validation:** Node `24.19.0`; focused SSO suite 13/13 passed; ESLint passed; complete suite 42/42 passed across 4 suites; coverage passed at 90.57% statements, 84.05% branches, 79.48% functions, and 91.05% lines; `npm run check` passed.
- **Residual limitations:** Hosted Dynamics and Entra behavior still require release-gate smoke testing. The fallback page retains a pre-existing external help-link `noopener` diagnostic tracked under the separate GS-005 boundary and was not changed in Phase 3A.

---

## GS-003: Use Least-Privilege Iframe Permissions

- [ ] **Status: Open**
- **Severity:** High
- **Release blocking:** Yes
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** Every generated iframe receives `clipboard-write; microphone; camera; autoplay; encrypted-media`.
- **Relevant area:** The unconditional `iframe.setAttribute("allow", ...)` call.

### Risk

Arbitrary configured sites receive sensitive browser capabilities whether they need them or not. This expands the impact of a compromised or incorrectly configured embed and ignores the existing `sidebar_iframeallow` configuration field.

### Recommended Resolution

- Default to no optional permissions.
- Define approved permission profiles by embed type.
- Parse and validate `sidebar_iframeallow` against a strict allowlist if administrators may configure it.
- Grant microphone or camera only to known origins and scenarios that require them.
- Document why each approved permission exists.

### Validation

- [ ] A generic HTTPS embed receives no camera or microphone capability.
- [ ] Approved phone/Genesys scenarios receive only required capabilities.
- [ ] Invalid or unknown permission tokens are rejected.
- [ ] Configuration cannot use wildcard permission origins.
- [ ] Existing required audio/video scenarios still work in hosted Dynamics.

### Resolution Notes

_To be completed during remediation._

---

## GS-004: Validate Embed and Pop-Out URLs

- [ ] **Status: Open**
- **Severity:** High
- **Release blocking:** Yes
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** `resolveEmbed()` accepts any non-empty non-HTML string as a URL. Extracted iframe URLs are used as pop-out targets without validation.
- **Relevant areas:** `resolveEmbed()`, iframe `src` assignment, `dataset.popoutUrl`, and `popOutPanel()`.

### Risk

Dangerous, malformed, or unexpected schemes and origins may be used for iframe or top-level pop-out navigation. Configuration mistakes can also leak credentials or direct users to deceptive content.

### Recommended Resolution

- Resolve URLs with the browser `URL` API.
- Permit same-origin Dynamics web resources and approved `https:` origins.
- Reject `javascript:`, `data:`, `file:`, `blob:` unless a narrowly documented case requires one.
- Reject URLs containing embedded credentials.
- Validate URLs extracted from iframe HTML using the same policy.
- Show an actionable configuration error when a URL is rejected.

### Validation

- [ ] Approved same-origin web resources load.
- [ ] Approved HTTPS external embeds load.
- [ ] `javascript:`, `data:`, `file:`, and unapproved origins are rejected.
- [ ] URLs containing usernames or passwords are rejected.
- [ ] Rejected URLs do not enable the pop-out button.
- [ ] Validation errors identify the panel without echoing unsafe markup.

### Resolution Notes

_To be completed during remediation._

---

## GS-005: Remove External Pop-Out Access to `window.opener`

- [ ] **Status: Open**
- **Severity:** High
- **Release blocking:** Yes
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** `window.open()` creates a named external window without `noopener`.
- **Relevant areas:** `popOutPanel()`, `focusPopoutWindow()`, and pop-out polling.

### Risk

A popped-out external application can retain an opener relationship and may attempt to navigate or manipulate its opener. The named-window focus workflow currently depends on retaining a window reference, so the remediation must account for both security and user experience.

### Recommended Resolution

- Use `noopener` for cross-origin pop-outs.
- Prefer same-origin wrapper pages for focus/restore coordination where necessary.
- If cross-window messaging is used, validate `event.origin` and message shape.
- Do not expose privileged host APIs to the popped-out page.
- Reassess whether external cross-origin windows need programmatic refocusing.

### Validation

- [ ] Cross-origin pop-outs observe `window.opener === null`.
- [ ] The external page cannot navigate or manipulate the sidebar window.
- [ ] Same-origin workflow, if retained, validates message origins.
- [ ] Pop-up blocking leaves the embedded panel visible.
- [ ] Restore behavior remains understandable when programmatic focus is unavailable.

### Resolution Notes

_To be completed during remediation._

---

## GS-006: Track the Route That Actually Loaded

- [x] **Status: Closed**
- **Severity:** Medium
- **Release blocking:** No, but should be fixed with GS-002
- **Affected file:** `web resources/sidebar_sidebar.js`
- **Evidence:** When SSO navigation fails and the standard canvas loads, `routeKey` remains `sso-canvas`, and that route is stored on `window`.

### Risk

Later calls may conclude that the correct SSO route is already loaded and skip navigation, leaving users on a fallback canvas without retrying SSO.

### Recommended Resolution

- Have navigation return the route that completed successfully.
- Update `window.__sidebarLoadedRoute` only after successful navigation.
- Clear route tracking on failure.
- If GS-002 removes automatic fallback, store no loaded route when SSO fails.

### Validation

- [x] Successful SSO navigation records `sso-canvas`.
- [x] Successful standard navigation records `legacy-canvas`.
- [x] Failed navigation records no loaded route.
- [x] Reopening after failure retries the intended route.
- [x] Same-route pane reuse still preserves chat state.

### Resolution Notes

**Phase 3A remediation evidence (2026-08-13):**

- **Root cause:** The launcher computed `routeKey` before SSO navigation and assigned it after a catch handler that converted failure into legacy navigation, so failed SSO attempts were stored as successful `sso-canvas` routes.
- **Production files changed:** `web resources/sidebar_sidebar.js` and `web resources/sidebar_sso_setup.js` control route commitment and navigation completion; the companion bootstrap and fallback changes are documented under GS-002.
- **Before:** A failed SSO attempt could leave `__sidebarLoadedConfigId` and `__sidebarLoadedRoute` populated, causing later opens to skip SSO initialization.
- **After:** Route/config state is committed only after awaited navigation succeeds. SSO failure clears both values, displays the secure failure page, and allows the next open or explicit Retry action to execute SSO again.
- **Tests:** The real-source pane/SSO suite verifies successful `legacy-canvas` and `sso-canvas` tracking, same-route pane reuse, null state after every failure category, asynchronous navigation rejection, and failure-then-success retry behavior.
- **Validation:** Focused SSO suite 13/13 passed and the complete Node 24 validation results recorded under GS-002 passed.
- **Residual limitations:** Persisted state and pane behavior still require confirmation in hosted Dynamics across real form navigation and browser sessions.

---

## GS-007: Surface Dataverse Retrieval Failures

- [ ] **Status: Open**
- **Severity:** Medium
- **Release blocking:** No
- **Affected file:** `web resources/sidebar_sidebar.js`
- **Evidence:** Configuration queries catch failures and return `null` or a default object, making API failure appear equivalent to no configuration.
- **Relevant areas:** `getDefaultConfigRow()` and `getConfig()`.

### Risk

Permissions, outages, schema errors, and genuine empty configuration produce similar behavior. This obscures operational failures and conflicts with the requirement for visible API error states.

### Recommended Resolution

- Distinguish `not found` from `request failed`.
- Preserve the original error category without exposing sensitive server details.
- Show a user-facing error with a correlation or support hint.
- Log diagnostic detail only where appropriate and without tokens or secrets.

### Validation

- [ ] No configuration produces a clear empty-state message.
- [ ] A 403 produces a permission-oriented error.
- [ ] A network/server failure produces an availability error.
- [ ] A missing optional schema field still uses the documented compatibility fallback.
- [ ] Sensitive response content is not displayed or logged.

### Resolution Notes

_To be completed during remediation._

---

## GS-008: Apply or Remove Advertised Configuration Fields

- [ ] **Status: Open**
- **Severity:** Medium
- **Release blocking:** No
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** The renderer retrieves iframe width, height, style, allow, primary color, text color, link color, and file type but does not apply them. `COPILOT_FILE_TYPE_VALUE` and the parsed `mode` parameter are unused.

### Risk

Administrators may believe settings are effective when they silently do nothing. This undermines the configuration-driven contract and creates inconsistent downstream deployments.

### Recommended Resolution

- Decide which fields remain supported.
- Apply supported fields through validated structured logic.
- Avoid injecting arbitrary CSS from `sidebar_iframestyle`; map supported settings to known properties instead.
- Remove unsupported fields from the query and documentation, or mark them deprecated.
- Remove unused constants and parameters when compatibility permits.

### Validation

- [ ] Every retrieved field has a documented runtime effect or a documented compatibility reason.
- [ ] Unsupported values produce a visible admin/configuration warning.
- [ ] Theme colors meet contrast requirements.
- [ ] Dimensions remain responsive and cannot break the pane layout.
- [ ] Arbitrary CSS cannot escape the intended component styling boundary.

### Resolution Notes

_To be completed during remediation._

---

## GS-009: Render Error Messages with `textContent`

- [ ] **Status: Open**
- **Severity:** Medium
- **Release blocking:** No
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** The exception message is interpolated into `host.innerHTML`.

### Risk

Browser, API, or server error messages are not guaranteed to be safe HTML. Rendering them as markup creates an avoidable injection path.

### Recommended Resolution

- Construct the error container with `document.createElement()`.
- Set its message using `textContent`.
- Use a generic user-facing message and optionally a separately generated correlation identifier.

### Validation

- [ ] An error message containing HTML displays as literal text.
- [ ] An error message containing an image `onerror` payload does not execute.
- [ ] The error remains visible and styled correctly.
- [ ] No sensitive error details are exposed to end users.

### Resolution Notes

_To be completed during remediation._

---

## GS-010: Complete Tab and Iframe Accessibility Semantics

- [ ] **Status: Open**
- **Severity:** Medium
- **Release blocking:** No, but required before claiming WCAG 2.1 AA readiness
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** Generated tabs do not implement the ARIA tab pattern, generated iframes have no accessible title, and only Alt+number shortcuts are implemented.

### Risk

Screen-reader and keyboard users may not understand which tab is selected, which panel it controls, or what an iframe contains. The current implementation is unlikely to satisfy a formal WCAG review.

### Recommended Resolution

- Add `role="tablist"`, `role="tab"`, and appropriate tab-panel semantics.
- Maintain `aria-selected`, `aria-controls`, `tabindex`, and panel visibility state.
- Add Left/Right, Home, and End key behavior consistent with the ARIA Authoring Practices tab pattern.
- Give each iframe a meaningful `title` derived from the configured panel title.
- Provide an accessible name for icon-only buttons independent of tooltip text.

### Validation

- [ ] Keyboard users can move among tabs with arrow keys.
- [ ] Only the active tab is in the expected tab stop according to the selected activation model.
- [ ] A screen reader announces tab count and selected state.
- [ ] Every iframe has a meaningful title.
- [ ] Pop-out and zoom buttons have stable accessible names.
- [ ] Automated accessibility scanning reports no critical tab/iframe issues.

### Resolution Notes

_To be completed during remediation._

---

## GS-011: Correct the Pop-Out Restore Message

- [ ] **Status: Deferred - decision recorded**
- **Severity:** Low
- **Release blocking:** No
- **Affected file:** `web resources/sidebar_sidebar.html`
- **Evidence:** The note says restoring reloads content and resets chat, while `restoreEmbeddedContent()` only redisplays the existing iframe.

### Risk

Users receive inaccurate guidance about whether their conversation state will be preserved.

### Recommended Resolution

- Preserve the existing iframe when content is restored so the embedded session can remain intact.
- Do not change the production implementation or restore message as part of the current remediation work.
- Treat any future production copy change as a separately approved change after hosted Copilot behavior is verified.

### Validation

- [x] Automated DOM validation confirms restore redisplays the same iframe instance rather than replacing or reloading it.
- [ ] Chat state behavior is verified with the supported Copilot embed.
- [ ] Closing the external window and clicking Restore Here produce consistent outcomes.

### Resolution Notes

**Decision recorded (2026-08-13):** The desired contract is to preserve the existing iframe and its embedded session when content is restored. The current `restoreEmbeddedContent()` implementation meets the locally testable portion of that contract by redisplaying the same iframe instance. No production code or user-facing message change is approved under GS-011 at this time. The existing DOM characterization test verifies iframe identity is preserved; hosted Copilot validation is still required to confirm conversation state and external-window-close behavior.

---

## GS-012: Add Executable Automated Tests

- [ ] **Status: Open**
- **Severity:** Release risk
- **Release blocking:** Yes for broad external distribution
- **Affected files:** isolated `tests/` package and `.github/workflows/sidebar-validation.yml`
- **Evidence:** The isolated Node 24 package executes checked-in sidebar, SSO bootstrap, SSO setup, and linked-agent sources with mocked platform boundaries. CI runs its aggregate validation for pull requests, `main`, and `release/**` pushes.

### Risk

Security and state regressions can be introduced without detection. Editor diagnostics establish syntax-level cleanliness but do not validate runtime behavior, trust boundaries, accessibility, or Dynamics integration.

### Recommended Resolution

Add focused automated coverage without attempting to reproduce all of Dynamics locally:

- Unit tests for URL policy, permission policy, HTML sanitization, and panel-state logic.
- DOM tests for tab semantics, safe error rendering, and instruction rendering.
- Mocked tests for `Xrm.WebApi` success, not-found, permission, schema fallback, and network failure.
- Tests for SSO fail-closed behavior and route tracking.
- Browser tests for pop-out blocking and safe restore behavior where feasible.
- Hosted Dynamics smoke tests retained as an explicit release gate.

### Validation

- [x] `npm test` runs locally and exits nonzero on failure.
- [x] A lint or static-analysis command is documented and executable.
- [ ] Security regression cases cover GS-001 through GS-005.
- [x] Accessibility tests cover GS-010.
- [ ] Hosted Dynamics smoke-test results are recorded for standard and SSO routes.
- [x] CI runs the automated checks for pull requests or release branches.

### Resolution Notes

**Test-foundation correction evidence (2026-08-13):**

- Node `24.19.0`: `npm ci` passed with 170 packages installed, zero vulnerabilities, and no engine warnings.
- `npm run lint`: passed with ESLint `10.8.0`.
- `npm test`: 4 suites and 41 tests passed with Vitest `4.1.10`.
- `npm run test:coverage`: passed with 89.84% statements, 83.82% branches, 78.37% functions, and 90.26% lines across the isolated harness and mocks.
- `npm run check`: passed; it executed the repository-defined lint and test scripts.
- Tests genuinely execute `sidebar_sidebar.html`, `sidebar_sidebar.js`, `sidebar_sso_bootstrap.js`, `sidebar_sso_setup.js`, and `vz_AgentSidePanelHTML.html` from their checked-in locations.
- jsdom console, script, unhandled rejection, and runtime errors fail tests unless a test explicitly allowlists the expected production failure it characterizes.
- The real sidebar `load` listener, exact Axe baseline, linked-agent filtering/session restoration, SSO dependency/configuration/token/navigation failures, fallback, retry, and route tracking are characterized.
- The redundant direct-URL smoke suite was removed because the rendering suite provides the same assertion together with configuration retrieval and lifecycle coverage.
- CI actions are pinned to immutable revisions and the validation job has a 10-minute timeout; workflow triggers, permissions, and isolated working directory are unchanged.

GS-012 remains open until remediation adds passing security regression expectations for the remaining open findings in GS-001 through GS-005 and hosted Dynamics smoke evidence is recorded for standard and SSO routes. Phase 3A corrected the bootstrap defect involving the `void` result of `PublicClientApplication.initialize()` and retained its real-source regression coverage.

---

## Distribution Completion Gate

The sidebar is ready for broader sharing only when all applicable items below are complete:

- [ ] GS-001 through GS-005 are resolved and validated.
- [x] GS-006 is resolved together with SSO navigation changes.
- [ ] Dataverse failures are distinguishable from empty configuration.
- [ ] Supported configuration fields and deprecations are documented.
- [ ] Error rendering no longer uses untrusted `innerHTML`.
- [ ] Accessibility behavior has been keyboard- and screen-reader-tested.
- [ ] Automated security and behavior tests pass.
- [ ] Standard sidebar behavior passes in hosted Dynamics.
- [ ] SSO behavior passes in hosted Dynamics.
- [ ] Dataverse security roles restrict configuration writes appropriately.
- [ ] Release documentation explains the supported embed-origin and permission policy.

## Review Notes

- Static VS Code diagnostics reported no errors in `sidebar_sidebar.html` or `sidebar_sidebar.js` at review time.
- This review did not execute hosted Dynamics, Entra ID, Copilot Studio, camera, microphone, or pop-out integration tests.
- Line numbers may shift as findings are fixed; finding IDs should remain stable for tracking.
