# 🚀 Generic Sidebar for Dynamics 365 — Release v2.0.0

The Generic Sidebar kit provides a flexible, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps.  
Instead of writing custom HTML/JS each time, you configure a single Dataverse table row to control instructions, embeds, icons, and theming.

---

## ✨ What's New in v2.0.0

### ✅ Multi-Panel Support (Up to 4 Panels)

- Configure up to 4 panels per sidebar configuration
- Tab-based navigation when multiple panels are configured
- Each panel has its own title, instructions, and embed content

### ✅ Chat State Preservation

- **Tab Switching**: Chat conversations persist when switching between panels (iframes hidden, not destroyed)
- **Record Navigation**: Sidebar content preserved when navigating between D365 records (same config)
- **Session Storage**: Active panel remembered across OOB pane switches

### ✅ Pop-out Window (v2.11.0)

- **Pop-out Button**: Open embedded content in a separate window for uninterrupted conversations
- **Split-Screen Ready**: Window positioned at right edge of screen for easy Win+Arrow snapping
- **Named Window**: Prevents duplicate pop-out windows
- **Bring to Front**: Focus the pop-out window from within the sidebar
- **Restore Here**: Close pop-out and bring content back to sidebar
- **Auto-Restore**: Sidebar detects when pop-out is closed externally and restores embedded content

### ✅ Admin Acknowledgement Banner

- Demo disclaimer banner visible only to admins
- Includes "Acknowledge" button that flips `sidebar_acknowledged = Yes` in the default row
- Ensures clear consent before use in production

### ✅ PowerApps Canvas App Support

- The `sidebar_embedcode` field accepts Canvas App embed code alongside Copilot, URLs, HTML snippets, and web resources

### ✅ Improved Copilot Embeds

- Full-height rendering ensured
- Optional theming via `sidebar_primarycolor`, `sidebar_textcolor`, `sidebar_linkcolor`
- URL extraction from HTML-embedded iframes for pop-out capability

### ✅ Visual Framing (v2.12.0)

- Subtle 4px margin and border around non-zoomed iframes
- Light gray background for visual separation
- Softphone/Genesys zoom preserved with no framing

### ✅ Generic Embed Handling (v2.13.0)

- **Iframe widgets** (Copilot, Canvas Apps): Render natively without layout injection
- **Raw HTML**: Gets full-height styling for proper scrolling
- **Genesys/Phone**: Auto-zoom based on title keywords

---

## 🛠 Features

| Feature | Description |
|---------|-------------|
| **Table-driven config** | `sidebar_genericsidebar` — no redeployments required |
| **Multi-panel tabs** | Up to 4 panels with independent content |
| **Chat preservation** | Conversations persist across tab switches and record navigation |
| **Pop-out window** | Open content in separate window for OOB pane switches |
| **Rich instructions** | Band with bullet/heading normalization |
| **Embed options** | Copilot Studio, External URLs, HTML snippets, Canvas Apps, Web Resources |
| **Zoom toggle** | For phone/Genesys simulators |
| **Theming** | Primary, text, and link colors |

---

## 🪖 Optional Features

- Optional icon field (`sidebar_sidebaricon`) in header
- Full iframe customization (`allow`, `style`, `width`, `height`)
- Safe defaults (auto-applied allow attributes, strict referrer policy)

---

## ⚡ Usage Instructions

### 1. Import the Solution

Import the managed/unmanaged solution into your Dynamics 365 environment.

### 2. Create a Config Row

Open the Generic Sidebar Configuration table (`sidebar_genericsidebar`) and create one record with `sidebar_default = Yes`.

### 3. Set Key Fields

| Field | Description |
|-------|-------------|
| `sidebar_title` | Header title (shown in the pane chrome) |
| `sidebar_instructions` | Rich text instructions (bullets/headings supported) |
| `sidebar_embedcode` | URL, `<iframe>` snippet, or raw HTML |

**Embed Options:**

```
https://...                         (External URL)
<iframe ...></iframe>              (Copilot or Canvas App)
webresource:MyResource.html        (Web Resource)
<h2>Raw HTML</h2>                  (HTML Snippet)
```

---

## 📸 Screenshots

### HTML Configuration

![HTML Configuration](./screenshots/Generic.Sidebar.Admin.HTML.png)

### HTML Embed (End User View)

![HTML Embed](./screenshots/Generic.Sidebar.Admin.HTML.Embed.png)

### Copilot Studio Configuration

![Copilot Studio Configuration](./screenshots/Generic.Sidebar.Admin.CSStudio.Embed.png)

### Copilot Embed (End User View)

![Copilot Embed](./screenshots/Generic.Sidebar.CopilotStudio.Embed.png)

### Help, Issue Reporting and Survey

![Agent Survey](./screenshots/Generic.Sidebar.Admin.AgentSurvey.png)

---

## 📝 How to Add JS to a New Form

1. Add the `generic_sidebar.js` web resource to your form
2. Set OnLoad handler → `Generic_OpenSidebar`
3. Publish all customizations
4. Hard refresh (`Ctrl+Shift+R`)

---

## 📋 Known Limitations

- External sites may block embedding (`X-Frame-Options` / CSP)
- `sidebar_acknowledged` is optional; banner skipped if missing
- OOB sidecars (Smart Assist, Copilot Studio panel) unload custom sidebar — use pop-out to preserve chat

---

## 🔧 Web Resource Versions

| File | Version | Description |
|------|---------|-------------|
| `sidebar_sidebar.html` | v2.13.0 | Generic embed handling, visual framing, pop-out window |
| `sidebar_sidebar.js` | v2.5.0 | ConfigId tracking, pane management |

See [web resources/archives/README.md](web%20resources/archives/README.md) for version history.

---

## ⚠️ Disclaimer

This kit is provided as-is. It is intended primarily for demo / proof-of-concept purposes.  
Before production use, admins must acknowledge the disclaimer via the welcome banner (sets `sidebar_acknowledged = Yes`).
