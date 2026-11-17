# Generic.Sidebar — Test Acceptance Criteria

**Status:** DRAFT
**Version:** 1.5.0

## H009 approved backup/export stage - 2026-11-17

Owner confirmed the exact Sidebar Sandbox and authorized only pre-change backup,
read-only local exports and verification. One backup is independently listed;
both unmanaged Sidebar solution ZIPs and a separately captured affected Case
form definition are verified and hashed. Details and limits are in
[H009 evidence](docs/H009_ACCEPTANCE.md). No import, deploy, publish, restore,
role/Entra change or live acceptance occurred. Backup/export verification does
not satisfy hosted integration or restore-drill acceptance.

## H009 acceptance preparation - 2026-11-17

[H009 acceptance evidence and execution gates](docs/H009_ACCEPTANCE.md) records
the repeated 44 Core/package and 67 SSO/agent local checks, read-only sandbox
discovery, dependency/schema gaps, conditional import order, backup/rollback
constraints, and the focused live acceptance matrix. **No live scenario has
passed yet.** The current enterprise delivery ZIP is not importable.
Owner target selection and explicit operation approval are required before
backup creation, import, publishing, schema/configuration or enterprise changes.

## H004 local evidence - 2026-11-17

Historical checkmarks below are acceptance criteria, **not new hosted evidence**.
The isolated H004 candidate has 44 passing Core/package cases and 67 passing
SSO/linked-agent cases, plus characterization lint and static runtime/schema
checks (Windows, Node 22.23.5, PowerShell 7.7.0). The SSO manifest requests
Node 24; local Node 22 execution does not certify the hosted Node 24 matrix.

- H005: all 15 nonempty panel-slot combinations, legacy two-panel dimensions,
  instructions, zoom, retained frame identity and per-config persistence.
- H006: ordered dependency loading, fail-closed read/auth/navigation errors,
  identity-isolated MSAL clients, single-resource scope validation, trusted
  endpoints, redirect rejection, expiring/replay-resistant in-memory handoff.
- H007: linked menu in every tab slot without replacing sibling frames;
  empty queries versus dependency errors; shared secure selected-agent auth.
- H008: actual successful Core queries covered by packaged schema; text/binary
  corruption gates; hostile theme-color regressions; separate complete optional
  resource delivery bundle verified against canonical UTF-8/LF source text.
- Core 1.0.0.12: offline PAC pack and four mapped-resource comparisons passed.
  XML/XAML and PowerShell parsing passed. Core excludes all optional resources
  and simulator schemas.

**Still required (H009):** authorized nonproduction Dynamics import, real
customer two-/four-panel acceptance, optional resource/schema setup, real Entra
and Copilot Studio sign-in/token-exchange and linked-agent tests. These are
untested, not inferred from mocks or package generation. No production action,
release publication or PR merge is authorized by these local results.

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

### Android Cell Phone Simulator (AndroidCellPhone.html v2.5.0)

#### Home Screen & Navigation
- ✔ Home screen renders clock, date, wallpaper, app grid, and dock
- ✔ Phone app icon navigates to phone screen with recent/contacts/keypad tabs
- ✔ Chrome icon (home grid + dock) opens browser screen
- ✔ Back arrow from browser returns to home and resets iframe

#### Outgoing Calls
- ✔ Tapping a contact writes `localStorage.genericSimCall` with `state: CONNECTED`
- ✔ Calling screen shows avatar, name, and calling animation
- ✔ In-call screen renders with mute/speaker/keypad/hold buttons
- ✔ End call transitions to ended screen with duration display

#### Incoming Calls
- ✔ Incoming call detected via `localStorage` listener (`state: RINGING`)
- ✔ Incoming screen shows caller info with accept/decline buttons
- ✔ Synthesized ringtone plays (440+480 Hz, 2s on / 4s off) when no ringtone URL and not muted
- ✔ Accepting transitions to in-call screen; declining returns to home

#### Settings Screen (Ctrl+Shift+D or Home Grid Icon)
- ✔ Settings screen opens/closes with Ctrl+Shift+D keyboard shortcut
- ✔ Settings screen opens via Settings gear icon on home app grid
- ✔ Mode badge displays "Standalone" or "Dataverse" based on Xrm detection
- ✔ D365 notice banner shown in Dataverse mode; hidden in standalone
- ✔ Profile list populates from Dataverse (D365 mode) or localStorage/FALLBACK_PROFILES (standalone)
- ✔ Selecting a profile applies queue name, caller info, transcript and shows as Active Profile
- ✔ Transcript toggle enables/disables transcript streaming during calls
- ✔ Browser URL field pre-configures the Chrome browser target URL

#### Standalone Profile Editing (Settings Screen)
- ✔ Edit pencil icon appears on each profile in standalone mode only (hidden in D365)
- ✔ Add Profile button appears at bottom of profile list in standalone mode only
- ✔ Inline profile editor opens with fields: name, contact, queue, case title, transcript enabled, interval, transcript text
- ✔ Save persists profile changes to localStorage (genericSimProfiles key)
- ✔ Delete removes profile from list and persists to localStorage
- ✔ Cancel closes editor without saving changes
- ✔ Profiles survive page reload via localStorage persistence
- ✔ D365 mode: no edit/add/delete buttons visible — profiles are read-only

#### Browser Screen
- ✔ URL bar accepts typed URLs and Enter key triggers navigation
- ✔ Plain text searches via DuckDuckGo (iframe-friendly)
- ✔ `www.` prefixed URLs auto-prepend `https://`
- ✔ Domain-like inputs (e.g. `example.com`) auto-prepend `https://`
- ✔ Blocked sites show lock icon with "Open in New Tab" button
- ✔ "Open in New Tab" opens URL in real browser tab via `window.open`
- ✔ Pre-configured URL from Settings auto-loads on Chrome icon tap
- ✔ Navigating home resets browser (clears iframe and URL bar)

#### Dual Mode (D365 / Standalone)
- ✔ D365 mode loads config via `Xrm.WebApi.retrieveMultipleRecords`
- ✔ Standalone mode uses FALLBACK_CONFIG, FALLBACK_CONTACTS, FALLBACK_PROFILES
- ✔ Fallback wallpaper URL renders as home screen background
- ✔ Default transcript text streams during in-call when transcript enabled

#### Dataverse Schema (GenericSoftphone Solution)
- ✔ Table `gensoft_genericsoftphone` has 13 columns matching schema spec
- ✔ Table `gensoft_demo_profile` has 7 columns matching schema spec
- ✔ 3 sample demo profiles inserted (Insurance Inquiry, Billing Dispute, Prescription Refill)
- ✔ Both tables added as solution components to GenericSoftphone solution

#### Lock Screen
- ✔ Lock screen displays on initial load with wallpaper background and swipe hint
- ✔ Swipe-to-unlock gesture (drag up) dismisses lock screen and reveals home screen
- ✔ Power button (right side) toggles lock screen on/off
- ✔ Lock screen clock and date update in real time
- ✔ Wallpaper from config/fallback renders as lock screen background

#### Camera Screen
- ✔ Camera app opens from home screen app grid
- ✔ getUserMedia requests webcam access on camera open
- ✔ Live viewfinder renders when webcam permission granted
- ✔ Graceful fallback viewfinder displays when permission denied or unavailable
- ✔ Shutter button triggers flash animation
- ✔ Front/rear camera flip toggle switches camera facing mode
- ✔ Media streams stop cleanly when navigating away from camera (no orphaned streams)
- ✔ Camera does not request permissions until explicitly opened
