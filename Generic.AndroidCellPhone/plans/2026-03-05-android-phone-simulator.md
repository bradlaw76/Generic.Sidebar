# Android Phone Simulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `android_phone_simulator.html` — a single self-contained HTML/CSS/JS file that renders a high-fidelity Samsung S25 Ultra Android phone UI and writes outgoing call payloads to `localStorage.genericSimCall`, integrating with the existing `Genesys Softphone.html`.

**Architecture:** Vanilla JS state machine with 5 screens (HOME, PHONE_APP, CONTACTS, CALLING, IN_CALL) co-existing in the DOM, toggled via CSS class. Dual-mode: D365 mode uses `Xrm.WebApi` for Dataverse data; standalone mode uses embedded fallback JSON. No build step, no dependencies, no external CDN calls — everything inline.

**Tech Stack:** HTML5, CSS3 (custom properties, transitions, animations), Vanilla JS (ES6+), localStorage, Xrm.WebApi (when available)

**Reference files (read-only — do not modify):**
- `SidecarItems/Genesys Softphone/sidebar_generic_call_simulator.html` — payload contract source of truth
- `SidecarItems/Genesys Softphone/Genesys Softphone.html` — consumer of localStorage payload
- `docs/plans/2026-03-05-android-phone-simulator-design.md` — approved design

**Output file:** `SidecarItems/Genesys Softphone/android_phone_simulator.html`

---

## Task 1: File Scaffold + S25 Ultra Phone Chassis

**Files:**
- Create: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Create the file with component header and phone chassis HTML/CSS**

The phone chassis is a centered div on a neutral page background. All visual detail comes from CSS — no images required for the chassis itself.

```html
<!--
=============================================================================
COMPONENT:    Android Phone Simulator
FILE:         SidecarItems\Genesys Softphone\android_phone_simulator.html
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-03-05
ENVIRONMENT:  HTML | JavaScript

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Samsung S25 Ultra Android phone simulator UI. Places outgoing calls by
writing a call payload to localStorage (key: genericSimCall). Integrates
with Genesys Softphone.html which reads the same key and renders the call.

Works in two modes:
  D365 Mode:        Loads data from Dataverse via Xrm.WebApi
  Standalone Mode:  Uses embedded fallback JSON (opens as file://)

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source:      Dataverse gensoft_genericsoftphone + contact tables (D365)
                    Embedded JSON fallback (standalone)
- Auth Model:       Xrm.WebApi (D365 mode only)
- State Machine:    HOME → PHONE_APP → CONTACTS → CALLING → IN_CALL
- Storage Key:      genericSimCall (must match Genesys Softphone.html)

-----------------------------------------------------------------------------
NON-NEGOTIABLES
-----------------------------------------------------------------------------
- Do NOT change localStorage key (genericSimCall)
- Do NOT modify Genesys Softphone.html
- Do NOT bypass Xrm.WebApi for Dataverse reads
- All changes must be additive only
=============================================================================
-->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Android Phone Simulator</title>
  <style>
    /* ── Reset & Page ─────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #0a0a0f;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    /* ── Phone Chassis ─────────────────────────────────────────────── */
    .phone-chassis {
      position: relative;
      width: 393px;
      height: 852px;
      background: #1a1a1a;
      border-radius: 44px;
      box-shadow:
        0 0 0 1px #333,
        0 0 0 3px #1a1a1a,
        0 0 0 4px #444,
        0 50px 100px rgba(0,0,0,0.8),
        inset 0 0 0 1px rgba(255,255,255,0.05);
      overflow: hidden;
      flex-shrink: 0;
    }

    /* Volume buttons (left side) */
    .phone-chassis::before {
      content: '';
      position: absolute;
      left: -4px;
      top: 120px;
      width: 4px;
      height: 32px;
      background: #2a2a2a;
      border-radius: 2px 0 0 2px;
      box-shadow: 0 44px 0 #2a2a2a, 0 88px 0 #2a2a2a;
    }

    /* Power button (right side) */
    .phone-chassis::after {
      content: '';
      position: absolute;
      right: -4px;
      top: 160px;
      width: 4px;
      height: 64px;
      background: #2a2a2a;
      border-radius: 0 2px 2px 0;
    }

    /* ── Screen (glass area) ────────────────────────────────────────── */
    .phone-screen {
      position: absolute;
      inset: 6px;
      border-radius: 38px;
      overflow: hidden;
      background: #000;
    }

    /* Glossy overlay */
    .phone-screen::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
      pointer-events: none;
      z-index: 9999;
      border-radius: 38px;
    }

    /* ── Status Bar ──────────────────────────────────────────────────── */
    .status-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 44px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 24px 8px;
      z-index: 100;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
    }

    /* Punch-hole camera cutout */
    .punch-hole {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: #000;
      border-radius: 50%;
      z-index: 101;
      box-shadow: 0 0 0 1px #222;
    }

    .status-time { font-size: 14px; font-weight: 700; }

    .status-icons {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── Android Nav Bar ─────────────────────────────────────────────── */
    .nav-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 48px;
      z-index: 100;
      background: rgba(0,0,0,0.3);
    }

    .nav-btn {
      color: rgba(255,255,255,0.7);
      font-size: 18px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.15s;
    }

    .nav-btn:active { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>

<div class="phone-chassis">
  <div class="phone-screen">

    <!-- Punch-hole camera -->
    <div class="punch-hole"></div>

    <!-- Status bar -->
    <div class="status-bar" id="statusBar">
      <span class="status-time" id="statusTime">9:41</span>
      <div class="status-icons">
        <span title="Signal">▲▲▲</span>
        <span title="WiFi">WiFi</span>
        <span title="Battery">100%</span>
      </div>
    </div>

    <!-- Screens go here in Task 2 -->

    <!-- Android nav bar -->
    <div class="nav-bar">
      <div class="nav-btn" id="navBack" title="Back">◁</div>
      <div class="nav-btn" id="navHome" title="Home">○</div>
      <div class="nav-btn" id="navRecents" title="Recents">□</div>
    </div>

  </div>
</div>

<script>
(function () {
  'use strict';

  // Live clock
  function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('statusTime');
    if (el) el.textContent = h + ':' + m;
  }
  updateClock();
  setInterval(updateClock, 10000);

  // Nav bar — home button returns to home screen (wired up in Task 2)
  document.getElementById('navHome').addEventListener('click', function () {
    if (window.phoneApp && window.phoneApp.goHome) window.phoneApp.goHome();
  });

  document.getElementById('navBack').addEventListener('click', function () {
    if (window.phoneApp && window.phoneApp.goBack) window.phoneApp.goBack();
  });

})();
</script>

</body>
</html>
```

**Step 2: Verify in browser**

Open `android_phone_simulator.html` directly in a browser (file://).

Expected:
- Dark page background (`#0a0a0f`)
- Black phone chassis centered, 393×852px, 44px rounded corners
- Volume buttons visible on left side as dark ridges
- Power button visible on right side
- Status bar visible with time (live clock) and icons
- Punch-hole camera cutout at top center
- Nav bar at bottom with ◁ ○ □

**Step 3: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add Android phone simulator scaffold with S25 Ultra chassis"
```

---

## Task 2: Screen State Machine + CSS Transitions

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add screen container CSS and screen state machine JS**

Add inside `<style>`:

```css
/* ── Screen Container ────────────────────────────────────────────── */
.screens-container {
  position: absolute;
  inset: 0;
  top: 44px;    /* below status bar */
  bottom: 36px; /* above nav bar */
  overflow: hidden;
}

/* Each screen fills the container */
.screen {
  position: absolute;
  inset: 0;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  will-change: transform;
}

/* Active screen slides in from right */
.screen.active {
  transform: translateX(0);
}

/* Previous screen slides out to left */
.screen.prev {
  transform: translateX(-30%);
}
```

Add screen HTML inside `.phone-screen`, between status bar and nav bar:

```html
<div class="screens-container">
  <div class="screen" id="screenHome"><!-- Task 3 --></div>
  <div class="screen" id="screenPhone"><!-- Task 4 --></div>
  <div class="screen" id="screenContacts"><!-- Task 5 --></div>
  <div class="screen" id="screenCalling"><!-- Task 6 --></div>
  <div class="screen" id="screenInCall"><!-- Task 7 --></div>
</div>
```

Add state machine JS (replace the placeholder script block content, keep the clock code):

```js
// ── State Machine ────────────────────────────────────────────────
const SCREENS = ['home', 'phone', 'contacts', 'calling', 'inCall'];
const SCREEN_IDS = {
  home: 'screenHome',
  phone: 'screenPhone',
  contacts: 'screenContacts',
  calling: 'screenCalling',
  inCall: 'screenInCall'
};

const appState = {
  screen: 'home',
  prevScreen: null,
  contact: null,
  config: null,
  demoProfile: null,
  transcriptEnabled: true,
  callActive: false
};

function navigateTo(screenKey, direction) {
  direction = direction || 'forward';
  const prevKey = appState.prevScreen;
  const prevEl = prevKey ? document.getElementById(SCREEN_IDS[prevKey]) : null;
  const nextEl = document.getElementById(SCREEN_IDS[screenKey]);

  // Remove all states
  Object.values(SCREEN_IDS).forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'prev');
  });

  if (prevEl && direction === 'forward') {
    prevEl.classList.add('prev');
    setTimeout(() => prevEl.classList.remove('prev'), 350);
  }

  nextEl.classList.add('active');
  appState.prevScreen = appState.screen;
  appState.screen = screenKey;
}

function goHome() {
  // Clear all screens, reset to home
  Object.values(SCREEN_IDS).forEach(id => {
    document.getElementById(id).classList.remove('active', 'prev');
  });
  document.getElementById('screenHome').classList.add('active');
  appState.screen = 'home';
  appState.prevScreen = null;
}

function goBack() {
  const backMap = {
    phone: 'home',
    contacts: 'phone',
    calling: 'contacts',
    inCall: 'contacts'
  };
  const dest = backMap[appState.screen];
  if (dest) navigateTo(dest, 'back');
}

// Expose for nav buttons
window.phoneApp = { goHome, goBack, navigateTo, appState };

// Start on home screen
goHome();
```

**Step 2: Verify in browser**

Open the file. Open browser console and run:
```js
window.phoneApp.navigateTo('phone')
```
Expected: screen slides in from the right (home slides left 30%, phone slides in from right).

Run:
```js
window.phoneApp.goBack()
```
Expected: phone slides out, home returns.

**Step 3: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add 5-screen state machine with CSS slide transitions"
```

---

## Task 3: Home Screen — App Grid, Clock, Wallpaper

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add home screen CSS**

```css
/* ── Home Screen ─────────────────────────────────────────────────── */
#screenHome {
  background: linear-gradient(160deg, #0d1b4b 0%, #1a0a3e 50%, #0d0d1a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px 0;
}

.home-clock {
  margin-top: 8px;
  text-align: center;
  color: #fff;
}

.home-clock-time {
  font-size: 64px;
  font-weight: 200;
  letter-spacing: -2px;
  line-height: 1;
}

.home-clock-date {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.8;
  margin-top: 4px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 4px;
  width: 100%;
  margin-top: 24px;
  padding: 0 8px;
}

.app-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 6px 2px;
  border-radius: 12px;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.app-icon:active { background: rgba(255,255,255,0.1); }

.app-icon-img {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.app-icon-label {
  font-size: 10px;
  color: rgba(255,255,255,0.9);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

/* Microsoft folder */
.app-folder .app-icon-img {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 3px;
  padding: 6px;
}

.app-folder .folder-mini {
  border-radius: 4px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Folder overlay */
.folder-overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(20px);
  z-index: 50;
  align-items: center;
  justify-content: center;
}

.folder-overlay.open { display: flex; }

.folder-panel {
  width: 280px;
  background: rgba(40,40,60,0.9);
  border-radius: 24px;
  padding: 20px 16px;
  backdrop-filter: blur(20px);
}

.folder-panel-title {
  color: #fff;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.folder-panel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
```

**Step 2: Add home screen HTML**

Replace `<!-- Task 3 -->` inside `#screenHome`:

```html
<!-- Home clock -->
<div class="home-clock">
  <div class="home-clock-time" id="homeClock">9:41</div>
  <div class="home-clock-date" id="homeDate">Thursday, March 5</div>
</div>

<!-- App grid -->
<div class="app-grid">
  <!-- Row 1 -->
  <div class="app-icon" data-app="phone" id="appPhone">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#34c759,#25a244)">📞</div>
    <span class="app-icon-label">Phone</span>
  </div>
  <div class="app-icon" data-app="messages">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#34c759,#20b050)">💬</div>
    <span class="app-icon-label">Messages</span>
  </div>
  <div class="app-icon" data-app="chrome">
    <div class="app-icon-img" style="background:#fff">🌐</div>
    <span class="app-icon-label">Chrome</span>
  </div>
  <div class="app-icon" data-app="camera">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#1c1c1e,#2c2c2e)">📷</div>
    <span class="app-icon-label">Camera</span>
  </div>

  <!-- Row 2 -->
  <div class="app-icon" data-app="gallery">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#ff6b6b,#ffa07a)">🖼</div>
    <span class="app-icon-label">Gallery</span>
  </div>
  <div class="app-icon" data-app="settings">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#636e72,#2d3436)">⚙️</div>
    <span class="app-icon-label">Settings</span>
  </div>
  <div class="app-icon" data-app="calendar">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#fff,#f0f0f0)">📅</div>
    <span class="app-icon-label">Calendar</span>
  </div>
  <div class="app-icon" data-app="maps">
    <div class="app-icon-img" style="background:linear-gradient(135deg,#4ecdc4,#44a39f)">🗺</div>
    <span class="app-icon-label">Maps</span>
  </div>

  <!-- Microsoft Folder -->
  <div class="app-icon app-folder" id="appMicrosoftFolder">
    <div class="app-icon-img">
      <div class="folder-mini" style="background:#0078d4">T</div>
      <div class="folder-mini" style="background:#0072c6">O</div>
      <div class="folder-mini" style="background:#0364b8">W</div>
      <div class="folder-mini" style="background:#217346">X</div>
    </div>
    <span class="app-icon-label">Microsoft</span>
  </div>
</div>

<!-- Microsoft folder overlay -->
<div class="folder-overlay" id="folderOverlay">
  <div class="folder-panel">
    <div class="folder-panel-title">Microsoft</div>
    <div class="folder-panel-grid">
      <div class="app-icon"><div class="app-icon-img" style="background:#0078d4;font-size:22px">T</div><span class="app-icon-label">Teams</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:#0072c6;font-size:22px">O</div><span class="app-icon-label">Outlook</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:#0364b8;font-size:20px">☁</div><span class="app-icon-label">OneDrive</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:#2b579a;font-size:22px">W</div><span class="app-icon-label">Word</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:#217346;font-size:22px">X</div><span class="app-icon-label">Excel</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:#b7472a;font-size:20px">P</div><span class="app-icon-label">PPT</span></div>
      <div class="app-icon"><div class="app-icon-img" style="background:linear-gradient(135deg,#0078d4,#40e0d0);font-size:20px">✦</div><span class="app-icon-label">Copilot</span></div>
    </div>
  </div>
</div>
```

**Step 3: Add home screen JS**

```js
// ── Home Screen ────────────────────────────────────────────────
function updateHomeDateTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const clockEl = document.getElementById('homeClock');
  const dateEl = document.getElementById('homeDate');
  if (clockEl) clockEl.textContent = h + ':' + m;
  if (dateEl) dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
}
updateHomeDateTime();
setInterval(updateHomeDateTime, 10000);

// Phone app tap → navigate
document.getElementById('appPhone').addEventListener('click', function () {
  navigateTo('phone');
  loadPhoneApp();
});

// Microsoft folder
document.getElementById('appMicrosoftFolder').addEventListener('click', function () {
  document.getElementById('folderOverlay').classList.add('open');
});
document.getElementById('folderOverlay').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('open');
});

// Wallpaper: long-press on home screen (500ms)
let wallpaperTimer = null;
const homeScreen = document.getElementById('screenHome');
const wallpapers = [
  'linear-gradient(160deg, #0d1b4b 0%, #1a0a3e 50%, #0d0d1a 100%)',
  'linear-gradient(160deg, #0a2e0a 0%, #1a3a1a 50%, #0d1a0d 100%)',
  'linear-gradient(160deg, #1a0a0a 0%, #2e0d0d 50%, #0a0a0a 100%)'
];
let wallpaperIndex = 0;

homeScreen.addEventListener('pointerdown', function () {
  wallpaperTimer = setTimeout(function () {
    wallpaperIndex = (wallpaperIndex + 1) % wallpapers.length;
    homeScreen.style.background = wallpapers[wallpaperIndex];
  }, 500);
});
homeScreen.addEventListener('pointerup', function () { clearTimeout(wallpaperTimer); });
homeScreen.addEventListener('pointerleave', function () { clearTimeout(wallpaperTimer); });
```

**Step 4: Verify in browser**

- Home screen shows large time + date
- 4-column app grid renders with colored icons and labels
- Tapping Microsoft folder opens overlay with 7 Microsoft app icons
- Tapping outside folder overlay closes it
- Long-pressing (500ms) on home screen cycles through 3 wallpaper gradients

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add home screen with app grid, clock, Microsoft folder, and wallpaper cycling"
```

---

## Task 4: Phone App Screen — Tabs (Recents, Contacts, Keypad)

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add Phone App CSS**

```css
/* ── Phone App Screen ────────────────────────────────────────────── */
#screenPhone {
  background: #1c1c1e;
  display: flex;
  flex-direction: column;
}

.phone-app-header {
  padding: 16px 20px 8px;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.phone-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 0 16px;
}

.phone-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.phone-tab.active {
  color: #4fc3f7;
  border-bottom-color: #4fc3f7;
}

.phone-tab-content {
  display: none;
  flex: 1;
  overflow-y: auto;
}

.phone-tab-content.active { display: flex; flex-direction: column; }

/* Recents placeholder */
.recents-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
  font-size: 14px;
  flex-direction: column;
  gap: 8px;
}

/* Keypad */
.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 24px 32px;
}

.keypad-key {
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  border: none;
}

.keypad-key:active { background: rgba(255,255,255,0.2); }
.keypad-key-digit { color: #fff; font-size: 24px; font-weight: 400; }
.keypad-key-letters { color: rgba(255,255,255,0.5); font-size: 9px; letter-spacing: 1px; }

.keypad-display {
  color: #fff;
  font-size: 28px;
  font-weight: 300;
  text-align: center;
  padding: 16px;
  min-height: 56px;
  letter-spacing: 4px;
}

.keypad-call-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #34c759;
  border: none;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 4px 16px rgba(52,199,89,0.4);
  transition: transform 0.1s;
}

.keypad-call-btn:active { transform: scale(0.95); }
```

**Step 2: Add Phone App HTML**

Replace `<!-- Task 4 -->` inside `#screenPhone`:

```html
<div class="phone-app-header">Phone</div>

<div class="phone-tabs">
  <div class="phone-tab" data-tab="recents">Recents</div>
  <div class="phone-tab active" data-tab="contacts">Contacts</div>
  <div class="phone-tab" data-tab="keypad">Keypad</div>
</div>

<!-- Recents -->
<div class="phone-tab-content" id="tabRecents">
  <div class="recents-empty">
    <span style="font-size:32px">📋</span>
    <span>No recent calls</span>
  </div>
</div>

<!-- Contacts (rendered in Task 5) -->
<div class="phone-tab-content active" id="tabContacts">
  <div style="color:rgba(255,255,255,0.3);padding:24px;text-align:center;font-size:13px">Loading contacts…</div>
</div>

<!-- Keypad -->
<div class="phone-tab-content" id="tabKeypad">
  <div class="keypad-display" id="keypadDisplay"></div>
  <div class="keypad-grid">
    <button class="keypad-key" data-digit="1"><span class="keypad-key-digit">1</span><span class="keypad-key-letters"></span></button>
    <button class="keypad-key" data-digit="2"><span class="keypad-key-digit">2</span><span class="keypad-key-letters">ABC</span></button>
    <button class="keypad-key" data-digit="3"><span class="keypad-key-digit">3</span><span class="keypad-key-letters">DEF</span></button>
    <button class="keypad-key" data-digit="4"><span class="keypad-key-digit">4</span><span class="keypad-key-letters">GHI</span></button>
    <button class="keypad-key" data-digit="5"><span class="keypad-key-digit">5</span><span class="keypad-key-letters">JKL</span></button>
    <button class="keypad-key" data-digit="6"><span class="keypad-key-digit">6</span><span class="keypad-key-letters">MNO</span></button>
    <button class="keypad-key" data-digit="7"><span class="keypad-key-digit">7</span><span class="keypad-key-letters">PQRS</span></button>
    <button class="keypad-key" data-digit="8"><span class="keypad-key-digit">8</span><span class="keypad-key-letters">TUV</span></button>
    <button class="keypad-key" data-digit="9"><span class="keypad-key-digit">9</span><span class="keypad-key-letters">WXYZ</span></button>
    <button class="keypad-key" data-digit="*"><span class="keypad-key-digit">*</span><span class="keypad-key-letters"></span></button>
    <button class="keypad-key" data-digit="0"><span class="keypad-key-digit">0</span><span class="keypad-key-letters">+</span></button>
    <button class="keypad-key" data-digit="#"><span class="keypad-key-digit">#</span><span class="keypad-key-letters"></span></button>
  </div>
  <button class="keypad-call-btn" id="keypadCallBtn">📞</button>
</div>
```

**Step 3: Add Phone App JS**

```js
// ── Phone App ──────────────────────────────────────────────────
function loadPhoneApp() {
  // Tab switching
  document.querySelectorAll('.phone-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.phone-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.phone-tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');
    });
  });

  // Keypad
  var keypadNumber = '';
  document.querySelectorAll('.keypad-key').forEach(function (key) {
    key.addEventListener('click', function () {
      keypadNumber += key.dataset.digit;
      document.getElementById('keypadDisplay').textContent = keypadNumber;
    });
  });
}
```

**Step 4: Verify in browser**

- Tap Phone icon on home screen → slides to Phone App screen
- Three tabs render: Recents (empty state), Contacts (loading), Keypad
- Tapping tabs switches content panels
- Tapping keypad buttons appends digits to display

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add Phone app screen with Recents/Contacts/Keypad tabs"
```

---

## Task 5: Contacts Screen — List, Avatars, Search

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add Contacts CSS**

```css
/* ── Contacts List ───────────────────────────────────────────────── */
.contact-search {
  margin: 8px 16px;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  color: #fff;
  font-size: 14px;
  width: calc(100% - 32px);
  outline: none;
}

.contact-search::placeholder { color: rgba(255,255,255,0.4); }

.contacts-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.contact-item:active { background: rgba(255,255,255,0.05); }

.contact-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contact-info { flex: 1; min-width: 0; }

.contact-name {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-phone {
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  margin-top: 2px;
}

.contact-call-icon {
  color: #4fc3f7;
  font-size: 18px;
  padding: 8px;
}

/* Transcript toggle row */
.transcript-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 4px;
}

.transcript-toggle-label { color: rgba(255,255,255,0.6); font-size: 12px; }

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider { background: #4fc3f7; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
```

**Step 2: Add Contacts HTML**

Replace `<!-- Task 5 -->` inside `#screenContacts`:

```html
<div style="background:#1c1c1e;display:flex;flex-direction:column;height:100%">
  <div style="padding:16px 20px 8px;color:#fff;font-size:22px;font-weight:700">Contacts</div>
  <input class="contact-search" id="contactSearch" type="text" placeholder="Search contacts…" />
  <div class="transcript-toggle-row">
    <span class="transcript-toggle-label">Play transcript on connect</span>
    <label class="toggle-switch">
      <input type="checkbox" id="transcriptToggleContacts" checked />
      <span class="toggle-slider"></span>
    </label>
  </div>
  <div class="contacts-list" id="contactsList"></div>
</div>
```

**Step 3: Add Contacts JS (embedded fallback + Dataverse loading + rendering)**

```js
// ── Fallback contact data (standalone mode) ────────────────────
var FALLBACK_CONTACTS = [
  { contactid: 'c1', fullname: 'Jamie Carter',    telephone1: '888-463-6332', initials: 'JC', color: '#e74c3c' },
  { contactid: 'c2', fullname: 'Robert Martinez', telephone1: '800-827-1000', initials: 'RM', color: '#2ecc71' },
  { contactid: 'c3', fullname: 'Sarah Johnson',   telephone1: '877-555-0199', initials: 'SJ', color: '#3498db' }
];

var allContacts = [];

function getInitialsColor(name) {
  var colors = ['#e74c3c','#2ecc71','#3498db','#9b59b6','#e67e22','#1abc9c','#e91e63','#ff5722'];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
}

function renderContactAvatar(contact) {
  if (contact.entityimage_thumbnail) {
    return '<img src="data:image/jpeg;base64,' + contact.entityimage_thumbnail + '" alt="" />';
  }
  var color = contact.color || getInitialsColor(contact.fullname);
  var initials = contact.initials || getInitials(contact.fullname);
  return '<span style="background:' + color + ';width:100%;height:100%;display:flex;align-items:center;justify-content:center">' + initials + '</span>';
}

function renderContactsList(contacts) {
  var list = document.getElementById('contactsList');
  if (!contacts.length) {
    list.innerHTML = '<div style="color:rgba(255,255,255,0.3);padding:24px;text-align:center;font-size:13px">No contacts found</div>';
    return;
  }
  list.innerHTML = contacts.map(function (c) {
    return '<div class="contact-item" data-contactid="' + c.contactid + '">' +
      '<div class="contact-avatar">' + renderContactAvatar(c) + '</div>' +
      '<div class="contact-info">' +
        '<div class="contact-name">' + c.fullname + '</div>' +
        '<div class="contact-phone">' + (c.telephone1 || '') + '</div>' +
      '</div>' +
      '<span class="contact-call-icon">📞</span>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.contact-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var contact = allContacts.find(function (c) { return c.contactid === item.dataset.contactid; });
      if (contact) startOutgoingCall(contact);
    });
  });
}

function loadContacts() {
  // Transcript toggle wiring
  var transcriptToggle = document.getElementById('transcriptToggleContacts');
  if (transcriptToggle) {
    transcriptToggle.checked = appState.transcriptEnabled;
    transcriptToggle.addEventListener('change', function () {
      appState.transcriptEnabled = this.checked;
    });
  }

  // Search wiring
  document.getElementById('contactSearch').addEventListener('input', function () {
    var q = this.value.toLowerCase();
    var filtered = allContacts.filter(function (c) {
      return c.fullname.toLowerCase().includes(q) || (c.telephone1 || '').includes(q);
    });
    renderContactsList(filtered);
  });

  // Load from Dataverse or fallback
  ensureXrm();
  if (window.Xrm && Xrm.WebApi) {
    var query = '?$select=contactid,fullname,telephone1,entityimage_thumbnail&$orderby=fullname asc&$top=50';
    Xrm.WebApi.retrieveMultipleRecords('contact', query)
      .then(function (result) {
        allContacts = result.entities || FALLBACK_CONTACTS;
        renderContactsList(allContacts);
      })
      .catch(function () {
        allContacts = FALLBACK_CONTACTS;
        renderContactsList(allContacts);
      });
  } else {
    allContacts = FALLBACK_CONTACTS;
    renderContactsList(allContacts);
  }
}

// Wire Phone app Contacts tab to load contacts when opened
// (called from tab switching in loadPhoneApp — update the tab click handler)
// Also wire navigateTo('contacts') to loadContacts
```

Update the `appPhone` click handler to also load contacts:
```js
document.getElementById('appPhone').addEventListener('click', function () {
  navigateTo('phone');
  loadPhoneApp();
  loadContacts();  // add this line
});
```

**Step 4: Verify in browser**

- Open Phone app → Contacts tab
- 3 fallback contacts render with colored initials avatars
- Typing in search box filters the list in real-time
- Transcript toggle checkbox is visible and toggles `appState.transcriptEnabled`
- Tapping a contact (calls `startOutgoingCall` — wired in Task 6)

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add contacts screen with avatars, search, and transcript toggle"
```

---

## Task 6: Calling Screen — Animation, Ringback Tone, Auto-Connect

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add Calling Screen CSS**

```css
/* ── Calling Screen ──────────────────────────────────────────────── */
#screenCalling {
  background: linear-gradient(180deg, #0d1b3e 0%, #1a1a2e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
}

.calling-contact-name {
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 4px;
}

.calling-status {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  margin-bottom: 40px;
}

.calling-avatar-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 48px;
}

.calling-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.calling-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* Pulsing rings */
.pulse-ring {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 2px solid rgba(79,195,247,0.4);
  animation: pulse-out 2s ease-out infinite;
}

.pulse-ring:nth-child(2) { animation-delay: 0.66s; }
.pulse-ring:nth-child(3) { animation-delay: 1.33s; }

@keyframes pulse-out {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

.calling-end-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ff3b30;
  border: none;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,59,48,0.4);
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calling-end-btn:active { transform: scale(0.95); }
```

**Step 2: Add Calling Screen HTML**

Replace `<!-- Task 6 -->` inside `#screenCalling`:

```html
<div class="calling-contact-name" id="callingName">Unknown</div>
<div class="calling-status" id="callingStatus">Calling…</div>

<div class="calling-avatar-wrap">
  <div class="pulse-ring"></div>
  <div class="pulse-ring"></div>
  <div class="pulse-ring"></div>
  <div class="calling-avatar" id="callingAvatar"></div>
</div>

<button class="calling-end-btn" id="callingEndBtn">📵</button>
```

**Step 3: Add Calling Screen JS**

```js
// ── Ringback Tone ───────────────────────────────────────────────
var ringbackAudio = null;
var connectTimer = null;

function startRingback(url) {
  stopRingback();
  if (url) {
    ringbackAudio = new Audio(url);
    ringbackAudio.loop = true;
    ringbackAudio.play().catch(function () {});
  }
}

function stopRingback() {
  if (ringbackAudio) { ringbackAudio.pause(); ringbackAudio = null; }
  clearTimeout(connectTimer);
}

// ── Start Outgoing Call ─────────────────────────────────────────
function startOutgoingCall(contact) {
  appState.contact = contact;
  navigateTo('calling');

  // Populate calling screen
  document.getElementById('callingName').textContent = contact.fullname;
  document.getElementById('callingStatus').textContent = 'Calling…';

  var avatarEl = document.getElementById('callingAvatar');
  avatarEl.innerHTML = renderContactAvatar(contact);
  avatarEl.style.background = contact.color || getInitialsColor(contact.fullname);

  // Ringback tone
  var ringtoneUrl = appState.config && appState.config.outgoingRingtoneUrl;
  startRingback(ringtoneUrl);

  // Auto-connect after 3 seconds
  connectTimer = setTimeout(function () {
    stopRingback();
    connectCall(contact);
  }, 3000);
}

document.getElementById('callingEndBtn').addEventListener('click', function () {
  stopRingback();
  goHome();
});
```

**Step 4: Verify in browser**

- Tap any contact → Calling screen shows contact name, "Calling…", pulsing rings around initials avatar
- After 3 seconds → transitions to In-call screen (wired in Task 7)
- Tapping the red end button → returns to home screen
- No audio errors in console (ringback gracefully skipped when no URL)

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add Calling screen with pulse animation, ringback tone, and auto-connect"
```

---

## Task 7: In-Call Screen — Payload Write, Transcript, Controls

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add In-Call CSS**

```css
/* ── In-Call Screen ──────────────────────────────────────────────── */
#screenInCall {
  background: #1c1c1e;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.incall-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.incall-name {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.incall-duration {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  margin-top: 2px;
}

.incall-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.incall-avatar img { width: 100%; height: 100%; object-fit: cover; }

.transcript-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transcript-line {
  animation: fadeSlideIn 0.3s ease;
  line-height: 1.5;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.transcript-line.agent {
  color: #4fc3f7;
  font-size: 13px;
}

.transcript-line.customer {
  color: rgba(255,255,255,0.85);
  font-size: 13px;
}

.transcript-line .speaker {
  font-weight: 600;
  font-size: 11px;
  opacity: 0.7;
  display: block;
  margin-bottom: 2px;
}

.transcript-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.2);
  font-size: 13px;
}

.incall-controls {
  padding: 12px 16px 8px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.incall-controls-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12px;
}

.incall-ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: background 0.15s;
  border: none;
  background: transparent;
}

.incall-ctrl-btn:active { background: rgba(255,255,255,0.1); }

.incall-ctrl-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.incall-ctrl-icon.active { background: #4fc3f7; }
.incall-ctrl-label { color: rgba(255,255,255,0.6); font-size: 10px; }

.incall-end-row {
  display: flex;
  justify-content: center;
}

.incall-end-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ff3b30;
  border: none;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,59,48,0.4);
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.incall-end-btn:active { transform: scale(0.95); }
```

**Step 2: Add In-Call HTML**

Replace `<!-- Task 7 -->` inside `#screenInCall`:

```html
<div class="incall-header">
  <div class="incall-avatar" id="incallAvatar"></div>
  <div class="incall-name" id="incallName">Unknown</div>
  <div class="incall-duration" id="incallDuration">Connected</div>
</div>

<div class="transcript-panel" id="transcriptPanel">
  <div class="transcript-empty" id="transcriptEmpty">Transcript disabled</div>
</div>

<div class="incall-controls">
  <div class="incall-controls-row">
    <button class="incall-ctrl-btn" id="btnMute">
      <div class="incall-ctrl-icon" id="muteIcon">🎤</div>
      <span class="incall-ctrl-label">Mute</span>
    </button>
    <button class="incall-ctrl-btn" id="btnTranscript">
      <div class="incall-ctrl-icon" id="transcriptIcon">📝</div>
      <span class="incall-ctrl-label">Transcript</span>
    </button>
    <button class="incall-ctrl-btn" id="btnSkip">
      <div class="incall-ctrl-icon">⏭</div>
      <span class="incall-ctrl-label">Skip</span>
    </button>
    <button class="incall-ctrl-btn" id="btnSpeaker">
      <div class="incall-ctrl-icon">🔊</div>
      <span class="incall-ctrl-label">Speaker</span>
    </button>
  </div>
  <div class="incall-end-row">
    <button class="incall-end-btn" id="incallEndBtn">📵</button>
  </div>
</div>
```

**Step 3: Add In-Call JS (payload write + transcript playback)**

```js
// ── localStorage payload write ──────────────────────────────────
var STORAGE_KEY = 'genericSimCall';

function writeCallPayload(contact) {
  var cfg = appState.config || {};
  var profile = appState.demoProfile || {};
  var call = {
    callerName:                contact.fullname,
    queueName:                 profile.queueName  || cfg.queueName  || '',
    phoneNumber:               contact.telephone1 || '',
    contactId:                 contact.contactid  || null,
    state:                     'CONNECTED',
    startTime:                 new Date().toISOString(),
    ringtoneUrl:               '',
    muteRingtone:              false,
    popMode:                   cfg.popMode,
    defaultCaseTitle:          profile.caseTitle  || cfg.defaultCaseTitle || '',
    transcriptEnabled:         appState.transcriptEnabled,
    transcriptText:            profile.transcript || cfg.transcriptText || '',
    transcriptIntervalSeconds: cfg.transcriptIntervalSeconds || 3,
    softphoneConfigId:         cfg.id || null
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(call));
}

// ── Transcript Playback ─────────────────────────────────────────
var transcriptTimer = null;
var transcriptLines = [];
var transcriptIndex = 0;

function parseTranscriptLines(text) {
  return (text || '').split(/\n{2,}/).map(function (block) {
    block = block.trim();
    if (!block) return null;
    var isAgent = /^Agent:/i.test(block);
    var isCustomer = /^Customer:/i.test(block);
    return {
      text: block.replace(/^(Agent|Customer):\s*/i, ''),
      speaker: isAgent ? 'Agent' : isCustomer ? 'Customer' : 'Agent',
      type: isAgent ? 'agent' : 'customer'
    };
  }).filter(Boolean);
}

function showNextTranscriptLine() {
  if (!appState.transcriptEnabled) return;
  if (transcriptIndex >= transcriptLines.length) return;

  var line = transcriptLines[transcriptIndex++];
  var panel = document.getElementById('transcriptPanel');
  var empty = document.getElementById('transcriptEmpty');
  if (empty) empty.style.display = 'none';

  var div = document.createElement('div');
  div.className = 'transcript-line ' + line.type;
  div.innerHTML = '<span class="speaker">' + line.speaker + '</span>' + line.text;
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;

  var cfg = appState.config || {};
  var interval = ((cfg.transcriptIntervalSeconds || 3) * 1000);
  if (transcriptIndex < transcriptLines.length) {
    transcriptTimer = setTimeout(showNextTranscriptLine, interval);
  }
}

function skipTranscript() {
  clearTimeout(transcriptTimer);
  var panel = document.getElementById('transcriptPanel');
  var empty = document.getElementById('transcriptEmpty');
  if (empty) empty.style.display = 'none';
  panel.innerHTML = '';
  transcriptLines.forEach(function (line) {
    var div = document.createElement('div');
    div.className = 'transcript-line ' + line.type;
    div.innerHTML = '<span class="speaker">' + line.speaker + '</span>' + line.text;
    panel.appendChild(div);
  });
  panel.scrollTop = panel.scrollHeight;
  transcriptIndex = transcriptLines.length;
}

function stopTranscript() {
  clearTimeout(transcriptTimer);
  transcriptLines = [];
  transcriptIndex = 0;
}

// ── connectCall (called from Task 6 after 3s) ──────────────────
var callDurationTimer = null;
var callSeconds = 0;
var mutedState = false;

function connectCall(contact) {
  navigateTo('inCall');

  // Populate header
  document.getElementById('incallName').textContent = contact.fullname;
  var avatarEl = document.getElementById('incallAvatar');
  avatarEl.innerHTML = renderContactAvatar(contact);
  avatarEl.style.background = contact.color || getInitialsColor(contact.fullname);

  // Write localStorage payload
  writeCallPayload(contact);

  // Duration timer
  callSeconds = 0;
  callDurationTimer = setInterval(function () {
    callSeconds++;
    var m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
    var s = (callSeconds % 60).toString().padStart(2, '0');
    document.getElementById('incallDuration').textContent = m + ':' + s;
  }, 1000);

  // Transcript
  var cfg = appState.config || {};
  var profile = appState.demoProfile || {};
  var transcriptText = profile.transcript || cfg.transcriptText || '';
  transcriptLines = parseTranscriptLines(transcriptText);
  transcriptIndex = 0;
  document.getElementById('transcriptPanel').innerHTML = '';
  var emptyEl = document.createElement('div');
  emptyEl.className = 'transcript-empty';
  emptyEl.id = 'transcriptEmpty';
  emptyEl.textContent = 'Transcript disabled';
  document.getElementById('transcriptPanel').appendChild(emptyEl);

  if (appState.transcriptEnabled && transcriptLines.length) {
    emptyEl.style.display = 'none';
    var cfg2 = appState.config || {};
    transcriptTimer = setTimeout(showNextTranscriptLine, (cfg2.transcriptIntervalSeconds || 3) * 1000);
  }
}

// ── In-call controls ────────────────────────────────────────────
document.getElementById('incallEndBtn').addEventListener('click', endCall);

document.getElementById('btnMute').addEventListener('click', function () {
  mutedState = !mutedState;
  document.getElementById('muteIcon').classList.toggle('active', mutedState);
  document.getElementById('muteIcon').textContent = mutedState ? '🔇' : '🎤';
});

document.getElementById('btnTranscript').addEventListener('click', function () {
  appState.transcriptEnabled = !appState.transcriptEnabled;
  document.getElementById('transcriptIcon').classList.toggle('active', appState.transcriptEnabled);
  var panel = document.getElementById('transcriptPanel');
  panel.style.display = appState.transcriptEnabled ? '' : 'none';
  if (appState.transcriptEnabled && transcriptIndex < transcriptLines.length) {
    var cfg = appState.config || {};
    transcriptTimer = setTimeout(showNextTranscriptLine, (cfg.transcriptIntervalSeconds || 3) * 1000);
  } else {
    clearTimeout(transcriptTimer);
  }
});

document.getElementById('btnSkip').addEventListener('click', skipTranscript);

function endCall() {
  stopTranscript();
  clearInterval(callDurationTimer);
  stopRingback();
  localStorage.removeItem(STORAGE_KEY);
  appState.callActive = false;
  goHome();
}
```

**Step 4: Verify in browser**

- After 3-second calling delay → In-call screen shows contact name, running timer, and transcript lines appearing one-by-one
- Open browser DevTools → Application → localStorage → confirm `genericSimCall` key exists with `state: "CONNECTED"` and correct contact data
- Transcript toggle button hides/shows the transcript panel
- Skip button reveals full transcript immediately
- End call button → clears localStorage, returns to home
- Open `Genesys Softphone.html` in another tab same browser → confirm it receives the call when `genericSimCall` is written

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add in-call screen with localStorage payload, transcript playback, and call controls"
```

---

## Task 8: Dual-Mode Data Loading (Dataverse + Fallback Config)

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add embedded fallback config and Xrm detection**

Add this JS near the top of the script, before all other code:

```js
// ── Mode Detection ───────────────────────────────────────────────
function ensureXrm() {
  if (typeof Xrm !== 'undefined' && Xrm) return;
  var w = window;
  for (var i = 0; i < 10 && w; i++) {
    try { if (w.Xrm) { window.Xrm = w.Xrm; return; } } catch (e) {}
    if (!w.parent || w.parent === w) break;
    w = w.parent;
  }
  try { if (window.top && window.top.Xrm) window.Xrm = window.top.Xrm; } catch (e) {}
}

// ── Fallback config (standalone mode) ───────────────────────────
var FALLBACK_CONFIG = {
  id: null,
  queueName: 'Support',
  ringtoneUrl: '',
  muteRingtone: false,
  popMode: 687940000,
  defaultCaseTitle: 'Support Inquiry',
  transcriptEnabled: true,
  transcriptText: '',
  transcriptIntervalSeconds: 3,
  outgoingRingtoneUrl: '',
  phonewallpaperUrl: ''
};

// ── Load softphone config ────────────────────────────────────────
function loadSoftphoneConfig(callback) {
  ensureXrm();
  if (!window.Xrm || !Xrm.WebApi) {
    appState.config = FALLBACK_CONFIG;
    if (callback) callback(appState.config);
    return;
  }

  var selectCols =
    'gensoft_genericsoftphoneid,' +
    'gensoft_queuename,' +
    'gensoft_ringtoneurl,' +
    'gensoft_muteringtone,' +
    'gensoft_popmode,' +
    'gensoft_defaultcasetitle,' +
    'gensoft_transcriptenabled,' +
    'gensoft_transcripttext,' +
    'gensoft_transcriptplaybackintervalseconds,' +
    'gensoft_outgoingringtoneurl,' +
    'gensoft_phonewallpaperurl,' +
    'gensoft_defaultsoftphoneconfig';

  var defaultQuery = '?$select=' + selectCols + '&$filter=gensoft_defaultsoftphoneconfig eq true&$orderby=createdon desc&$top=1';

  Xrm.WebApi.retrieveMultipleRecords('gensoft_genericsoftphone', defaultQuery)
    .then(function (result) {
      var rec = (result.entities && result.entities[0]) || null;
      if (!rec) {
        return Xrm.WebApi.retrieveMultipleRecords('gensoft_genericsoftphone', '?$select=' + selectCols + '&$orderby=createdon desc&$top=1')
          .then(function (fallback) { return (fallback.entities && fallback.entities[0]) || null; });
      }
      return rec;
    })
    .then(function (rec) {
      if (!rec) { appState.config = FALLBACK_CONFIG; if (callback) callback(appState.config); return; }
      appState.config = {
        id: rec.gensoft_genericsoftphoneid,
        queueName: rec.gensoft_queuename || '',
        ringtoneUrl: rec.gensoft_ringtoneurl || '',
        muteRingtone: rec.gensoft_muteringtone === true,
        popMode: rec.gensoft_popmode,
        defaultCaseTitle: rec.gensoft_defaultcasetitle || '',
        transcriptEnabled: rec.gensoft_transcriptenabled === true,
        transcriptText: rec.gensoft_transcripttext || '',
        transcriptIntervalSeconds: rec.gensoft_transcriptplaybackintervalseconds || 3,
        outgoingRingtoneUrl: rec.gensoft_outgoingringtoneurl || '',
        phonewallpaperUrl: rec.gensoft_phonewallpaperurl || ''
      };
      applyWallpaperFromConfig();
      if (callback) callback(appState.config);
    })
    .catch(function () {
      appState.config = FALLBACK_CONFIG;
      if (callback) callback(appState.config);
    });
}

function applyWallpaperFromConfig() {
  var url = appState.config && appState.config.phonewallpaperUrl;
  if (url) {
    document.getElementById('screenHome').style.background = 'url(' + url + ') center/cover no-repeat';
  }
}

// ── Init on page load ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadSoftphoneConfig(function () {
    appState.transcriptEnabled = appState.config.transcriptEnabled;
    var toggle = document.getElementById('transcriptToggleContacts');
    if (toggle) toggle.checked = appState.transcriptEnabled;
  });
  goHome();
});
```

**Step 2: Verify in browser (standalone)**

Open file:// directly. In console:
```js
console.log(window.appState.config)
```
Expected: `FALLBACK_CONFIG` object with `queueName: "Support"`.

**Step 3: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add dual-mode data loading with Dataverse and embedded fallback config"
```

---

## Task 9: Demo Control Panel (CTRL+SHIFT+D)

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Add Demo Panel CSS**

```css
/* ── Demo Control Panel ──────────────────────────────────────────── */
.demo-panel-overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 200;
  align-items: flex-end;
  justify-content: center;
  border-radius: 38px;
}

.demo-panel-overlay.open { display: flex; }

.demo-panel {
  width: 100%;
  background: #2c2c2e;
  border-radius: 24px 24px 0 0;
  padding: 16px;
  max-height: 75%;
  overflow-y: auto;
}

.demo-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.demo-panel-title {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.demo-panel-close {
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 20px;
  padding: 4px 8px;
}

.demo-field { margin-bottom: 12px; }

.demo-label {
  display: block;
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.demo-select, .demo-input {
  width: 100%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
}

.demo-select option { background: #2c2c2e; }

.demo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.demo-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.demo-btn {
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.demo-btn:active { opacity: 0.7; }
.demo-btn.start  { background: #34c759; color: #fff; }
.demo-btn.end    { background: #ff3b30; color: #fff; }
.demo-btn.skip   { background: #4fc3f7; color: #fff; }
.demo-btn.neutral { background: rgba(255,255,255,0.1); color: #fff; }

.demo-profile-info {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
}
```

**Step 2: Add Demo Panel HTML**

Add inside `.phone-screen` (after the screens container, before nav bar):

```html
<!-- Demo Control Panel -->
<div class="demo-panel-overlay" id="demoPanelOverlay">
  <div class="demo-panel">
    <div class="demo-panel-header">
      <span class="demo-panel-title">Demo Control Panel</span>
      <span class="demo-panel-close" id="demoPanelClose">✕</span>
    </div>

    <div class="demo-field">
      <label class="demo-label">Demo Profile</label>
      <select class="demo-select" id="demoProfileSelect">
        <option value="">— Select profile —</option>
      </select>
    </div>

    <div class="demo-profile-info" id="demoProfileInfo" style="display:none"></div>

    <div class="demo-row">
      <span class="demo-label" style="margin:0">Transcript</span>
      <label class="toggle-switch">
        <input type="checkbox" id="demoTranscriptToggle" checked />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="demo-field">
      <label class="demo-label">Interval (seconds)</label>
      <input class="demo-input" id="demoIntervalInput" type="number" min="1" max="30" value="3" />
    </div>

    <div class="demo-btn-row">
      <button class="demo-btn start" id="demoStartBtn">▶ Start Call</button>
      <button class="demo-btn end"   id="demoEndBtn">⏹ End Call</button>
    </div>
    <div class="demo-btn-row" style="margin-top:8px">
      <button class="demo-btn skip neutral" id="demoSkipBtn">⏭ Skip Transcript</button>
    </div>
  </div>
</div>
```

**Step 3: Add Demo Panel JS**

```js
// ── Embedded demo profiles (standalone fallback) ─────────────────
var FALLBACK_DEMO_PROFILES = [
  {
    id: 'p1', name: 'FDA Recall Inquiry',
    contactName: 'Jamie Carter', phone: '888-463-6332', contactId: 'c1',
    queueName: 'FDA Safety Information', caseTitle: 'Robitussin Recall Inquiry',
    transcript: 'Customer: hi - i have this robitussin cough medicine. i saw something about a recall.\n\nAgent: Active recalls have been issued for certain Robitussin Honey CF Max products due to microbial contamination.\n\nCustomer: mine is the childrens version.\n\nAgent: A recall was issued for certain lots of Children\'s Robitussin Honey Cough and Chest Congestion DM due to incorrect dosing cups.\n\nCustomer: my dosing cup is missing the marks. can i still use the medicine?\n\nAgent: If your dosing cup is missing the markings, do not use it to measure the medication. Please contact the manufacturer for a replacement or consult a pharmacist for safe dosing instructions.'
  },
  {
    id: 'p2', name: 'Veteran Benefits Inquiry',
    contactName: 'Robert Martinez', phone: '800-827-1000', contactId: 'c2',
    queueName: 'VA Benefits Assistance', caseTitle: 'VA Claim Status Inquiry',
    transcript: 'Customer: hello i am checking the status of my disability claim.\n\nAgent: I can help with that. May I confirm your name and date of birth?\n\nCustomer: yes it is robert martinez.\n\nAgent: Thank you. I see your claim is currently in evidence review.\n\nCustomer: how long will that take?\n\nAgent: Evidence review typically takes several weeks depending on documentation received.'
  },
  {
    id: 'p3', name: 'Insurance Coverage Inquiry',
    contactName: 'Sarah Johnson', phone: '877-555-0199', contactId: 'c3',
    queueName: 'Coverage Support', caseTitle: 'Insurance Coverage Verification',
    transcript: 'Customer: hi i want to confirm if my medication is covered.\n\nAgent: I can help with that. Can you provide the medication name?\n\nCustomer: it is robaxin.\n\nAgent: Let me check your policy. Yes, that medication is covered under your plan.'
  }
];

var demoProfiles = [];

function loadDemoProfiles(callback) {
  ensureXrm();
  if (!window.Xrm || !Xrm.WebApi) {
    demoProfiles = FALLBACK_DEMO_PROFILES;
    if (callback) callback();
    return;
  }
  var query = '?$select=gensoft_demoprofileid,gensoft_profilename,gensoft_contactname,gensoft_phonenumber,gensoft_queuename,gensoft_casetitle,gensoft_transcript,gensoft_transcriptinterval&$orderby=gensoft_profilename asc';
  Xrm.WebApi.retrieveMultipleRecords('gensoft_demo_profile', query)
    .then(function (result) {
      if (result.entities && result.entities.length) {
        demoProfiles = result.entities.map(function (e) {
          return {
            id: e.gensoft_demoprofileid,
            name: e.gensoft_profilename || '',
            contactName: e.gensoft_contactname || '',
            phone: e.gensoft_phonenumber || '',
            queueName: e.gensoft_queuename || '',
            caseTitle: e.gensoft_casetitle || '',
            transcript: e.gensoft_transcript || ''
          };
        });
      } else {
        demoProfiles = FALLBACK_DEMO_PROFILES;
      }
      if (callback) callback();
    })
    .catch(function () {
      demoProfiles = FALLBACK_DEMO_PROFILES;
      if (callback) callback();
    });
}

function populateDemoProfileSelect() {
  var sel = document.getElementById('demoProfileSelect');
  sel.innerHTML = '<option value="">— Select profile —</option>';
  demoProfiles.forEach(function (p) {
    var opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function openDemoPanel() {
  loadDemoProfiles(function () {
    populateDemoProfileSelect();
    document.getElementById('demoPanelOverlay').classList.add('open');
  });
}

function closeDemoPanel() {
  document.getElementById('demoPanelOverlay').classList.remove('open');
}

// Profile selection → show info + apply to appState
document.getElementById('demoProfileSelect').addEventListener('change', function () {
  var profile = demoProfiles.find(function (p) { return p.id === this.value; }, this);
  var infoEl = document.getElementById('demoProfileInfo');
  if (!profile) { infoEl.style.display = 'none'; appState.demoProfile = null; return; }
  appState.demoProfile = profile;
  infoEl.style.display = '';
  infoEl.innerHTML = '<strong>' + profile.contactName + '</strong> · ' + profile.phone + '<br>' + profile.queueName;
});

// Transcript toggle in demo panel
document.getElementById('demoTranscriptToggle').addEventListener('change', function () {
  appState.transcriptEnabled = this.checked;
  var otherToggle = document.getElementById('transcriptToggleContacts');
  if (otherToggle) otherToggle.checked = this.checked;
});

// Interval override
document.getElementById('demoIntervalInput').addEventListener('change', function () {
  if (appState.config) appState.config.transcriptIntervalSeconds = parseInt(this.value) || 3;
});

// Start call from demo panel
document.getElementById('demoStartBtn').addEventListener('click', function () {
  var profile = appState.demoProfile;
  if (!profile) { alert('Select a demo profile first.'); return; }
  closeDemoPanel();
  var contact = {
    contactid: profile.contactId || profile.id,
    fullname: profile.contactName,
    telephone1: profile.phone
  };
  startOutgoingCall(contact);
});

// End call from demo panel
document.getElementById('demoEndBtn').addEventListener('click', function () {
  closeDemoPanel();
  endCall();
});

// Skip from demo panel
document.getElementById('demoSkipBtn').addEventListener('click', function () {
  skipTranscript();
});

document.getElementById('demoPanelClose').addEventListener('click', closeDemoPanel);

// CTRL+SHIFT+D keyboard shortcut
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    e.preventDefault();
    if (document.getElementById('demoPanelOverlay').classList.contains('open')) {
      closeDemoPanel();
    } else {
      openDemoPanel();
    }
  }
});
```

**Step 4: Verify in browser**

- Press CTRL+SHIFT+D → demo panel slides up from bottom of phone
- Profile dropdown lists 3 fallback profiles (or Dataverse profiles in D365)
- Selecting a profile shows contact name + queue in info box
- "Start Call" button → closes panel, places call with profile contact
- "End Call" button → ends active call, returns to home
- Transcript toggle + interval field update `appState`
- Press CTRL+SHIFT+D again → closes panel

**Step 5: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: add demo control panel with CTRL+SHIFT+D shortcut and profile selection"
```

---

## Task 10: Final Polish — Status Bar Icons, Google Fonts Fallback, Component Header Validation

**Files:**
- Modify: `SidecarItems/Genesys Softphone/android_phone_simulator.html`

**Step 1: Replace text status bar icons with SVG inline icons**

Replace the status bar HTML:

```html
<div class="status-bar" id="statusBar">
  <span class="status-time" id="statusTime">9:41</span>
  <div class="status-icons">
    <svg width="16" height="12" viewBox="0 0 16 12" fill="white" opacity="0.9">
      <rect x="0" y="6" width="3" height="6" rx="1"/>
      <rect x="4" y="4" width="3" height="8" rx="1"/>
      <rect x="8" y="2" width="3" height="10" rx="1"/>
      <rect x="12" y="0" width="3" height="12" rx="1"/>
    </svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="white" opacity="0.9">
      <path d="M8 3C5.2 3 2.7 4.2 1 6.2L0 5C1.9 2.7 4.8 1 8 1s6.1 1.7 8 5l-1 1.2C13.3 4.2 10.8 3 8 3z"/>
      <path d="M8 6c-1.7 0-3.2.7-4.3 1.8L3 7c1.3-1.5 3.1-2 5-2s3.7.5 5 2l-.7.8C11.2 6.7 9.7 6 8 6z"/>
      <circle cx="8" cy="10" r="1.5"/>
    </svg>
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" opacity="0.9">
      <rect x="0" y="1" width="20" height="10" rx="2" stroke="white" stroke-width="1.2"/>
      <rect x="1.5" y="2.5" width="15" height="7" rx="1" fill="white"/>
      <path d="M21.5 4.5v3a1.5 1.5 0 000-3z" fill="white" opacity="0.5"/>
    </svg>
  </div>
</div>
```

**Step 2: Add `@font-face` fallback for Inter (in case Google Fonts CDN is blocked)**

At the top of `<style>`, before the `@import`:

```css
/* System font fallback — Inter loads from CDN if available */
```

Change the font-family declaration throughout to:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Step 3: Final end-to-end browser test**

Open `android_phone_simulator.html` as `file://`:

| Test | Expected |
|---|---|
| Page loads | Phone chassis centered, no console errors |
| Clock | Shows current time, updates |
| Home screen | App grid renders, wallpaper gradient |
| Phone tap | Slides to Phone app |
| Contacts tab | 3 fallback contacts with avatars |
| Tap contact | Calling screen with pulse animation |
| After 3s | In-call screen, `genericSimCall` in localStorage |
| Transcript | Lines appear one-by-one |
| Transcript toggle | Hides/shows panel |
| Skip | Full transcript revealed |
| End call | localStorage cleared, home screen |
| CTRL+SHIFT+D | Demo panel opens |
| Demo profile → Start | Places call with profile data |
| Open `Genesys Softphone.html` in same browser | Receives and renders the call |

**Step 4: Commit**

```bash
git add "SidecarItems/Genesys Softphone/android_phone_simulator.html"
git commit -m "feat: complete Android phone simulator v1.0.0 — S25 Ultra UI, dual-mode, demo panel"
```

---

## Summary

| Task | Output |
|---|---|
| 1 | File scaffold + S25 Ultra chassis |
| 2 | 5-screen state machine + CSS transitions |
| 3 | Home screen — clock, app grid, folder, wallpaper |
| 4 | Phone app — tabs, keypad |
| 5 | Contacts — list, avatars, search, transcript toggle |
| 6 | Calling screen — animation, ringback, auto-connect |
| 7 | In-call — payload write, transcript, controls |
| 8 | Dual-mode data loading (Dataverse + fallback) |
| 9 | Demo control panel (CTRL+SHIFT+D) |
| 10 | Final polish + end-to-end test |

**localStorage key:** `genericSimCall` (never changes)
**Payload state:** `CONNECTED` (not `RINGING`)
**Do not modify:** `Genesys Softphone.html`, `sidebar_generic_call_simulator.html`
