# Generic Sidebar Core Runtime Reconciliation

**Status:** Implementation baseline
**Target solution:** `GenericSidebar_1_0_0_6.zip`
**Canonical HTML runtime:** 2.15.1
**Canonical JavaScript runtime:** 2.6.0

## Purpose

Generic Sidebar solution 1.0.0.5 does not package the active Core source runtime. The package contains a single-panel HTML renderer with no embedded version marker and JavaScript marked 2.3.0, while the repository contains a multi-panel HTML renderer marked 2.14.0 and JavaScript marked 2.5.0. This reconciliation selects one canonical Core behavior, adds automated acceptance coverage, and establishes a reproducible PAC CLI packaging process.

The generated ZIP is authoritative for installed behavior. The build must use version-controlled unpacked solution source and `pac solution pack`; editing a ZIP directly is not supported.

## Capability Matrix

| Capability | Current source behavior | Package 1.0.0.5 behavior | Selected canonical behavior | Implementation location | Acceptance test |
| --- | --- | --- | --- | --- | --- |
| Single-panel backward compatibility | Reads panel 1 from indexed fields with a `sidebar_title` fallback; hides tabs when only one panel has content. | Reads legacy `sidebar_title`, `sidebar_instructions`, and `sidebar_embedcode`; has no tabs. | A legacy panel 1 record renders unchanged and the tab row remains hidden. | `sidebar_sidebar.html`: `buildPanels`, `renderRuntime` | `CORE-001 single panel renders without tabs` |
| Three-panel configuration | Reads the first three indexed title/instruction/embed field groups and creates all configured frames. | Supports only `sidebar_embedcode`. | Render exactly the three configured panels in field order without requiring panel 4. | `sidebar_sidebar.html`: `buildPanels`, `renderRuntime` | `CORE-002 three configured panels render in order` |
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
2. `scripts/build-core-solution.ps1` copies the canonical HTML and JavaScript into their mapped unpacked web-resource files, validates the Core-only inventory, validates solution version 1.0.0.6, and invokes `pac solution pack`.
3. The build writes `GenericSidebar_1_0_0_6.zip` without changing `GenericSidebar_1_0_0_5.zip`.
4. The verification script extracts the generated package to a temporary directory, proves packaged HTML/JavaScript content matches source after line-ending normalization, validates inventory exclusions, and reports SHA-256 hashes.
5. The unpacked entity includes every indexed column selected by the runtime; static validation fails before packing if any selected panel column is absent.

## Exclusions

The Core solution must not contain Android, Genesys, ACS, SSO, GenericSoftphone, `gensoft_*`, or any optional simulator/add-in component. Those products retain separate deployment and certification lifecycles.
