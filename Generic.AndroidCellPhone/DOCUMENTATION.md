<!--
=============================================================================
DOCUMENT:     Android Cell Phone Simulator — Full Documentation
FILE:         Generic.AndroidCellPhone/DOCUMENTATION.md
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-03-06
ENVIRONMENT:  Markdown (GitHub / Docs)

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Comprehensive documentation for the Samsung S25 Ultra Android Cell Phone
Simulator. Covers HTML standalone operation, Dynamics 365 / Dataverse
integration as a web resource, softphone interop, and demo control panel.

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-03-06  Initial documentation created
=============================================================================
-->

# Android Cell Phone Simulator — Full Documentation

**Component:** Samsung S25 Ultra Android Phone Simulator  
**File:** `Generic.AndroidCellPhone/AndroidCellPhone.html`  
**Version:** 2.4.0  
**Author:** Generic.Sidebar Team  
**Last Updated:** 2026-03-06

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [How It Works — HTML Standalone Mode](#3-how-it-works--html-standalone-mode)
4. [How It Works — Dynamics 365 / Dataverse Web Resource](#4-how-it-works--dynamics-365--dataverse-web-resource)
5. [Softphone Integration](#5-softphone-integration)
6. [Screen Flow & State Machine](#6-screen-flow--state-machine)
7. [Call Flow — Outgoing Calls](#7-call-flow--outgoing-calls)
8. [Call Flow — Incoming Calls](#8-call-flow--incoming-calls)
9. [Transcript System](#9-transcript-system)
10. [Demo Control Panel](#10-demo-control-panel)
11. [Dataverse Schema](#11-dataverse-schema)
12. [Embedded Browser](#12-embedded-browser)
13. [Camera Simulator](#13-camera-simulator)
14. [Visual Design](#14-visual-design)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Non-Negotiables (Architecture Contract)](#16-non-negotiables-architecture-contract)
17. [Related Components](#17-related-components)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Overview

The Android Cell Phone Simulator is a **single self-contained HTML file** that renders a pixel-accurate Samsung Galaxy S25 Ultra phone simulator in the browser. It is designed for **contact center demo scenarios** within the Generic.Sidebar ecosystem.

The simulator serves as a **visual phone UI** that places outgoing calls and handles incoming calls. It does **not** replace the existing Generic Softphone architecture — instead, it acts as **another writer** to the shared `localStorage.genericSimCall` event bus, triggering the Genesys Softphone.html to render the call on the agent-side.

### Key Capabilities

| Capability | Description |
|---|---|
| Outgoing calls | User selects a contact → phone dials → writes `CONNECTED` payload to localStorage |
| Incoming calls | Listens for `RINGING` payloads from the Generic Call Simulator → shows incoming call screen |
| Transcript streaming | Plays back scripted conversations line-by-line during calls |
| Dual mode | Works both inside Dynamics 365 (Dataverse-driven) and standalone (file://, any browser) |
| Demo profiles | Switchable demo scenarios from Dataverse or embedded JSON |
| Embedded browser | Chrome icon opens an iframe-based browser with URL bar and DuckDuckGo search |
| Camera simulator | Camera icon activates live webcam viewfinder via `getUserMedia` |
| Lock screen | Swipe-to-unlock lock screen with live clock |

### What This Is NOT

- This is **not a real phone** or telephony client
- This is **not a VoIP endpoint** — it simulates call workflows for demos
- This does **not modify** the Genesys Softphone.html — it writes to the same localStorage contract
- This does **not have a backend** — all communication is via localStorage and Xrm.WebApi

---

## 2. Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dynamics 365 Browser Tab                     │
│                                                                  │
│  ┌──────────────────┐    localStorage     ┌──────────────────┐  │
│  │  AndroidCellPhone │ ──────────────────► │ Genesys Softphone│  │
│  │  .html            │  genericSimCall     │ .html            │  │
│  │  (Phone UI)       │  {state:CONNECTED}  │ (Agent Softphone)│  │
│  └───────┬───────────┘                     └───────┬──────────┘  │
│          │                                         │             │
│          │ Xrm.WebApi                              │ Xrm.WebApi  │
│          ▼                                         ▼             │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                     Dataverse                                ││
│  │  gensoft_genericsoftphone  │  gensoft_demo_profile  │ contact ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────┐    localStorage     ┌──────────────────┐  │
│  │  Generic Call     │ ──────────────────► │ AndroidCellPhone │  │
│  │  Simulator.html   │  genericSimCall     │ .html            │  │
│  │  (Admin Tool)     │  {state:RINGING}    │ (Shows Incoming) │  │
│  └──────────────────┘                     └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Contract

| Element | Value | Notes |
|---|---|---|
| **localStorage Key** | `genericSimCall` | Shared event bus — must never change |
| **Outgoing Payload State** | `CONNECTED` | Phone writes CONNECTED on call connect |
| **Incoming Payload State** | `RINGING` | Phone listens for RINGING from call simulator |
| **Auth Model** | `Xrm.WebApi` | All Dataverse reads go through Xrm — never bypassed |
| **Payload Format** | JSON (see §7) | Identical to existing simulator payload structure |

### Technology

- **Vanilla HTML/CSS/JavaScript** — no build step, no npm, no dependencies
- **Single file** — all CSS, HTML, and JS in one `.html` file
- **Google Fonts** — Raleway and Jost loaded via `@import`
- **Web Audio API** — synthesized ringtone (440 Hz + 480 Hz dual-tone)
- **getUserMedia API** — live camera viewfinder

---

## 3. How It Works — HTML Standalone Mode

When opened as a plain HTML file (`file://` protocol or any static web server), the simulator operates entirely from **embedded fallback data**.

### Mode Detection

```js
function detectMode() {
  ensureXrm();
  isD365 = (typeof Xrm !== 'undefined') && !!Xrm && !!Xrm.WebApi;
}
```

If `Xrm.WebApi` is not available, the simulator falls back to standalone mode.

### Fallback Data

**Fallback Configuration:**

| Setting | Default Value |
|---|---|
| Queue Name | `Support` |
| Transcript Enabled | `true` |
| Transcript Interval | 3 seconds |
| Transcript Text | Insurance billing scenario (deductible + payment plan) |
| Wallpaper | Unsplash deep-blue gradient image |

**Fallback Contacts (3):**

| Name | Phone |
|---|---|
| Jamie Carter | (555) 201-4832 |
| Robert Martinez | (555) 376-9154 |
| Sarah Johnson | (555) 448-2267 |

**Fallback Demo Profiles (3):**

| Profile | Queue | Contact |
|---|---|---|
| FDA Safety Recall | Safety Recall | Sarah Johnson |
| Veteran Benefits | Benefits | Robert Martinez |
| Insurance Inquiry | Insurance | Jamie Carter |

### Standalone Behavior

1. Phone boots to the **Lock Screen** with live clock
2. Tap or click to unlock → **Home Screen**
3. Tap Phone icon → **Phone App** with Recents / Contacts / Keypad tabs
4. Tap a contact → **Calling Screen** (3-second ring animation)
5. Auto-connects → **In-Call Screen** with transcript streaming
6. localStorage payload is written at connect — if Genesys Softphone.html is open in another tab of the same browser, it will receive the call

### No Network Required

In standalone mode, the only external dependency is the Google Fonts import. All contacts, config, demo profiles, and transcript text are embedded in the JavaScript. The phone is fully functional without any network connection (fonts will fall back to system sans-serif).

---

## 4. How It Works — Dynamics 365 / Dataverse Web Resource

When the HTML file is deployed as a **Dynamics 365 web resource**, it gains access to the `Xrm.WebApi` and reads all configuration from Dataverse.

### Deployment as a Web Resource

1. Upload `AndroidCellPhone.html` as a web resource in the Power Apps maker portal
2. Set the type to **Webpage (HTML)**
3. Add it to the **GenericSoftphone** solution (publisher prefix: `gensoft_`)
4. The file can be embedded in a sidebar pane, opened in a new tab, or rendered in an iframe

### Xrm.WebApi Discovery

The simulator walks up the `window.parent` chain (up to 10 levels) to locate the `Xrm` object from the hosting Dynamics 365 page:

```js
function ensureXrm() {
  if (typeof Xrm !== 'undefined' && Xrm) return;
  var w = window;
  for (var i = 0; i < 10 && w; i++) {
    try { if (w.Xrm) { window.Xrm = w.Xrm; return; } } catch(e) {}
    if (!w.parent || w.parent === w) break;
    w = w.parent;
  }
  try { if (window.top && window.top.Xrm) window.Xrm = window.top.Xrm; } catch(e) {}
}
```

This is the standard pattern for D365 web resources that need Xrm context when loaded in iframes or side panes.

### What It Reads from Dataverse

#### 1. Softphone Configuration (`gensoft_genericsoftphone`)

Loaded on init via `Xrm.WebApi.retrieveMultipleRecords`. The simulator:
- **First** queries for the record where `gensoft_defaultsoftphoneconfig = true`
- **Falls back** to the most recently created record if no default is set

**Fields read:**

| Dataverse Column | Used For |
|---|---|
| `gensoft_genericsoftphoneid` | Config record ID (sent in call payload as `softphoneConfigId`) |
| `gensoft_queuename` | Queue label shown during calls |
| `gensoft_ringtoneurl` | Audio URL for incoming ringtone |
| `gensoft_outgoingringtoneurl` | Audio URL for outgoing ringback tone (overrides ringtone) |
| `gensoft_muteringtone` | Boolean — suppresses ringtone playback |
| `gensoft_popmode` | Screen pop behavior on call connect |
| `gensoft_defaultcasetitle` | Pre-fill title when auto-creating a Case |
| `gensoft_transcriptenabled` | Whether transcript panel is shown |
| `gensoft_transcripttext` | The scripted conversation content |
| `gensoft_transcriptplaybackintervalseconds` | Seconds between each transcript line |
| `gensoft_defaultsoftphoneconfig` | Boolean — marks this as the active config |
| `gensoft_phonewallpaperurl` | URL to an image used as home screen wallpaper |

#### 2. Contacts (`contact`)

Loaded on init. Retrieves up to 50 contacts sorted by name:

```
?$select=fullname,telephone1,contactid,entityimage_thumbnail
&$orderby=fullname asc
&$top=50
```

- **`entityimage_thumbnail`** — if present, displayed as a circular photo avatar
- If no thumbnail, initials are generated from the contact name with a deterministic color

#### 3. Demo Profiles (`gensoft_demo_profile`)

Loaded when the Demo Control Panel is opened. Retrieves up to 20 profiles:

```
?$select=gensoft_name,gensoft_contactname,gensoft_queuename,
         gensoft_defaultcasetitle,gensoft_transcriptenabled,
         gensoft_transcripttext,gensoft_transcriptplaybackintervalseconds
&$orderby=gensoft_name asc
&$top=20
```

### Error Handling

If any Dataverse query fails (network error, permissions, etc.), the simulator **silently falls back to embedded data**. It never shows an error dialog or breaks the UI. This ensures the demo always works, even if the Dataverse environment is misconfigured.

---

## 5. Softphone Integration

The Android Phone Simulator integrates with the existing Generic Softphone ecosystem through **localStorage** — a simple but effective browser-native event bus.

### The Ecosystem

| Component | File | Role |
|---|---|---|
| **Android Phone Simulator** | `AndroidCellPhone.html` | Places outgoing calls (writes `CONNECTED`) and receives incoming calls (listens for `RINGING`) |
| **Genesys Softphone** | `Genesys Softphone.html` | Agent-side softphone UI — reads localStorage, renders call card, runs transcript, performs screen pops |
| **Generic Call Simulator** | `sidebar_generic_call_simulator.html` | Admin tool — writes `RINGING` payloads to simulate incoming calls |

### Communication Flow — Outgoing Call

```
User taps contact on phone
        │
        ▼
AndroidCellPhone.html shows Calling → In-Call screens
        │
        ▼ (at connect, writes to localStorage)
localStorage.genericSimCall = {state: "CONNECTED", ...}
        │
        ▼ (storage event fires)
Genesys Softphone.html detects change
        │
        ▼
Softphone renders "CONNECTED" call card
        │
        ▼
Softphone starts transcript playback
        │
        ▼
Softphone performs screen pop (opens Contact or creates Case)
```

### Communication Flow — Incoming Call

```
Admin uses Generic Call Simulator
        │
        ▼
sidebar_generic_call_simulator.html writes localStorage
localStorage.genericSimCall = {state: "RINGING", ...}
        │
        ▼ (storage event fires)
AndroidCellPhone.html detects RINGING payload
        │
        ▼
Phone shows Incoming Call screen with Answer / Decline
        │
        ▼ (if answered)
Phone transitions to In-Call, starts transcript
```

### Softphone Configuration from Dataverse

The softphone reads the same `gensoft_genericsoftphone` config table. Both the phone and the softphone share these key settings:

| Config Field | Phone Uses It For | Softphone Uses It For |
|---|---|---|
| `gensoft_queuename` | Displays queue name in call info | Displays queue name in call card |
| `gensoft_transcriptenabled` | Controls transcript panel visibility | Controls transcript panel visibility |
| `gensoft_transcripttext` | Content for transcript bubbles | Content for transcript bubbles |
| `gensoft_transcriptplaybackintervalseconds` | Timing between transcript lines | Timing between transcript lines |
| `gensoft_popmode` | Included in payload | Determines screen pop behavior (contact-only vs. new-case) |
| `gensoft_defaultcasetitle` | Included in payload | Pre-fills case title on auto-creation |
| `gensoft_ringtoneurl` | Played during incoming calls | N/A |
| `gensoft_outgoingringtoneurl` | Played during outgoing ring phase | N/A |
| `gensoft_phonewallpaperurl` | Home/lock screen wallpaper | N/A |

### Screen Pop Behavior (Softphone Side)

When the softphone receives a `CONNECTED` payload with a `contactId`, it performs a screen pop:

- **Pop Mode `687940000` (Contact Only):** Opens the Contact form via `Xrm.Navigation.openForm`
- **Pop Mode `687940001` (New Case for Contact):** Creates an `incident` record via `Xrm.WebApi.createRecord`, then opens the Case form

The phone simulator includes `popMode`, `contactId`, and `defaultCaseTitle` in its payload so the softphone can execute the appropriate action.

### Transcript Completed Flag

When the softphone finishes playing all transcript lines, it writes `gensoft_transcriptcompleted = true` back to the config record in Dataverse via `Xrm.WebApi.updateRecord`. This provides a Dataverse-queryable signal that the demo transcript has finished.

---

## 6. Screen Flow & State Machine

The simulator uses a vanilla JS state machine. All screens co-exist in the DOM as absolutely-positioned layers. Only one screen is visible at a time via CSS class toggling. Transitions use `transform: translateX()` with `transition: 0.32s cubic-bezier`.

### Screen Map

```
LOCK → HOME → PHONE_APP → CONTACTS → CALLING → IN_CALL → ENDED → HOME
HOME → INCOMING → IN_CALL → ENDED → HOME    (incoming call path)
HOME → BROWSER → HOME                        (Chrome icon)
HOME → CAMERA → HOME                         (Camera icon)
```

### Screens

| Screen ID | Name | Description |
|---|---|---|
| `scr-lock` | Lock Screen | Wallpaper, clock, "Tap to unlock" hint with bounce animation |
| `scr-home` | Home Screen | Clock, date, app grid (Phone, Messages, Chrome, Camera, Gallery, Settings, Microsoft folder), dock bar |
| `scr-phone` | Phone App | Tabs: Recents (empty state), Contacts (scrollable list), Keypad (T9-style grid) |
| `scr-contacts` | Contacts | Search bar, transcript toggle, scrollable contact list with avatars |
| `scr-calling` | Calling | "Calling..." label, contact name/number, pulsing ring animation, end-call button |
| `scr-incall` | In-Call | Contact info header, live timer, transcript panel, control buttons (Mute, Transcript, Skip, Speaker, End, Keypad) |
| `scr-incoming` | Incoming Call | "Incoming Call" label, contact info, Answer (green) and Decline (red) buttons |
| `scr-ended` | Call Ended | Contact avatar, name, reason, duration — auto-returns to Home after 2.5 seconds |
| `scr-browser` | Browser | URL bar, iframe content area, new-tab page, blocked-site fallback with "Open in New Tab" |
| `scr-camera` | Camera | Live webcam viewfinder, rule-of-thirds grid overlay, shutter button with flash effect, flip button |

### Navigation Function

```js
function navTo(key, back) {
  // Slides new screen in from right (forward) or left (back)
  // Sets CSS classes: .active (visible), .prev (sliding out)
}
```

---

## 7. Call Flow — Outgoing Calls

### Step-by-Step

1. **User taps contact** (from Contacts screen, Phone App contacts tab, or Keypad dial)
2. → `doCall(contact)` is invoked
3. **Calling Screen** displayed with contact name, phone number, avatar, pulsing ring animation
4. **Ringback tone** starts:
   - If `gensoft_outgoingringtoneurl` is set → plays that audio file
   - Otherwise → synthesized dual-tone (440 Hz + 480 Hz, 2s ON / 4s OFF cadence) via Web Audio API
5. After **3 seconds** → `connect(contact)` fires
6. Ring tone stops
7. **In-Call Screen** displayed with timer, transcript panel, controls
8. **localStorage payload written:**

```json
{
  "callerName": "Jamie Carter",
  "queueName": "Support",
  "phoneNumber": "(555) 201-4832",
  "contactId": "demo-1",
  "state": "CONNECTED",
  "startTime": "2026-03-06T14:30:00.000Z",
  "ringtoneUrl": "",
  "muteRingtone": false,
  "popMode": null,
  "defaultCaseTitle": "Customer Inquiry",
  "transcriptEnabled": true,
  "transcriptText": "Customer: Hi, I received a hospital bill...\n\nAgent: Let me pull up your account...",
  "transcriptIntervalSeconds": 3,
  "softphoneConfigId": "00000000-0000-0000-0000-000000000000"
}
```

9. **Genesys Softphone** detects the `storage` event →  renders the call card as CONNECTED
10. Transcript playback begins on both the phone and the softphone simultaneously
11. **End Call** → clears localStorage, shows Ended screen (2.5s), returns to Home

### Why State is CONNECTED (Not RINGING)

The Android phone represents the **customer's device**. When a customer dials, the call connects to the agent. The existing call simulator writes `RINGING` because it simulates an **incoming** call to the agent. The phone writes `CONNECTED` because by the time the softphone receives it, the call is already established.

---

## 8. Call Flow — Incoming Calls

The phone also handles **incoming calls** triggered by the Generic Call Simulator.

### How It Works

1. Admin opens `sidebar_generic_call_simulator.html` and clicks "Ring Softphone"
2. Simulator writes `{state: "RINGING", ...}` to `localStorage.genericSimCall`
3. The phone's `storage` event listener detects the change:

```js
window.addEventListener('storage', function(e) {
  if (e.key !== STORAGE_KEY) return;
  if (!e.newValue) { /* call ended externally */ return; }
  var data = JSON.parse(e.newValue);
  if (data.state === 'RINGING' && !S.active) showIncoming(data);
});
```

4. **Incoming Call Screen** displayed with caller name, phone number, ringtone
5. User can **Answer** → transitions to In-Call screen, starts transcript
6. User can **Decline** → clears localStorage, shows Ended screen ("Call Declined")

### Ringtone for Incoming Calls

- If the payload includes `ringtoneUrl` and `muteRingtone` is false → plays that audio
- Otherwise → synthesized ring tone (same 440+480 Hz dual-tone)

---

## 9. Transcript System

### How Transcripts Are Stored

Transcript text is stored as plain multiline text in Dataverse (`gensoft_transcripttext`) or in embed fallback JSON. Format:

```
Customer: Hi, I received a hospital bill for $1,200 that I thought my insurance would cover.

Agent: I'm sorry to hear that. Let me pull up your account and take a look.

Customer: Sure, my member ID is HCB-449821.

Agent: Thank you. I can see the $1,200 charge is your annual deductible portion.
```

- Each conversation turn is separated by a **blank line** (`\n\n`)
- Lines prefixed with `Customer:` or `Caller:` are shown as left-aligned dark bubbles
- Lines prefixed with `Agent:` are shown as right-aligned blue bubbles
- Unprefixed lines default to customer

### Parsing

```js
function parseTr(txt) {
  return txt.split(/\n\n+/).map(function(blk) {
    var m = blk.match(/^(Customer|Agent|caller|agent):\s*/i);
    if (m) {
      var t = (m[1].toLowerCase() === 'customer' || m[1].toLowerCase() === 'caller')
              ? 'customer' : 'agent';
      return { type: t, spk: m[1], txt: blk.substring(m[0].length) };
    }
    return { type: 'customer', spk: 'Customer', txt: blk };
  }).filter(Boolean);
}
```

### Playback

- Lines are revealed one at a time at the interval configured in `gensoft_transcriptplaybackintervalseconds` (default: 3 seconds)
- Each new line animates in with a `bubble-in` CSS animation (slide up + fade in)
- The transcript panel auto-scrolls to keep the latest message visible
- The **Skip** button (`skipTr()`) reveals all remaining lines immediately

### Transcript Toggle

- **Before a call:** Toggle switch on the Contacts screen and Calling screen
- **During a call:** "Transcript" button in the In-Call controls bar hides/shows the panel
- **Demo Panel:** Master toggle for transcript on/off
- The toggle is **session-local only** — it does not write back to Dataverse

### Dual Playback

When a call is active, transcript plays on **both**:
1. The phone's In-Call screen (styled as chat bubbles)
2. The Genesys Softphone's transcript panel (if enabled)

Both read the same `transcriptText` from the localStorage payload and play independently.

---

## 10. Demo Control Panel

**Shortcut:** `CTRL + SHIFT + D` (works on any screen)

The Demo Control Panel is a bottom-sheet overlay that provides quick access to demo controls without leaving the phone UI.

### Controls

| Control | Description |
|---|---|
| **Profile Dropdown** | Loads a complete demo profile — overrides contact, queue, transcript, case title |
| **Transcript Toggle** | Enables/disables transcript for the next or current call |
| **Browser URL** | Sets a URL that auto-loads when the Chrome icon is tapped |
| **Start Call** | Bypasses phone UI — immediately starts a call with the selected profile's contact |
| **End Call** | Ends the current call, clears localStorage |
| **Skip Transcript** | Reveals all remaining transcript lines immediately |

### Profile Loading

In D365 mode, profiles come from the `gensoft_demo_profile` Dataverse table. In standalone mode, three embedded profiles are used:

| Profile | Scenario |
|---|---|
| **FDA Safety Recall** | Customer calls about Metformin lot recall; agent confirms and arranges replacement |
| **Veteran Benefits** | Veteran asks about healthcare benefits post-separation; agent confirms VA eligibility |
| **Insurance Inquiry** | Customer questions $1,200 hospital bill; agent explains deductible and payment plan |

When a profile is selected:
1. Queue name, case title, and transcript text are overridden
2. The transcript toggle reflects the profile's `transcriptEnabled` setting
3. If the profile specifies a `contactName`, the matching contact from the contacts list is pre-selected

---

## 11. Dataverse Schema

The simulator uses two custom Dataverse tables, both in the **GenericSoftphone** solution (publisher prefix: `gensoft_`).

### Table 1: `gensoft_genericsoftphone` (Softphone Config)

Stores the active softphone configuration. One record should be marked as default.

| Column | Schema Name | Type | Purpose |
|---|---|---|---|
| Name | `gensoft_name` | Text (100) | Human-readable label |
| Queue Name | `gensoft_queuename` | Text (100) | Call queue label |
| Default Config | `gensoft_defaultsoftphoneconfig` | Yes/No | Marks this as the active config |
| Pop Mode | `gensoft_popmode` | Text (50) | Screen pop behavior |
| Default Case Title | `gensoft_defaultcasetitle` | Text (200) | Pre-fill case subject |
| Transcript Enabled | `gensoft_transcriptenabled` | Yes/No | Show transcript panel |
| Transcript Text | `gensoft_transcripttext` | Multiline (10000) | Scripted conversation |
| Transcript Interval | `gensoft_transcriptplaybackintervalseconds` | Whole Number | Seconds between lines |
| Incoming Ringtone URL | `gensoft_ringtoneurl` | Text (500) | Audio for incoming calls |
| Outgoing Ringtone URL | `gensoft_outgoingringtoneurl` | Text (500) | Audio for outgoing calls |
| Mute Ringtone | `gensoft_muteringtone` | Yes/No | Suppress ringtone |
| Phone Wallpaper URL | `gensoft_phonewallpaperurl` | Text (500) | Home screen wallpaper image |
| Transcript Completed | `gensoft_transcriptcompleted` | Yes/No | Set by softphone when transcript finishes |

### Table 2: `gensoft_demo_profile` (Demo Profiles)

Each record is a named demo scenario shown in the Demo Control Panel.

| Column | Schema Name | Type | Purpose |
|---|---|---|---|
| Name | `gensoft_name` | Text (100) | Shown in profile dropdown |
| Contact Name | `gensoft_contactname` | Text (100) | Fuzzy-matched to Contact records |
| Queue Name | `gensoft_queuename` | Text (100) | Overrides config queue |
| Default Case Title | `gensoft_defaultcasetitle` | Text (200) | Overrides config case title |
| Transcript Enabled | `gensoft_transcriptenabled` | Yes/No | Transcript for this scenario |
| Transcript Text | `gensoft_transcripttext` | Multiline (10000) | Scripted conversation |
| Transcript Interval | `gensoft_transcriptplaybackintervalseconds` | Whole Number | Line interval |

### Standard Tables Used (Read-Only)

| Table | Columns | Purpose |
|---|---|---|
| `contact` | `fullname`, `telephone1`, `contactid`, `entityimage_thumbnail` | Phone contacts list |

---

## 12. Embedded Browser

Tapping the **Chrome icon** (dock bar or app grid) opens an embedded browser screen.

### Features

- **URL bar** with Enter-to-navigate
- **Smart URL detection:**
  - If input starts with `http://` or `https://` → navigate directly
  - If input starts with `www.` → prepend `https://`
  - If input looks like a domain (e.g., `example.com`) → prepend `https://`
  - Otherwise → DuckDuckGo search: `https://duckduckgo.com/?q=...`
- **Sandboxed iframe:** `allow-scripts allow-same-origin allow-forms allow-popups`
- **Loading indicator:** Blue/green gradient bar at top
- **Blocked-site fallback:** If the site refuses framing (X-Frame-Options), shows a fallback page with "Open in New Tab" button
- **Demo Panel URL:** Set a default URL via the Demo Control Panel that auto-loads when Chrome is opened

### Limitations

- Sites that block iframe embedding will trigger the blocked-site fallback
- The iframe sandbox prevents some cross-origin interactions
- No tab management — single-page browsing only

---

## 13. Camera Simulator

Tapping the **Camera icon** (dock bar or app grid) opens a live camera viewfinder.

### Features

- **Live webcam feed** via `navigator.mediaDevices.getUserMedia`
- **Rule-of-thirds grid** overlay (CSS pseudo-elements)
- **Shutter button** with white flash effect (120ms CSS animation)
- **Flip camera** button to toggle front/back camera (`facingMode: 'environment' / 'user'`)
- **Graceful fallback** when camera is unavailable:
  - `NotAllowedError` → "Camera permission denied. Grant access in browser settings."
  - `NotFoundError` → "No camera detected on this device."
  - No `getUserMedia` support → "Camera not available in this browser."

### Cleanup

When navigating away from the camera screen, the video stream is stopped (`track.stop()`) to release the camera hardware immediately.

---

## 14. Visual Design

### Phone Chassis

| Property | Value |
|---|---|
| Dimensions | 393 × 852 px |
| Border radius | 52px (chassis), 44px (screen glass) |
| Color | Phantom Black gradient (`#2a2a2a` → `#0d0d0d`) |
| Side buttons | Volume Up, Volume Down (left), Power (right) |
| Punch-hole camera | 11px circle, top-center |
| Screen glass | Inner shadow + subtle glossy overlay (CSS `::after`) |

### Fonts

| Font | Usage |
|---|---|
| **Raleway** (100–700) | Clock, screen titles, contact names — display font |
| **Jost** (300–700) | UI labels, buttons, body text — functional font |

### Color System

| Variable | Value | Usage |
|---|---|---|
| `--bg` | `#000000` | Screen background |
| `--s1` | `#1c1c1e` | Surface level 1 |
| `--s2` | `#2c2c2e` | Surface level 2 (buttons, inputs) |
| `--s3` | `#3c3c3e` | Surface level 3 (active states) |
| `--tx` | `#ffffff` | Primary text |
| `--t2` | `rgba(255,255,255,0.65)` | Secondary text |
| `--t3` | `rgba(255,255,255,0.35)` | Tertiary text |
| `--ac` | `#4285f4` | Accent blue |
| `--gn` | `#30d158` | Green (call, answer) |
| `--rd` | `#ff453a` | Red (end call, decline) |
| `--or` | `#ff9f0a` | Orange (alerts) |

### Avatar Generation

When contact photos are not available, the simulator generates deterministic initial avatars:

```js
var AV_COLORS = ['#4285f4','#ea4335','#fbbc04','#34a853','#bf5af2',
                 '#ff9f0a','#30d158','#ff453a','#64d2ff','#ff6b6b'];

function avColor(name) {
  // Deterministic hash → consistent color per contact name
}
function avInit(name) {
  // "Jamie Carter" → "JC", "Robert" → "RO"
}
```

---

## 15. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `CTRL + SHIFT + D` | Open / close Demo Control Panel |
| Power button (right side of chassis) | Toggle lock / unlock |

---

## 16. Non-Negotiables (Architecture Contract)

These rules are **inviolable** and must be preserved across all future changes:

1. **localStorage key `genericSimCall`** — must never be renamed or changed
2. **Payload state `CONNECTED`** for outgoing calls — the Genesys Softphone depends on this
3. **All Dataverse reads via `Xrm.WebApi`** — never use fetch/XMLHttpRequest to Dataverse directly
4. **Do NOT modify `Genesys Softphone.html`** — the phone is an additive component
5. **All changes must be additive** — no breaking changes to existing contracts
6. **Single self-contained HTML file** — no external JS/CSS dependencies (fonts excepted)
7. **Dual mode operation** — must always work both inside D365 and standalone

---

## 17. Related Components

| File | Description |
|---|---|
| `Generic.AndroidCellPhone/AndroidCellPhone.html` | This component — the phone simulator |
| `SidecarItems/Genesys Softphone/Genesys Softphone.html` | Agent-side softphone UI |
| `SidecarItems/Genesys Softphone/sidebar_generic_call_simulator.html` | Admin tool to trigger incoming calls |
| `SidecarItems/Genesys Softphone/android_phone_simulator.html` | Earlier version of the phone (v1.0.0, less features) |
| `specs/main/dataverse-schema.md` | Full Dataverse table/column definitions |
| `specs/main/scripts/create-dataverse-schema.ps1` | PowerShell script to create Dataverse schema |
| `Generic.AndroidCellPhone/plans/2026-03-05-android-phone-simulator-design.md` | Original design document |
| `Generic.AndroidCellPhone/Requirmeents.md/s25-ultra-phone-simulator-spec.md` | Architecture spec |

---

## 18. Troubleshooting

### Phone shows fallback data inside Dynamics 365

- **Cause:** `Xrm.WebApi` not accessible from the iframe
- **Fix:** Ensure the HTML is loaded as a web resource in the same domain. If embedded via an external URL, Xrm won't be available. The `ensureXrm()` function walks up to 10 parent frames — if the Dynamics shell is beyond that, it won't find Xrm.

### Call doesn't appear in Genesys Softphone

- **Cause:** The softphone and phone are in different browser tabs or windows that don't share localStorage
- **Fix:** Both must be in the **same browser** and **same origin**. When running as D365 web resources, they share the D365 domain. When running standalone, both must be opened from the same `file://` or `http://` origin.

### Contacts list is empty

- **Cause:** No contacts in Dataverse, or user lacks read access to the `contact` table
- **Fix:** Ensure the user has `Read` privilege on the `contact` table. The query fetches top 50 contacts sorted by `fullname`.

### Transcript not playing

- **Cause:** `gensoft_transcriptenabled` is false, or `gensoft_transcripttext` is empty
- **Fix:** Check the active config record in Dataverse. Ensure the text uses blank-line separators between turns.

### Ringtone not playing

- **Cause:** Browser auto-play policy blocks audio before user interaction
- **Fix:** The user must interact with the phone (tap/click) before the browser allows audio. The synthesized Web Audio API tone generally bypasses this. External audio URLs may be blocked until the first user gesture.

### Demo profiles not loading

- **Cause:** No `gensoft_demo_profile` records in Dataverse, or user lacks read access
- **Fix:** Create demo profile records per the schema. In standalone mode, fallback profiles are always available.

### Lock screen doesn't unlock

- **Cause:** Clicking outside the screen glass area
- **Fix:** Click directly on the phone screen (inside the glass area). The lock screen listens for `onclick` on the `scr-lock` element.

---

*Generated 2026-03-06 — Generic.Sidebar Team*
