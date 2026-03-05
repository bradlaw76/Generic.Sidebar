# Generic.Sidebar — Test Acceptance Criteria

**Status:** DRAFT
**Version:** 1.1.0

---

## Acceptance Tests

### Sidebar Core (sidebar_sidebar.html + sidebar_sidebar.js)

- ✔ `Generic_OpenSidebar` registers on `window` within 5 seconds of page load
- ✔ Sidebar opens via `Xrm.App.sidePanes.createPane` with configurable width and title
- ✔ Sidebar reads the default config row (`sidebar_default = true`) from `sidebar_genericsidebar`
- ✔ Falls back to most recent row if no default row exists
- ✔ Pane title matches `sidebar_title` from the config record
- ✔ Panels 1–4 render when their `sidebar_embedcodeN` field is populated
- ✔ Tabs appear only when 2+ panels have content
- ✔ Switching tabs updates the instructions band and iframe content
- ✔ URL embeds load in an iframe with `src`; HTML embeds use `srcdoc`
- ✔ Zoom toggle appears for URL embeds only
- ✔ `force-zoom` class applied when panel title contains "phone" or "genesys"
- ✔ Placeholder shown when `configId` is missing
- ✔ Error div shown when `Xrm.WebApi.retrieveRecord` fails

### Chat State Preservation (v2.5.0+ JS, v2.6.0+ HTML)

- ✔ All panel iframes are created upfront when sidebar loads (not on-demand per tab)
- ✔ Tab switching hides/shows iframes via CSS `display` (does not destroy/recreate)
- ✔ Chat messages in panel 1 persist after switching to panel 2 and back
- ✔ `window.__sidebarLoadedConfigId` tracks the currently loaded config
- ✔ When same configId is already loaded, `openSidebar` skips `navigate()` call
- ✔ Navigating between D365 records does not reload sidebar if config unchanged
- ✔ Closing and reopening sidebar resets tracking and reloads content
- ✔ Console logs indicate "Reusing existing sidebar pane" vs "Created new sidebar pane"
- ✔ Console logs show "Sidebar already showing same config" when skip occurs

### GitHub Pages Site

- ✔ Landing page loads and renders release chart from GitHub API
- ✔ Downloads page fetches all releases with pagination (100/page)
- ✔ Asset name filter narrows chart and table data
- ✔ Release count selector limits displayed releases
- ✔ CSV export produces valid CSV with escaped special characters
- ✔ Navigation bar links work across all pages (Home, Downloads, Agent, Copilot)
- ✔ Agent page displays download badge with live count
- ✔ Copilot page shows fallback message if iframe fails to load

### Accessibility

- ✔ All pages have `<html lang="en">`
- ✔ Skip-to-content link present on all GitHub Pages
- ✔ Chart canvas elements have `aria-label` and `role="img"`
- ✔ Table headers use `scope="col"`
- ✔ External links include `rel="noopener noreferrer"`
