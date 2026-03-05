# Android Phone Simulator – Design Document
Version: 1.0
Date: 2026-03-05
Author: Bradley Law

---

## Overview

A Samsung S25 Ultra Android phone simulator delivered as a **single self-contained HTML file** that integrates with the existing Generic Softphone simulator architecture. It acts as a second simulator writer — placing outgoing calls via the same `localStorage.genericSimCall` contract used by `sidebar_generic_call_simulator.html`.

The file works in two modes: inside Dynamics 365 (Dataverse-driven) and standalone (embedded fallback data).

---

## Output File

```
SidecarItems/Genesys Softphone/android_phone_simulator.html
```

Sits alongside the existing:
- `Genesys Softphone.html`
- `sidebar_generic_call_simulator.html`

---

## Architecture Contract (Non-Negotiables)

- localStorage key: `genericSimCall` — must not change
- Payload format: identical to existing simulator, with `state: "CONNECTED"` instead of `RINGING`
- Auth: all Dataverse reads via `Xrm.WebApi` — never bypassed
- Do not modify `Genesys Softphone.html`
- All changes additive only

---

## Section 1: Screen Architecture

Vanilla JS state machine. Five screens co-exist in the DOM; only one is active at a time via CSS class toggle. CSS `transition: transform 0.3s` handles slide animations.

### Screens

| Screen | Description |
|---|---|
| `HOME` | S25 Ultra home screen — clock, app grid, wallpaper |
| `PHONE_APP` | Tabs: Recents, Contacts, Keypad |
| `CONTACTS` | Scrollable list with avatars |
| `CALLING` | Outgoing call animation, ringback tone |
| `IN_CALL` | Connected state, transcript panel, controls |

### Flow

```
HOME → PHONE_APP → CONTACTS → CALLING → IN_CALL
                ↑_________________________________↓ (End Call)
```

### Core State Object

```js
const state = {
  screen: "HOME",
  contact: null,
  config: null,
  demoProfile: null,
  transcriptEnabled: true,
  callActive: false
}
```

---

## Section 2: Visual Design

### Phone Chassis

| Property | Value |
|---|---|
| Width | 393px |
| Height | 852px |
| Border radius | 44px |
| Chassis color | `#1a1a1a` (Phantom Black) |
| Side buttons | CSS `::before`/`::after` pseudo-elements |
| Punch-hole camera | 12px circle, top-center, cut into status bar |
| Font | Inter (inline Google Fonts import) |
| Screen glass | Subtle inner shadow + glossy overlay |

### Home Screen

- Wallpaper: loaded from `gensoft_phonewallpaperurl` or default gradient (deep blue/purple)
- 3 built-in wallpaper options selectable via long-press (Samsung-style)
- App grid: 4x5 icons, Samsung One UI rounded square style with labels
- Microsoft folder: tappable, expands to Teams, Outlook, OneDrive, Word, Excel, PowerPoint, Copilot
- Clock: large, live (`setInterval` every second), white text

### Contact Avatars

- D365 mode: loads `entityimage_thumbnail` — displayed as circular photo
- Standalone/fallback: generated initials circle with deterministic color from contact name

### Color Palette

- Background: `#1c1c1e` (Samsung dark)
- Accent: `#4fc3f7` (Samsung blue)
- Calling screen: pulsing ring animation around avatar

---

## Section 3: Data & Modes

### Mode Detection

```js
const isD365 = typeof Xrm !== "undefined" || !!window.parent?.Xrm;
```

### D365 Mode

| Data | Source |
|---|---|
| Softphone config | `gensoft_genericsoftphone` — default record or most recent |
| Contacts | `contact` table: `fullname`, `telephone1`, `contactid`, `entityimage_thumbnail` |
| Demo profiles | `gensoft_demo_profile` table |
| Wallpaper | `gensoft_phonewallpaperurl` field on config record |

### Standalone Mode (Embedded Fallback)

| Data | Fallback |
|---|---|
| Softphone config | Sensible defaults (queue: "Support", interval: 3s) |
| Contacts | Jamie Carter, Robert Martinez, Sarah Johnson |
| Demo profiles | FDA Recall, Veteran Benefits, Insurance Coverage |
| Wallpaper | Built-in deep blue/purple gradient |

localStorage still gets written in standalone mode — Genesys Softphone open in another same-browser tab will receive the call.

---

## Section 4: Call Trigger & Payload

### Call Flow

1. User taps contact → `CALLING` screen, ringback tone starts
2. After 3 seconds → `IN_CALL` screen, tone stops
3. Payload written to `localStorage.genericSimCall` at connect (step 2)
4. `Genesys Softphone.html` detects storage change and renders call

### Payload Format

```js
{
  callerName: contact.fullname,
  queueName: config.queueName,
  phoneNumber: contact.telephone1,
  contactId: contact.contactid,
  state: "CONNECTED",
  startTime: new Date().toISOString(),
  ringtoneUrl: "",
  muteRingtone: false,
  popMode: config.popMode,
  defaultCaseTitle: config.defaultCaseTitle,
  transcriptEnabled: config.transcriptEnabled,
  transcriptText: config.transcriptText,
  transcriptIntervalSeconds: config.transcriptIntervalSeconds,
  softphoneConfigId: config.id
}
```

### End Call

- `localStorage.removeItem("genericSimCall")`
- Ringback tone stopped and cleaned up
- Returns to `HOME` screen

### Transcript Playback

- Lines split by blank line from `transcriptText`
- Revealed one-by-one every `transcriptIntervalSeconds` seconds
- Auto-scrolls as new lines appear
- "Skip" button reveals full transcript immediately

### Transcript Toggle

- **Before call**: toggle switch on `CONTACTS`/`CALLING` screen, defaults to `config.transcriptEnabled`
- **During call**: "Transcript" button in `IN_CALL` controls bar — hides/shows panel, pauses timer if disabled
- Session-local only — does not write back to Dataverse

---

## Section 5: Demo Control Panel

**Shortcut:** `CTRL + SHIFT + D` — floating overlay, any screen

### Controls

| Control | Behavior |
|---|---|
| Profile dropdown | Loads full demo profile — updates contact, queue, transcript, case title |
| Transcript toggle | Enables/disables transcript for next or current call |
| Interval field | Overrides `transcriptIntervalSeconds` for session |
| Start Call | Bypasses phone UI — jumps straight to `CALLING → IN_CALL` |
| End Call | Clears `localStorage.genericSimCall`, returns to `HOME` |
| Skip Transcript | Reveals full transcript immediately |

D365 mode: profiles from `gensoft_demo_profile` Dataverse table.
Standalone mode: profiles from embedded JSON (FDA Recall, Veteran Benefits, Insurance Coverage).

---

## New Dataverse Fields Required

Add to existing table `gensoft_genericsoftphone`:

| Schema | Type | Purpose |
|---|---|---|
| `gensoft_phonewallpaperurl` | Text (1000) | Home screen wallpaper URL |
| `gensoft_phonetheme` | Choice: S25Ultra, Pixel, Generic | Device skin style |
| `gensoft_outgoingringtoneurl` | Text (1000) | Ringback tone audio URL |
| `gensoft_microsoftappsjson` | Multiline Text (4000) | Microsoft folder app list |
| `gensoft_homescreenappsjson` | Multiline Text (4000) | Home screen app layout |

New table `gensoft_demo_profile` (if not yet created) — see `android_phone_simulator_demo_profiles.md`.

---

## Technology

- Vanilla HTML/CSS/JavaScript — no build step, no dependencies
- Single self-contained file
- Works as `file://` in any browser and inside Dynamics 365 sidebar or stand alone tab
