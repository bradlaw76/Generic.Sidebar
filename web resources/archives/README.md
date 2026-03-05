# Web Resources Archives

This folder contains archived versions of sidebar web resources for version history tracking.

## Naming Convention

Files are archived with the version number appended to the filename:
- `sidebar_sidebar_v{VERSION}.html` — HTML web resource archives
- `sidebar_sidebar_v{VERSION}.js` — JavaScript web resource archives

## Current Versions (in parent folder)

| File | Current Version |
|------|-----------------|
| `sidebar_sidebar.html` | v2.14.0 |
| `sidebar_sidebar.js` | v2.5.0 |

## Archive Process

Before making changes to a web resource:
1. Copy the current version into this `archives/` folder
2. Rename with version number suffix (e.g., `sidebar_sidebar_v2.6.0.html`)
3. Make changes to the main file and increment the version number
4. Update this README with the new current version

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.14.0 (HTML) | 2026-02-19 | Full-height iframe widgets (Copilot) - fills space but stays top-aligned |
| v2.13.0 (HTML) | 2026-02-19 | Generic embed handling: raw HTML gets full-height styling, iframe widgets (Copilot) render natively |
| v2.12.0 (HTML) | 2026-02-19 | Visual framing: subtle margin/border for non-zoomed iframes, preserves softphone zoom |
| v2.11.0 (HTML) | 2026-02-19 | Focus/Restore pop-out: Named window, split-screen position, "Bring to Front" and "Restore Here" buttons in sidebar placeholder |
| v2.10.0 (HTML) | 2026-02-19 | Named window for pop-out, split-screen positioning (right side of screen) |
| v2.9.0 (HTML) | 2026-02-19 | Extract iframe URLs from HTML content for pop-out (Copilot fix) |
| v2.8.0 (HTML) | 2026-02-19 | Discrete pop-out button for URL panels |
| v2.7.0 (HTML) | 2026-02-19 | Preserve state across OOB pane switches - check for existing iframes, sessionStorage for active panel |
| v2.6.0 (HTML) | 2026-02-19 | Preserve chat state on tab switch - iframes created upfront |
| v2.5.0 (JS) | 2026-02-19 | Persist configId tracking via window object across form navigations |
| v2.5.2 (HTML) | Prior | Title1 Integration + Stable Scrolling |
| v2.3.0 (JS) | Prior | Title from table, removed icon functionality |
