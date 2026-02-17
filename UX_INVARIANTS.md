# Generic.Sidebar — UX Invariants

**Status:** DRAFT
**Version:** 1.0.0

---

## Invariants

These UX behaviors must NEVER break across releases:

- The sidebar must open via `Xrm.App.sidePanes` and render inside the D365 side pane chrome.
- The sidebar must read its configuration from the `sidebar_genericsidebar` Dataverse table at runtime — no hard-coded embed content.
- If no configuration row exists (or `configId` is missing), a "No configuration selected" placeholder must appear instead of an error.
- The instructions band must be hidden when the active panel has no instructions content.
- Tab navigation must appear only when more than one panel has embed content configured.
- Embedded iframes must always include `referrerPolicy="strict-origin-when-cross-origin"`.
- The zoom toggle button must only appear for URL-mode embeds (not for HTML/srcdoc embeds).
- The admin acknowledgement banner must only be visible to users with admin privileges.
- The GitHub Pages site must have a consistent navigation bar across all pages (Home, Downloads, Agent, Copilot).
- The release statistics chart and table must degrade gracefully when the GitHub API is rate-limited or unreachable.
- CSV export must properly escape values containing commas, quotes, or newlines.
