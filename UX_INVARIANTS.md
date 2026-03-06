# Generic.Sidebar — UX Invariants

**Status:** DRAFT
**Version:** 1.2.0

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
- **Switching between tabs must preserve iframe content state (chat messages, form inputs, scroll position) — iframes must be hidden/shown, not destroyed/recreated.**
- **Navigating between D365 records must not reload the sidebar if the same configuration is already loaded.**

### Android Cell Phone Simulator (AndroidCellPhone.html)

- The localStorage key `genericSimCall` must NEVER change — it is the integration contract between the phone simulator and the Genesys Softphone.
- Outgoing calls must write `state: CONNECTED` to localStorage; incoming calls must listen for `state: RINGING`.
- All Dataverse reads must use `Xrm.WebApi` — never bypass or hard-code URLs.
- Standalone mode must always work with embedded fallback data (FALLBACK_CONFIG, FALLBACK_CONTACTS, FALLBACK_PROFILES) when Xrm is unavailable.
- The Demo Control Panel must always be accessible via Ctrl+Shift+D.
- The browser screen must never navigate the parent page — all browsing must occur within the sandboxed iframe.
- Browser URL bar input must handle plain text (search via DuckDuckGo), `www.` prefixed domains, and full URLs gracefully.
- Sites that block iframe embedding must show a clear blocked message with an "Open in New Tab" escape hatch — never a blank screen.
- Genesys Softphone.html must NOT be modified — all changes must be additive to other files only.
- The synthesized ringtone must use Web Audio API (440+480 Hz) and must stop cleanly when the call is answered or declined (no orphaned oscillators/timeouts).
