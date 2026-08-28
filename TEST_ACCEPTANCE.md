# Generic.Sidebar — Test Acceptance Criteria

**Status:** DRAFT
**Version:** 1.4.0
**Updated:** 2026-08-27

---

## Acceptance Scope

Acceptance is evaluated separately for each deployment layer. Passing Android Phone Simulator, Genesys Softphone Simulator, or joint interoperability tests MUST NOT be represented as Generic Sidebar Core certification. Add-in failures do not change the Core result unless they expose a defect in Core's generic embed contract.

| Scope | Package/deployment | Certification boundary |
| --- | --- | --- |
| Generic Sidebar Core | `GenericSidebar_1_0_0_5.zip` | Core requirements only; excludes Android, Genesys, GenericSoftphone, and all `gensoft_*` components |
| Repository public site | GitHub Pages content | Site publishing and accessibility only; not Dynamics solution certification |
| Android Phone Simulator add-in | `AndroidCellPhone.html` 2.6.0, deployed separately | Android behavior and optional Dataverse mode only |
| Genesys Softphone Simulator add-in | Current checked-in Genesys file, deployed separately | Genesys behavior and optional Android interoperability only |

## Generic Sidebar Core Acceptance

### Core Runtime (`sidebar_sidebar.html` 2.15.5 + `sidebar_sidebar.js` 2.6.0)

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

## Repository Site Acceptance

### GitHub Pages Site

- ✔ Landing page loads and renders release chart from GitHub API
- ✔ Downloads page fetches all releases with pagination (100/page)
- ✔ Asset name filter narrows chart and table data
- ✔ Release count selector limits displayed releases
- ✔ CSV export produces valid CSV with escaped special characters
- ✔ Navigation bar links work across all pages (Home, Downloads, Agent, Copilot)
- ✔ Agent page displays download badge with live count
- ✔ Copilot page shows fallback message if iframe fails to load

### Site Accessibility

- ✔ All pages have `<html lang="en">`
- ✔ Skip-to-content link present on all GitHub Pages
- ✔ Chart canvas elements have `aria-label` and `role="img"`
- ✔ Table headers use `scope="col"`
- ✔ External links include `rel="noopener noreferrer"`

## Optional Add-in Acceptance: Android Phone Simulator

**Component version:** `AndroidCellPhone.html` 2.6.0
**Deployment:** Standalone HTML or separately deployed Dynamics web resource; never part of the base Core solution.

### Home Screen & Navigation

- ✔ Home screen renders clock, date, wallpaper, app grid, and dock
- ✔ Phone app icon navigates to phone screen with recent/contacts/keypad tabs
- ✔ Chrome icon (home grid + dock) opens browser screen
- ✔ Back arrow from browser returns to home and resets iframe

### Outgoing Calls

- ✔ Tapping a contact writes `localStorage.genericSimCall` with `state: RINGING` and `startTime: null`
- ✔ Calling screen shows avatar, name, and calling animation
- ✔ After about three seconds, Android enters its local in-call state and renders mute/speaker/keypad/hold buttons
- ✔ Android starts its own transcript immediately after entering local in-call; it does not wait for Genesys to answer or write `CONNECTED`
- ✔ End call transitions to ended screen with duration display

### Incoming Calls

- ✔ Incoming call detected via `localStorage` listener (`state: RINGING`)
- ✔ Incoming screen shows caller info with accept/decline buttons
- ✔ Synthesized ringtone plays (440+480 Hz, 2s on / 4s off) when no ringtone URL and not muted
- ✔ Accepting transitions to in-call screen; declining returns to home

### Settings Screen (Ctrl+Shift+D or Home Grid Icon)

- ✔ Settings screen opens/closes with Ctrl+Shift+D keyboard shortcut
- ✔ Settings screen opens via Settings gear icon on home app grid
- ✔ Mode badge displays "Standalone" or "Dataverse" based on Xrm detection
- ✔ D365 notice banner shown in Dataverse mode; hidden in standalone
- ✔ Profile list populates from Dataverse (D365 mode) or localStorage/FALLBACK_PROFILES (standalone)
- ✔ Selecting a profile applies queue name, caller info, transcript and shows as Active Profile
- ✔ Transcript toggle enables/disables transcript streaming during calls
- ✔ Browser URL field pre-configures the Chrome browser target URL

### Standalone Profile Editing (Settings Screen)

- ✔ Edit pencil icon appears on each profile in standalone mode only (hidden in D365)
- ✔ Add Profile button appears at bottom of profile list in standalone mode only
- ✔ Inline profile editor opens with fields: name, contact, queue, case title, transcript enabled, interval, transcript text
- ✔ Save persists profile changes to localStorage (genericSimProfiles key)
- ✔ Delete removes profile from list and persists to localStorage
- ✔ Cancel closes editor without saving changes
- ✔ Profiles survive page reload via localStorage persistence
- ✔ D365 mode: no edit/add/delete buttons visible — profiles are read-only

### Browser Screen

- ✔ URL bar accepts typed URLs and Enter key triggers navigation
- ✔ Plain text searches via DuckDuckGo (iframe-friendly)
- ✔ `www.` prefixed URLs auto-prepend `https://`
- ✔ Domain-like inputs (e.g. `example.com`) auto-prepend `https://`
- ✔ Blocked sites show lock icon with "Open in New Tab" button
- ✔ "Open in New Tab" opens URL in real browser tab via `window.open`
- ✔ Pre-configured URL from Settings auto-loads on Chrome icon tap
- ✔ Navigating home resets browser (clears iframe and URL bar)

### Dual Mode (D365 / Standalone)

- ✔ D365 mode loads config via `Xrm.WebApi.retrieveMultipleRecords`
- ✔ Standalone mode uses FALLBACK_CONFIG, FALLBACK_CONTACTS, FALLBACK_PROFILES
- ✔ Fallback wallpaper URL renders as home screen background
- ✔ Default transcript text streams during in-call when transcript enabled

### Dataverse Schema (GenericSoftphone Solution)

These checks apply only when the optional Android Dataverse mode is deployed. They are not Core prerequisites or Core certification evidence.

- ✔ Table `gensoft_genericsoftphone` has 13 columns matching schema spec
- ✔ Table `gensoft_demo_profile` has 7 columns matching schema spec
- ✔ 3 sample demo profiles inserted (Insurance Inquiry, Billing Dispute, Prescription Refill)
- ✔ Both tables added as solution components to GenericSoftphone solution

### Lock Screen

- ✔ Lock screen displays on initial load with wallpaper background and swipe hint
- ✔ Swipe-to-unlock gesture (drag up) dismisses lock screen and reveals home screen
- ✔ Power button (right side) toggles lock screen on/off
- ✔ Lock screen clock and date update in real time
- ✔ Wallpaper from config/fallback renders as lock screen background

### Camera Screen

- ✔ Camera app opens from home screen app grid
- ✔ getUserMedia requests webcam access on camera open
- ✔ Live viewfinder renders when webcam permission granted
- ✔ Graceful fallback viewfinder displays when permission denied or unavailable
- ✔ Shutter button triggers flash animation
- ✔ Front/rear camera flip toggle switches camera facing mode
- ✔ Media streams stop cleanly when navigating away from camera (no orphaned streams)
- ✔ Camera does not request permissions until explicitly opened

## Optional Add-in Acceptance: Genesys Softphone Simulator

**Component version:** unresolved metadata in the current file (component header 1.0.0; embedded UI marker 1.7.1).
**Deployment:** Separate demo web resource; never part of the base Core solution.

- ☐ Current Genesys version identifier is reconciled before certification
- ☐ Genesys loads as separately configured web content without a Core package dependency
- ☐ A `RINGING` payload with `startTime: null` renders the ringing state
- ☐ Answering changes the payload to `CONNECTED` and assigns `startTime`
- ☐ Transcript playback and configured screen-pop behavior complete in hosted Dynamics
- ☐ Add-in users have the required permissions for separately deployed `gensoft_*` components

## Optional Android and Genesys Interoperability

- ☐ Android 2.6.0 and the current Genesys file run under the same browser origin so storage events can be exchanged
- ☐ Android outgoing call writes `RINGING` with `startTime: null`
- ☐ Genesys receives the Android event and remains `RINGING` until answered
- ☐ Genesys answer transitions the shared payload to `CONNECTED` and sets `startTime`
- ☐ Android remains independent of the Genesys answer transition and does not observe or wait for `CONNECTED`
- ☐ Interoperability evidence is recorded as add-in validation, not Generic Sidebar Core certification
