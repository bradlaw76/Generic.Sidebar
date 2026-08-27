<!--
=============================================================================
DOCUMENT:     Android Phone Simulator - ACS Real Calling Setup Guide
FILE:         Generic.AndroidCellPhone/ACS_SETUP_GUIDE.md
VERSION:      1.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-08-27
ENVIRONMENT:  Markdown (GitHub / Docs)

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Deployment guidance for the optional ACS real-calling Android add-in.

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.1.0  2026-08-27  Clarify add-in deployment and Core package boundary
=============================================================================
-->

# Android Phone Simulator - ACS Real Calling Setup Guide

## Overview

The Android Phone Simulator has two separately deployed variants. Both are optional add-ins; neither is part of or required by `GenericSidebar_1_0_0_5.zip`, and neither should be added to the base Generic Sidebar Core solution.

| Version | File | Calling | Dependencies |
|---------|------|---------|--------------|
| **v2.8.2** (Simulated) | `AndroidCellPhone.html` | localStorage only | None — fully self-contained |
| **v3.1.0** (ACS Real Calling) | `AndroidCellPhone_ACS.html` | Real PSTN via Azure Communication Services | Azure subscription required |

The version numbers in this guide identify Android add-in files, not Generic Sidebar Core or its solution package. ACS deployment and validation cannot be used as Core certification evidence.

---

## Part 1: What Others Need to Use This

### Required Azure Resources

| Resource | Purpose | Estimated Cost |
|----------|---------|---------------|
| **ACS Resource** | Manages calling/identity | Free (pay per use) |
| **Geographic Phone Number** | Outbound caller ID | ~$1/month |
| **Azure Function App** | Token service + SDK bundle | ~$13/month (B1) or free (Consumption) |
| **Storage Account** | Required by Function App | ~$1/month |
| **App Service Plan** | Hosts Function App | Included in Function App cost |

**Total: ~$15/month + ~$0.013/min PSTN usage**

### Configuration Required

Three values must be set per environment. These are currently hardcoded in the HTML:

```javascript
var ACS_TOKEN_URL = 'https://your-function.azurewebsites.net/api/getAcsToken';
var ACS_PHONE_NUMBER = '+1XXXXXXXXXX';
// SDK bundle URL derived from token URL base
```

### Recommended Configuration Approaches

#### Option A: Settings Screen (Simplest)
Add fields to the phone Settings UI, saved to localStorage:

| Setting | Default |
|---------|---------|
| ACS Token URL | `https://your-function.azurewebsites.net/api/getAcsToken` |
| ACS Phone Number | `+1XXXXXXXXXX` |
| ACS Bundle URL | Derived from Token URL |

If empty, ACS calling is disabled — pure simulated mode.

#### Option B: Dataverse Config (Enterprise)
Add columns to the separately deployed `gensoft_genericsoftphone` add-in table:

| Column | Schema Name | Type |
|--------|-------------|------|
| ACS Token Endpoint | `gensoft_acstokenurl` | Single Line Text (500) |
| ACS Outbound Number | `gensoft_acsoutboundnumber` | Single Line Text (20) |

#### Option C: Auto-Discovery (Cleanest)
Function returns phone number with the token response. Phone needs only ONE URL.

```json
{
  "token": "eyJ...",
  "phoneNumber": "+14046897084",
  "bundleUrl": "https://fn-sidebar-acs.azurewebsites.net/api/serveAcsBundle"
}
```

### Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Token endpoint open to anyone | Add Azure AD auth or API key to the Function |
| Connection string exposure | Kept server-side in Function App settings, never in browser |
| Unauthorized calling | Function validates caller identity before issuing token |
| Call cost control | Set Azure spending alerts; ACS has per-resource billing |
| CORS | Lock to specific D365 domain only (remove `*` wildcard) |

---

## Part 2: Automated Installation

### What Can Be Fully Automated

| Step | Method | Tool |
|------|--------|------|
| Create ACS resource | `az communication create` | Azure CLI |
| Create resource group | `az group create` | Azure CLI |
| Register providers | `az provider register` | Azure CLI |
| Create Storage Account | `az storage account create` | Azure CLI |
| Create App Service Plan | `az appservice plan create` | Azure CLI |
| Create Function App | `az functionapp create` | Azure CLI |
| Set ACS connection string | `az functionapp config appsettings set` | Azure CLI |
| Configure CORS | `az functionapp cors add` | Azure CLI |
| Build ACS SDK bundle | `npm install && npx esbuild` | Node.js |
| Deploy Function App | `az functionapp deployment source config-zip` | Azure CLI |
| Create Dataverse schema | `create-dataverse-schema.ps1` | PowerShell |
| Upload web resource to D365 | Dataverse REST API | PowerShell |
| Insert sample data | Dataverse REST API | PowerShell |

### What Requires Manual Steps

| Step | Why | Workaround |
|------|-----|-----------|
| **Purchase phone number** | Azure Portal only — no CLI purchase command | Script opens portal URL |
| **Azure login** | Interactive auth required | `az login --use-device-code` |
| **D365 login** | Interactive auth for Dataverse token | MSAL device code flow |
| **Grant mic permission** | Browser security | User clicks Allow on first call |
| **Verify call works** | User must test | Script prompts to test |

### Installer Script Design

```powershell
# install-acs-phone.ps1
param(
    [string]$D365Url,              # e.g. https://yourorg.crm.dynamics.com
    [string]$Location = "eastus",
    [string]$ResourcePrefix = "sidebar-acs",
    [switch]$SkipAzureResources,
    [switch]$SkipD365Upload
)
```

### Installation Flow

```
┌─────────────────────────────────────────────────┐
│  1. PREREQUISITES CHECK                          │
│     ✓ Azure CLI installed?                       │
│     ✓ Node.js installed?                         │
│     ✓ PowerShell 7+?                             │
│     ✓ MSAL.PS module?                            │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  2. AZURE LOGIN                                  │
│     az login --use-device-code                   │
│     User enters code at microsoft.com/devicelogin│
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  3. CREATE AZURE RESOURCES (automated)           │
│     → Resource Group                             │
│     → ACS Resource                               │
│     → Storage Account                            │
│     → App Service Plan (B1)                      │
│     → Function App                               │
│     → Set ACS_CONNECTION_STRING                  │
│     → Configure CORS for D365 domain             │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  4. PURCHASE PHONE NUMBER (manual)               │
│     Script opens Azure Portal to the right page  │
│     User purchases a geographic number           │
│     Script prompts: "Enter your new number:"     │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  5. BUILD & DEPLOY FUNCTIONS (automated)         │
│     → npm install                                │
│     → esbuild ACS SDK bundle                     │
│     → Zip deploy to Function App                 │
│     → Verify: GET /api/getAcsToken returns token │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  6. CONFIGURE PHONE HTML (automated)             │
│     → Replace ACS_TOKEN_URL with Function URL    │
│     → Replace ACS_PHONE_NUMBER                   │
│     → Replace bundle URL                         │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  7. D365 LOGIN + UPLOAD (semi-automated)         │
│     → MSAL device code auth for Dataverse        │
│     → Upload web resource via REST API           │
│     → Publish web resource                       │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│  8. VERIFICATION                                 │
│     → Token endpoint responds 200?               │
│     → Bundle endpoint responds 200?              │
│     → Web resource published?                    │
│     → Print URL to open phone                    │
└─────────────────────────────────────────────────┘
```

### User Experience

```powershell
# User runs ONE command:
.\install-acs-phone.ps1 -D365Url "https://myorg.crm.dynamics.com"

# Output:
# [1/8] Checking prerequisites... ✓
# [2/8] Azure login — enter code: ABC123 at microsoft.com/devicelogin
# [3/8] Creating Azure resources...
#       → Resource group ✓ → ACS resource ✓ → Function App ✓
# [4/8] Purchase a phone number:
#       Opening Azure Portal...
#       Enter your new number: +14045551234
# [5/8] Building and deploying functions...
#       → SDK bundle: 5.5MB ✓ → Token endpoint: 200 OK ✓
# [6/8] Configuring phone HTML... ✓
# [7/8] D365 login — enter code: XYZ789
#       → Web resource uploaded ✓ → Published ✓
# [8/8] All checks passed ✓
#
# ═══════════════════════════════════════
#   READY! Open your phone at:
#   https://myorg.crm.dynamics.com/WebResources/gensoft_AndroidCellPhone_ACS
# ═══════════════════════════════════════
```

### Estimated Time: ~10 minutes

| Phase | Duration |
|-------|----------|
| Prerequisites check | 5 seconds |
| Azure login | 30 seconds |
| Create Azure resources | 3-5 minutes |
| Purchase phone number | 2 minutes |
| Build & deploy functions | 2 minutes |
| Configure + upload to D365 | 1 minute |

### What Should NOT Be Automated

- **Choosing the phone number** — user picks area code/number
- **Granting mic permission** — browser security, first call only
- **Subscription quota requests** — if region has no VM quota
- **Billing agreement** — Azure charges for PSTN usage

---

## Deployment Checklist

```
□ 1. Create Azure Communication Services resource
□ 2. Purchase geographic phone number with outbound calling
□ 3. Copy ACS connection string
□ 4. Create Azure Function App (Node.js)
□ 5. Set ACS_CONNECTION_STRING app setting
□ 6. Add CORS origin for your D365 domain
□ 7. Build ACS SDK bundle (esbuild)
□ 8. Deploy getAcsToken + serveAcsBundle functions
□ 9. Test token endpoint: GET https://your-func.azurewebsites.net/api/getAcsToken
□ 10. Update AndroidCellPhone_ACS.html with your URLs/number
□ 11. Upload as D365 web resource
□ 12. Publish and test
```

---

## File Reference

| File | Version | Purpose |
|------|---------|---------|
| `AndroidCellPhone.html` | v2.8.2 | Simulated phone (no Azure deps) |
| `AndroidCellPhone_v2.8.2.html` | v2.8.2 | Archived simulated version |
| `AndroidCellPhone_v2.6.0.html` | v2.6.0 | Archived earlier version |
| `AndroidCellPhone_ACS.html` | v3.1.0 | Real PSTN calling via ACS |
| `azure-functions/getAcsToken/` | 1.0.0 | Token service |
| `azure-functions/serveAcsBundle/` | 1.0.0 | ACS SDK browser bundle |
| `acs-bundle/entry.js` | — | esbuild entry for SDK bundle |

## Azure Resources (Current Deployment)

| Resource | Name | Region |
|----------|------|--------|
| ACS Resource | `rg-ACS-ContactCenter-D365DemoTSCE80677168-voice` | Global |
| Function App | `fn-generic-sidebar-acs` | Central US |
| App Service Plan | `plan-sidebar-acs` | Central US |
| Geographic Number | +1 (404) 689-7084 | US (Atlanta) |
| D365 Environment | `healthconnectcenter.crm.dynamics.com` | — |
