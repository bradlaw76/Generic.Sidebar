# Generic Sidebar SSO — Admin Setup Guide

**Version:** 2.0.0  
**Last Updated:** 2026-07-22  
**Audience:** Dynamics 365 Administrators, Power Platform Administrators

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create Entra App Registration](#step-1-create-entra-app-registration)
4. [Step 2: Configure API Permissions](#step-2-configure-api-permissions)
5. [Step 3: Create Copilot Studio Agent](#step-3-create-copilot-studio-agent)
6. [Step 4: Get Copilot Token Endpoint](#step-4-get-copilot-token-endpoint)
7. [Step 5: Extend Dataverse Table](#step-5-extend-dataverse-table)
8. [Step 6: Configure SSO in Sidebar](#step-6-configure-sso-in-sidebar)
9. [Step 7: Test Configuration](#step-7-test-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Generic Sidebar now supports enterprise Single Sign-On (SSO) for Copilot Studio embeds. This guide walks you through:

- **Creating** a secure Entra app registration
- **Configuring** API permissions
- **Building** a Copilot agent
- **Storing** SSO config in Dataverse (zero hardcoding)
- **Testing** end-to-end functionality

**Key Principle:** All sensitive data (Client IDs, Token Endpoints) is stored securely in Dataverse. The sidebar reads configuration at runtime—no code changes needed per environment.

---

## Prerequisites

Before you start, ensure you have:

- ✅ **Dynamics 365** organization with D365 model-driven app
- ✅ **Power Apps** environment (same as D365 org)
- ✅ **Copilot Studio** access (enabled in Power Platform tenant)
- ✅ **Entra ID** admin access (to create app registration)
- ✅ **Generic.Sidebar** v2.0.0+ deployed to web resources
- ✅ **Dataverse** table `sidebar_genericsidebar` with SSO fields (see Step 5)

**GCC/GCCH Note:** If deploying to GCC or GCCH, use the respective Entra endpoints:
- **Commercial:** `https://login.microsoftonline.com`
- **GCC:** `https://login.microsoftonline.com` (same, but with `powerplatform.microsoft.us` token endpoint)
- **GCCH:** `https://login-us.microsoftonline.us` (requires separate Entra instance)

---

## Step 1: Create Entra App Registration

### In Azure Portal:

1. **Navigate to Entra ID:**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Search for "Microsoft Entra ID"
   - Click **App registrations** (left sidebar)

2. **Create New Registration:**
   - Click **+ New registration**
   - **Name:** e.g., "Generic Sidebar Copilot" or "Copilot Canvas App"
   - **Supported account types:** Select "Accounts in this organizational directory only"
   - **Redirect URI:** Leave blank for now (we'll add it next)
   - Click **Register**

3. **Add Redirect URI:**
   - In your new app, go to **Authentication** (left sidebar)
   - Click **+ Add a platform**
   - Select **Single-page application (SPA)**
   - **Redirect URI:** Enter your Dynamics 365 org URL + web resource name:
     ```
     https://<your-org>.crm9.dynamics.com/WebResources/sidebar_sso_canvas.html
     ```
     Example: `https://contoso.crm9.dynamics.com/WebResources/sidebar_sso_canvas.html`
   - ✅ Check both:
     - `Access tokens (used for implicit flows)`
     - `ID tokens (used for implicit and hybrid flows)`
   - Click **Configure**

4. **Note Your Client ID & Tenant ID:**
   - Go to **Overview**
   - Copy and save:
     - **Application (client) ID** → needed for sidebar config
     - **Directory (tenant) ID** → needed for sidebar config

---

## Step 2: Configure API Permissions

### In Azure Portal (same app):

1. **Navigate to API Permissions:**
   - In your app, go to **API permissions** (left sidebar)
   - Click **+ Add a permission**

2. **Add Microsoft Graph Permissions (Optional):**
   - Select **Microsoft Graph** → **Delegated permissions**
   - Search for: `User.Read`, `offline_access`
   - Select both and click **Add permissions**
   - *(These allow reading user profile during SSO)*

3. **Create Custom API Scope:**
   - Go to **Expose an API** (left sidebar)
   - **Application ID URI:**
     - Click **Set** or **Add**
     - Recommended format: `api://<client-id>` (auto-filled)
     - Or: `api://copilot-sidebar-app`
     - Click **Save**

4. **Add Scope:**
   - Under "Scopes defined by this API," click **+ Add a scope**
   - **Scope name:** `Test.Read` (or your custom name)
   - **Admin consent display name:** "Read test scope"
   - **Admin consent description:** "Allows the app to read test data"
   - Click **Add scope**

5. **Copy Your API Scope:**
   - The full scope will appear as: `api://<app-id>/Test.Read`
   - Example: `api://3a669365-5420-433a-913f-ad7e39424a8c/Test.Read`
   - **Save this** → needed for sidebar config

---

## Step 3: Create Copilot Studio Agent

### In Power Platform Admin Center or Copilot Studio:

1. **Go to Copilot Studio:**
   - [powerplatform.microsoft.com](https://powerplatform.microsoft.com)
   - Select your environment
   - Click **Copilot Studio** (or **Agents** → **Create new**)

2. **Create New Agent:**
   - Click **Create** or **+ New agent**
   - **Name:** e.g., "Sales Opportunities Agent"
   - Select a template or start blank
   - Design your agent topics (e.g., "Get Opportunities", "Create Lead", etc.)

3. **Publish Agent:**
   - Click **Publish** (top right)
   - Wait for publication to complete

4. **Note Agent Endpoint:**
   - After publishing, go to **Channels** → **Direct Line**
   - You'll see a token endpoint URL
   - **Save this** → needed for Step 4

---

## Step 4: Get Copilot Token Endpoint

### In Copilot Studio (same agent):

1. **Navigate to Channels:**
   - In your agent, go to **Channels** (left sidebar)
   - Click **Direct Line** (if not visible, click **+ Add channel**)

2. **Copy Token Endpoint:**
   - You'll see:
     ```
     Token Endpoint:
     https://adb67d14bc04e71...environment.api.powerplatform.microsoft.us/powervirtualagents/botsbyschema/.../directline/token?api-version=2022-03-01-preview
     ```
   - **Copy the entire URL** → needed for sidebar config
   - Keep this URL confidential (it identifies your agent)

3. **Note the Environment URL:**
   - The URL contains your environment identifier
   - Example: `.environment.api.powerplatform.microsoft.us/` (GCC)
   - This confirms the region (commercial vs. GCC vs. GCCH)

---

## Step 5: Extend Dataverse Table

Generic Sidebar needs 8 new fields on the `sidebar_genericsidebar` table to store SSO config.

### Option A: PowerShell Script (Recommended)

Run this PowerShell script to add the fields automatically:

```powershell
# Requires: PowerShell 7+ and PFXCert authentication
# See SECURITY_GUIDE.md for credential setup

$OrgUrl = "https://yourorg.crm9.dynamics.com"
$ApiUrl = "$OrgUrl/api/data/v9.0"

# Connect to Dataverse
$cred = Get-Credential
$headers = @{
    "Authorization" = "Bearer $(Get-MsalToken -ClientId 'your-app-id' -TenantId 'your-tenant-id').AccessToken"
    "Content-Type" = "application/json"
}

# Create SSO fields on sidebar_genericsidebar table
$fields = @(
    @{ logicalName = "sidebar_sso_enabled"; displayName = "SSO Enabled"; type = "Boolean" },
    @{ logicalName = "sidebar_auth_client_id"; displayName = "Client ID"; type = "String"; maxLength = 100 },
    @{ logicalName = "sidebar_auth_tenant_id"; displayName = "Tenant ID"; type = "String"; maxLength = 100 },
    @{ logicalName = "sidebar_auth_api_scope"; displayName = "API Scope"; type = "String"; maxLength = 200 },
    @{ logicalName = "sidebar_auth_token_endpoint"; displayName = "Token Endpoint"; type = "String"; maxLength = 500 },
    @{ logicalName = "sidebar_auth_redirect_uri"; displayName = "Redirect URI"; type = "String"; maxLength = 300 },
    @{ logicalName = "sidebar_auth_scopes"; displayName = "Additional Scopes"; type = "String"; maxLength = 500 },
    @{ logicalName = "sidebar_auth_client_secret"; displayName = "Client Secret (Encrypted)"; type = "String"; maxLength = 256 }
)

foreach ($field in $fields) {
    $payload = @{
        LogicalName = $field.logicalName
        DisplayName = $field.displayName
        # Additional field properties...
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$ApiUrl/EntityDefinitions(LogicalName='sidebar_genericsidebar')/Attributes" `
        -Method POST `
        -Headers $headers `
        -Body $payload
}

Write-Host "SSO fields added successfully!"
```

### Option B: Manual Configuration (UI)

1. **Open your Dynamics 365 org**
2. **Go to Dataverse (Power Platform Admin):**
   - [https://admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com)
   - Select your environment
   - Click **Dataverse** → **Tables**
   - Search for `sidebar_genericsidebar`

3. **Add Fields (one by one):**

   | Field Name | Display Name | Type | Max Length | Required? | Notes |
   |------------|--------------|------|------------|-----------|-------|
   | `sidebar_sso_enabled` | SSO Enabled | Yes/No | — | No | Default: No (SSO off unless explicitly enabled) |
   | `sidebar_auth_client_id` | Client ID | Text | 100 | No (if SSO enabled: Yes) | From Entra app registration |
   | `sidebar_auth_tenant_id` | Tenant ID | Text | 100 | No (if SSO enabled: Yes) | From Entra directory |
   | `sidebar_auth_api_scope` | API Scope | Text | 200 | No (if SSO enabled: Yes) | Format: `api://client-id/scope` |
   | `sidebar_auth_token_endpoint` | Token Endpoint | Text | 500 | No (if SSO enabled: Yes) | From Copilot Studio Direct Line |
   | `sidebar_auth_redirect_uri` | Redirect URI | Text | 300 | No | Default: `https://<org>.crm9.dynamics.com/WebResources/sidebar_sso_canvas.html` |
   | `sidebar_auth_scopes` | Additional Scopes | Text | 500 | No | Space-separated (e.g., `Sites.Read.All User.Read`) |
   | `sidebar_auth_client_secret` | Client Secret (Encrypted) | Text | 256 | No | Use only for service-to-service auth (advanced) |

4. **Click Save** after adding each field

---

## Step 6: Configure SSO in Sidebar

### In Dynamics 365:

1. **Open sidebar_genericsidebar table:**
   - Go to your model-driven app
   - Find the **Generic Sidebar Configuration** table (or custom table name)
   - Open or create a configuration record

2. **Fill in SSO fields:**

   | Field | Value | Example |
   |-------|-------|---------|
   | **SSO Enabled** | Yes | Toggle ON |
   | **Client ID** | From Step 1 | `3a669365-5420-433a-913f-ad7e39424a8c` |
   | **Tenant ID** | From Step 1 | `a8037933-4d29-4ef8-8754-e67b2edd480b` |
   | **API Scope** | From Step 2 | `api://3a669365-5420-433a-913f-ad7e39424a8c/Test.Read` |
   | **Token Endpoint** | From Step 4 | `https://...powerplatform...directline/token...` |
   | **Redirect URI** | Your D365 org URL + canvas web resource | `https://contoso.crm9.dynamics.com/WebResources/sidebar_sso_canvas.html` |
   | **Additional Scopes** | (Optional) | Leave blank or add: `Sites.Read.All` |
   | **Client Secret** | (Optional) | Leave blank unless using service principal auth |

3. **Save the record**

---

## Step 7: Test Configuration

### Use the Configuration Validator Tool:

1. **Open the validator:**
   - [https://yourorg.crm9.dynamics.com/WebResources/sidebar_sso_config_validator.html](https://yourorg.crm9.dynamics.com/WebResources/sidebar_sso_config_validator.html)

2. **Paste your values:**
   - Client ID, Tenant ID, API Scope, Token Endpoint
   - Click **✓ Validate Configuration**

3. **Check for ✅ or ✗:**
   - ✅ All checks passed → Config is valid
   - ✗ Fix any failed checks → Follow remediation tips

### End-to-End Test:

1. **Open your D365 form**
2. **Click "Open Sidebar"** (or your custom button)
3. **Observe:**
   - ✅ You should see Copilot in the sidebar
   - ✅ No sign-in prompt (SSO handles it)
   - ✅ Agent responds to your questions
   - ✅ Chat history persists in sidebar session

### Debug Mode:

1. **Open browser console:** `F12` → **Console** tab
2. **Look for log messages:**
   - `[sidebar-sso-setup] Loading SSO config...`
   - `[sidebar-sso-setup] Config validation passed`
   - `[sidebar-sso-setup] Token acquired successfully`
   - `[SSO] SSO enabled for this config`

3. **If errors appear:** See [Troubleshooting](#troubleshooting) below

---

## Troubleshooting

### "SSO not enabled for this config"
- **Cause:** `sidebar_sso_enabled` is set to **No**
- **Fix:** Go to sidebar config record → Set **SSO Enabled** to **Yes**

### "Missing required SSO fields"
- **Cause:** One or more SSO fields are empty
- **Fix:** Run the Configuration Validator to identify which fields are missing
- **Action:** Fill in the missing values from Steps 1–4

### "Token Endpoint must be HTTPS"
- **Cause:** Token endpoint URL doesn't start with `https://`
- **Fix:** Copy the full token endpoint URL from Copilot Studio (Step 4)

### "Sidebar shows 'Connecting to Copilot Studio...' forever"
- **Cause:** Token endpoint is unreachable or returns 5XX error
- **Fix:**
  1. Verify Token Endpoint URL is correct (copy-paste from Copilot Studio)
  2. Check if Copilot agent is **Published** (not just draft)
  3. Verify API Scope is correctly formatted (`api://...`)

### "CORS error" or "Token request failed"
- **Cause:** Redirect URI mismatch or token endpoint doesn't recognize the request
- **Fix:**
  1. Verify Redirect URI exactly matches your D365 org URL + `/WebResources/sidebar_sso_canvas.html`
  2. Ensure the Redirect URI is configured in Entra app registration (Step 1, Step 2)
  3. Check browser console for exact error message

### "OAuth card keeps appearing"
- **Cause:** Loop guard triggered (max 2 silent OAuth attempts exceeded)
- **Fix:**
  1. Check Copilot token endpoint logs for errors
  2. Verify Direct Line channel is enabled in Copilot Studio
  3. Hard refresh browser (`Ctrl+Shift+R`) to clear cached tokens

### "Non-SSO embeds not working"
- **Cause:** Phase 1 implementation broke backwards compatibility
- **Fix:** Contact support; should never happen. Verify sidebar_sidebar.js v2.0.0+

---

## Additional Resources

- **Security Guide:** See [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for token lifecycle, credential storage, best practices
- **Troubleshooting Guide:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed error codes
- **VZ Reference:** See [SO Sign In/copilot-sso-runbook.md](SO%20Sign%20In/copilot-sso-runbook.md) for VZ implementation patterns
- **Copilot Studio Docs:** [https://learn.microsoft.com/en-us/power-virtual-agents/](https://learn.microsoft.com/en-us/power-virtual-agents/)

---

## Support

For issues not covered in this guide:
1. Check browser console (`F12`) for error messages
2. Run Configuration Validator tool
3. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. Contact your Power Platform administrator

---

**Version:** 2.0.0  
**Last Updated:** 2026-07-22  
**Next Phase:** See [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for advanced configuration
