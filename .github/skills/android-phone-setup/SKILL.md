---
name: android-phone-setup
description: 'Wizard-based setup and installation of the Android Cell Phone Simulator (Samsung S25 Ultra) with optional ACS real PSTN calling. Use when: install android phone, set up phone simulator, configure ACS calling, deploy phone to D365, phone number setup, android phone wizard, install cell phone, set up ACS, phone simulator installation, PSTN calling setup, deploy azure functions for phone.'
argument-hint: 'Describe your setup scenario (e.g., "simulated only", "full ACS with real calling", "just the Azure resources")'
---

# Android Cell Phone Simulator — Setup Wizard

## Purpose

Walk users through installing and configuring the Samsung S25 Ultra Android Cell Phone Simulator for Dynamics 365 contact center demos. Supports two deployment modes:

| Mode | File | Azure Required | Real Calls |
|------|------|---------------|------------|
| **Simulated** | `AndroidCellPhone.html` | No | No — localStorage only |
| **ACS Real Calling** | `AndroidCellPhone_ACS.html` | Yes | Yes — real PSTN via Azure Communication Services |

## When to Use

- User wants to install/deploy the Android phone simulator
- User asks about setting up ACS (Azure Communication Services) for the phone
- User needs to configure Azure Functions for token service
- User wants to deploy the phone as a D365 web resource
- User asks about phone number purchase or PSTN calling setup
- User wants the simulated-only version without Azure dependencies

## Wizard Procedure

### Step 1: Determine Deployment Mode

Ask the user which mode they want:

**Option A — Simulated Only (no Azure)**
- Zero cost, zero dependencies
- Calls are simulated via localStorage events
- File: `Generic.AndroidCellPhone/AndroidCellPhone.html`
- Skip to [Step 6](#step-6-deploy-to-dynamics-365)

**Option B — ACS Real Calling (Azure required)**
- Real PSTN calls via Azure Communication Services
- Requires Azure subscription (~$15/month + usage)
- File: `Generic.AndroidCellPhone/AndroidCellPhone_ACS.html`
- Continue to Step 2

### Step 2: Check Prerequisites

Run these checks interactively — confirm each before proceeding:

```
□ Azure CLI installed?          → az --version
□ Node.js installed (18+)?      → node --version
□ PowerShell 7+ installed?      → $PSVersionTable.PSVersion
□ Azure subscription available? → az account show
□ MSAL.PS module installed?     → Get-Module MSAL.PS -ListAvailable
```

If any are missing, help the user install them:

| Missing | Install Command |
|---------|----------------|
| Azure CLI | `winget install Microsoft.AzureCLI` |
| Node.js | `winget install OpenJS.NodeJS.LTS` |
| PowerShell 7 | `winget install Microsoft.PowerShell` |
| MSAL.PS | `Install-Module MSAL.PS -Scope CurrentUser` |

### Step 3: Azure Login

```powershell
az login --use-device-code
```

Tell the user: "Open https://microsoft.com/devicelogin and enter the code shown."

After login, confirm subscription:
```powershell
az account show --query "{name:name, id:id}" -o table
```

### Step 4: Create Azure Resources

Run the installer script: [install-acs-phone.ps1](./scripts/install-acs-phone.ps1)

```powershell
.\install-acs-phone.ps1 -D365Url "https://USERORG.crm.dynamics.com"
```

The script automates these steps in order:

| # | Resource | CLI Command | Est. Time |
|---|----------|------------|-----------|
| 1 | Resource Group | `az group create` | 5s |
| 2 | ACS Resource | `az communication create` | 30s |
| 3 | Storage Account | `az storage account create` | 30s |
| 4 | App Service Plan (B1) | `az appservice plan create` | 30s |
| 5 | Function App (Node.js 18) | `az functionapp create` | 60s |
| 6 | Set ACS_CONNECTION_STRING | `az functionapp config appsettings set` | 5s |
| 7 | Configure CORS | `az functionapp cors add` | 5s |

See [Azure Resources Reference](./references/azure-resources.md) for full details and cost breakdown.

### Step 5: Phone Number + Deploy Functions

**5a. Purchase Phone Number (manual)**

The script opens the Azure Portal to the phone number purchase page. The user must:
1. Select country: United States
2. Choose Geographic number type
3. Pick an area code
4. Purchase the number (~$1/month)
5. Enter the number back into the script prompt

**5b. Build & Deploy Functions (automated)**

The script then:
1. Runs `npm install` in `azure-functions/`
2. Builds the ACS SDK bundle via esbuild in `acs-bundle/`
3. Copies the bundle to `azure-functions/serveAcsBundle/`
4. Zip-deploys to the Function App
5. Verifies both endpoints return 200:
   - `GET /api/getAcsToken` → returns `{token, expiresOn, userId}`
   - `GET /api/serveAcsBundle` → returns JavaScript bundle

### Step 6: Deploy to Dynamics 365

**6a. Choose deployment method:**

| Method | When to Use |
|--------|------------|
| **Manual upload** | One-time setup, small team |
| **Script upload** | Automated, repeatable |

**6b. Manual upload:**
1. Open D365 → Settings → Customizations → Web Resources
2. Create new web resource:
   - Name: `gensoft_AndroidCellPhone_ACS` (or `gensoft_AndroidCellPhone` for simulated)
   - Type: Webpage (HTML)
   - Upload the HTML file
3. Publish

**6c. Script upload** (via Dataverse REST API):
```powershell
.\install-acs-phone.ps1 -D365Url "https://USERORG.crm.dynamics.com" -UploadWebResource
```

### Step 7: Configure the Phone

See [Configuration Options](./references/configuration-options.md) for three approaches:

| Option | Complexity | Best For |
|--------|-----------|----------|
| **A: Settings Screen** | Simplest | Single user / quick demo |
| **B: Dataverse Config** | Medium | Enterprise / multi-environment |
| **C: Auto-Discovery** | Cleanest | Future-proof, single URL |

**Option A (default):** Open the phone in D365, go to Settings, and enter:
- **ACS Token URL**: `https://your-func.azurewebsites.net/api/getAcsToken`
- **ACS Phone Number**: `+1XXXXXXXXXX` (the number purchased in Step 5)

### Step 8: Verify Installation

Run through this checklist:

```
□ Token endpoint returns 200?         → curl https://your-func.../api/getAcsToken
□ Bundle endpoint returns 200?        → curl https://your-func.../api/serveAcsBundle
□ Phone loads in D365 sidebar?        → Open case form, check side pane
□ Settings screen accessible?         → Tap gear icon on phone
□ Microphone permission granted?      → Browser prompts on first call
□ Test call connects?                 → Dial any number, hear ring
□ Genesys softphone receives event?   → Check sidebar call card appears
```

See [Troubleshooting Guide](./references/troubleshooting.md) if any check fails.

## Cost Summary

| Resource | Monthly Cost |
|----------|-------------|
| ACS Resource | Free (pay-per-use) |
| Geographic Phone Number | ~$1/month |
| Function App (B1 plan) | ~$13/month |
| Storage Account | ~$1/month |
| PSTN Usage | ~$0.013/min |
| **Total** | **~$15/month + usage** |

## File Reference

| File | Path | Purpose |
|------|------|---------|
| Simulated Phone | `Generic.AndroidCellPhone/AndroidCellPhone.html` | No Azure deps |
| ACS Phone | `Generic.AndroidCellPhone/AndroidCellPhone_ACS.html` | Real PSTN calling |
| Token Function | `azure-functions/getAcsToken/index.js` | Issues ACS tokens |
| Bundle Function | `azure-functions/serveAcsBundle/index.js` | Serves ACS SDK |
| Bundle Entry | `acs-bundle/entry.js` | esbuild entry point |
| ACS Setup Guide | `Generic.AndroidCellPhone/ACS_SETUP_GUIDE.md` | Full reference doc |
| Dataverse Schema | `specs/main/scripts/create-dataverse-schema.ps1` | Creates D365 tables |
| Installer Script | `.github/skills/android-phone-setup/scripts/install-acs-phone.ps1` | Automated setup |

## Integration Contract

The phone communicates with the sidebar ecosystem via `localStorage.genericSimCall`:

```json
{
  "callerName": "Jamie Carter",
  "queueName": "Support",
  "phoneNumber": "(555) 201-4832",
  "state": "RINGING",
  "startTime": "2026-03-06T14:30:00.000Z",
  "popMode": null,
  "defaultCaseTitle": "Customer Inquiry",
  "transcriptEnabled": true
}
```

Listeners: Genesys Softphone (`SidecarItems/Genesys Softphone/Genesys Softphone.html`)
