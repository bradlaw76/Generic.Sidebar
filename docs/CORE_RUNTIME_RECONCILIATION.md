# Generic Sidebar Core Runtime Reconciliation

**Status:** H004 local integration candidate; H009 acceptance pending
**Target solution:** `GenericSidebar_1_0_0_12.zip` (unpublished)
**Canonical HTML runtime:** 2.16.0
**Canonical JavaScript runtime:** 2.7.0

## H004 selective reconciliation

Base: `main=fbea924`. Core source/schema/build gates were reused from #18
`28daba3`; the completed H008 tests/workflow from `5715d18` and H003 historical
manifest from `ffaf510` are carried without recreation. Committed SSO source
`7e09de7` plus H007's narrow `f330ded` fix supplies optional resources and
characterization tests; no SSO/designer/simulator history is merged wholesale.

The original workspace's pre-existing SSO hardening (bootstrap, setup, canvas,
validator, test loader and SSO tests) was copied from a hash-verified persistent
backup. Originals remain uncommitted and untouched. This snapshot preserves
identity-keyed MSAL clients, same-resource scopes, restricted endpoint exchange,
redirect rejection, text-only errors and expiring single-use token handoffs.

| Conflict path | Resolution |
| --- | --- |
| `.gitignore` | Union dependency, coverage and local/generated archive exclusions; do not hide versioned release artifacts. |
| `README.md` | Preserve current main release context; distinguish local v12, historical v7 and published v11; document optional dependencies and no live certification. |
| `SYSTEM_MANIFEST.json.md` | PRE_RELEASE v12 candidate, separate published v11 identity, no claimed released artifact or live acceptance. |
| `package.json` | Keep Core test/validator tooling; retain Power Apps SDK as optional development integration; add the existing SSO suite entry point. |
| `package-lock.json` | Regenerated from that manifest; verify a clean locked dependency install. |
| `web resources/sidebar_sidebar.html` | Core build/render/sizing/persistence with optional agent-tab insertion and SSO keyboard shortcuts; legacy title fallback and hidden tabs for any single panel are authoritative. Errors remain text, not executable markup. |
| `web resources/sidebar_sidebar.js` | Core pane API/lifecycle plus SSO config/route tracking and ordered loading; only an explicitly missing optional column permits legacy retry, never a generic read/permission failure. |

Linked-agent queries run only when Agent Menu Tab is selected. Successful empty
queries retain configured embeds; dependency failures display an error.
The picker reuses the shared SSO orchestrator instead of hardcoded credentials
or URL bearer tokens. Its standalone bundled list is an inert preview only.
Optional SSO/agent resources and schema are inventoried separately in
`config/enterprise-resources.json` and delivered by the exact-byte-verified
`GenericSidebarEnterpriseResources_1_0_0.zip` (canonical UTF-8/LF text and
per-entry SHA-256, independent of checkout line endings). This optional delivery archive is
not a Dataverse solution and must not be imported as one. Its schema scripts
are not executed locally. H005/H006/H007 local checks do not replace H009 hosted
acceptance or certify an optional solution import.

H003's `docs/H003_PUBLISHED_ZIP_EVIDENCE.json` now records the read-only downloaded
v11 bytes (SHA-256 matches GitHub), all six mapped resources, 57 parent and 30
agent fields, and source comparisons to tag/SSO/Core commits. The v11 asset
omits all six optional enterprise resources. Several resource/source comparisons
differ, so complete published-source parity remains explicitly uncertified.

The hourly monitor's H000 receipts 6952569557/6950855908 were acknowledged.
Existing #18 theme/color and metadata/doc review findings are addressed in this
candidate; original PR review threads are not blanket-resolved.

## Purpose

Generic Sidebar solution 1.0.0.5 does not package the active Core source runtime. The package contains a single-panel HTML renderer with no embedded version marker and JavaScript marked 2.3.0, while the repository contains a multi-panel HTML renderer marked 2.14.0 and JavaScript marked 2.5.0. This reconciliation selects one canonical Core behavior, adds automated acceptance coverage, and establishes a reproducible PAC CLI packaging process.

The canonical Core contract supports one through four configured panels. This limit comes from `SPEC.md`, `specs/main/spec.md` requirement FR-002, and `TEST_ACCEPTANCE.md`; it is implemented by the runtime, Dataverse schema, and main configuration form.

The generated ZIP is authoritative for installed behavior. The build must use version-controlled unpacked solution source and `pac solution pack`; editing a ZIP directly is not supported.

## Capability Matrix

| Capability | Current source behavior | Package 1.0.0.5 behavior | Selected canonical behavior | Implementation location | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| Single-panel backward compatibility | Reads panel 1 from indexed fields with a `sidebar_title` fallback; hides tabs when only one panel has content. | Reads legacy `sidebar_title`, `sidebar_instructions`, and `sidebar_embedcode`; has no tabs. | A legacy panel 1 record renders unchanged and the tab row remains hidden. | `sidebar_sidebar.html`: `buildPanels`, `renderRuntime` | `CORE-001 single panel renders without tabs` |
| Four-panel capacity | Reads all four indexed title/instruction/embed field groups and creates every configured frame. Configurations may leave any trailing panel empty. | Supports only `sidebar_embedcode`. | Render all four supported panels in field order while continuing to support configurations with fewer panels. | `sidebar_sidebar.html`: `buildPanels`, `renderRuntime` | `CORE-002 four configured panels render in order` |
| Tab switching | Buttons call `setActivePanel`; inactive frames are hidden. | Not supported. | Selecting a tab updates the active tab, instructions, controls, and visible frame without navigation. | `sidebar_sidebar.html`: `setActivePanel` | `CORE-003 tab switching changes visible panel` |
| Iframe retention | Creates all panel iframes up front and changes `display`. | Creates one iframe for the single embed. | Create each configured iframe once; tab changes only visibility so embedded state is retained. | `sidebar_sidebar.html`: `createPanelFrame`, `setActivePanel` | `CORE-004 tab switching retains iframe instances` |
| Active-panel persistence | Stores the selected panel index in per-config `sessionStorage`. | Not supported. | Restore a valid saved panel for the same configuration and fall back to panel 1 for missing or stale values. | `sidebar_sidebar.html`: `saveActivePanel`, `getInitialPanel` | `CORE-005 active panel persists per configuration` |
| Zoom | URL panels expose Fit/Reset; phone and Genesys titles start zoomed. | Not supported. | URL panels support Fit/Reset and configured phone/Genesys panels auto-zoom; inline HTML panels do not expose zoom. | `sidebar_sidebar.html`: `toggleZoom`, `syncPanelControls` | `CORE-006 zoom toggles URL panels only` |
| Pop-out | URL panels and HTML embeds containing an iframe URL can open a named window. | Not supported. | Pop out eligible content to the named `SidebarPopout` window and replace only the active embedded frame with a placeholder. | `sidebar_sidebar.html`: `popOutPanel`, `showPopoutPlaceholder` | `CORE-007 eligible panels pop out without affecting siblings` |
| Focus/restore | Placeholder can focus the external window or restore the embedded frame; external close is detected. | Not supported. | Bring an open pop-out to front, restore its retained iframe, and automatically restore when the window closes. | `sidebar_sidebar.html`: `focusPopoutWindow`, `restoreEmbeddedContent`, `checkPopoutWindow` | `CORE-008 focus and restore preserve the embedded frame` |
| Repeat-navigation suppression | Tracks `configId` on `window` and skips `pane.navigate` when an existing pane already has the same configuration. | Always navigates when opened. | Reuse the pane and suppress navigation only for the same non-empty configuration; navigate when the configuration changes or a pane is newly created. | `sidebar_sidebar.js`: `shouldNavigate`, `openSidebar` | `CORE-009 repeated open suppresses same-config navigation` |
| Iframe width/height | Retrieves width and height but fixed `!important` CSS prevents configured values from taking effect. | Applies numeric width and height in pixels, defaulting to 100%. | Apply positive configured pixel dimensions after defaults; use responsive full size when absent or invalid. | `sidebar_sidebar.html`: `applyIframeOptions` | `CORE-010 iframe dimensions honor valid configuration` |
| Iframe style and permissions | Uses a fixed permission set and ignores `sidebar_iframestyle` and `sidebar_iframeallow`. | Applies configured style and permissions, with a default permission fallback. | Apply configured style and `allow`; preserve secure defaults when either value is empty. Reserved runtime visibility and identity attributes remain runtime-owned. | `sidebar_sidebar.html`: `applyIframeOptions` | `CORE-011 iframe style and permissions merge with defaults` |
| Color injection | Retrieves colors but does not apply them. | Applies instruction colors and injects CSS variables into inline HTML. | Normalize configured colors, theme the instruction band, and inject `--sidebar-primary`, `--sidebar-text`, and `--sidebar-link` into inline content. | `sidebar_sidebar.html`: `normalizeColors`, `applyDocumentColors` | `CORE-012 configured colors reach host and inline content` |
| Copilot URL theming | Treats Copilot iframe HTML as a generic iframe widget. | Detects Copilot file type and appends encoded Direct Line style options to supported Copilot URLs. | For Copilot file type only, theme supported Power Virtual Agents/Copilot Studio iframe URLs while preserving unrelated query parameters and non-Copilot URLs. | `sidebar_sidebar.html`: `applyCopilotTheme`, `prepareHtmlEmbed` | `CORE-013 Copilot URL receives encoded theme` |
| Invalid/missing configuration | Shows placeholders for missing config and no panels; displays retrieval errors. | Shows placeholders for missing config or empty embed; displays retrieval errors. | Show deterministic, non-throwing placeholders for missing ID, empty records, and invalid saved panel; render a safe error message for retrieval failure. | `sidebar_sidebar.html`: `renderPlaceholder`, `renderError`, `renderRuntime` | `CORE-014 invalid and missing configuration fail safely` |

## Packaging Contract

1. `solution/GenericSidebar` is produced once from solution 1.0.0.5 using `pac solution unpack` and then maintained as the version-controlled solution source.
2. `scripts/build-core-solution.ps1` copies the canonical HTML and JavaScript into their mapped unpacked web-resource files, validates the Core-only inventory, sets candidate version 1.0.0.12, and invokes local `pac solution pack`.
3. The build writes `GenericSidebar_1_0_0_12.zip`; historical archives are not this candidate or current release certification.
4. The verification script extracts the generated package to a temporary directory, derives every web-resource mapping from unpacked metadata, proves text content is identical after line-ending normalization, retains exact-byte checks for binary resources, rejects inventory mismatches, and reports SHA-256 hashes.
5. The unpacked entity includes every indexed column selected by the runtime; static validation fails before packing if any selected panel column is absent.
6. The main configuration form exposes all indexed panel columns; static validation fails if any indexed control is absent.
7. `CORE-015` extracts the committed ZIP and fails when any runtime-selected or filtered `sidebar_genericsidebar` field is absent from `customizations.xml`.

## Exclusions

The Core solution must not contain Android, Genesys, ACS, SSO, GenericSoftphone, `gensoft_*`, or any optional simulator/add-in component. Those products retain separate deployment and certification lifecycles.

## H008 Multi-panel Regression Verification

The local runtime suite in `tests/core/runtime.test.js` covers all 15 non-empty
combinations of the four supported panel slots, including sparse configurations.
It verifies tab visibility, field ordering, instructions, active-panel storage,
and retained iframe identity while switching through every configured panel.
The legacy two-panel regression additionally exercises primary-title fallback,
URL and Copilot iframe-snippet embeds, configured dimensions, instruction hiding,
and per-panel zoom state. A separate case verifies saved-selection isolation
between configurations and recovery after reducing four panels to two.

Run `npm test -- tests/core/runtime.test.js` from the repository root.
The `Core Runtime and Package Validation` workflow runs the runtime/schema
validator, complete Core test suite, and committed-package verifier on both
Windows and Ubuntu for pull requests, main/release pushes, and manual dispatch.
It uses the locked root dependencies and does not pack, import, deploy, or publish.
These are local jsdom regressions against the runtime/package reconciliation
baseline (PR #18), not hosted Dynamics, live Copilot, or Entra SSO acceptance.
The H008 test-only increment does not change or rebuild the solution package,
integrate the separate SSO branch, or authorize merging PR #18.
