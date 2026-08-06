# Generic Sidebar SSO — Troubleshooting Guide

**Version:** 2.0.1
**Last Updated:** 2026-08-05
**Quick Help:** Use `Ctrl+Shift+I` → **Console** tab to see debug messages

---

## Quick Diagnostic Checklist

Start here for fastest resolution:

```
☐ Run Local Configuration Validator (sidebar_sso_config_validator.html)
☐ Check browser console for [sidebar-sso-setup] messages
☐ Verify sidebar_sso_enabled = Yes in Dataverse
☐ Confirm Client ID is valid UUID format
☐ Confirm Copilot agent is Published (not Draft)
☐ Confirm Redirect URI matches your org URL exactly
☐ Hard refresh browser (Ctrl+Shift+R) to clear cache
☐ Confirm active child rows exist in sidebar_genericsidebaragent for the selected parent config
```

---

## Error Categories

### A. Configuration Errors (Setup Phase)

---

#### **A1: "SSO not enabled for this config"**

**Where you see this:** Browser console: `[sidebar-sso-setup] SSO not enabled for this config`

**What it means:** The `sidebar_sso_enabled` flag is set to **No** (or empty/null)

**How to fix:**
1. Go to Dataverse → `sidebar_genericsidebar` table
2. Find your sidebar config record
3. Set **SSO Enabled** field to **Yes**
4. Save
5. Hard refresh sidebar in D365 (Ctrl+Shift+R)

**Common causes:**
- Admin created config but forgot to enable SSO
- SSO accidentally disabled during testing

---

#### **A2: "Missing required SSO fields"**

**Where you see this:** Browser console + alert dialog

**What it means:** One or more required fields are empty:
- Client ID
- Tenant ID
- API Scope
- Token Endpoint

**How to fix:**
1. Run the Local Configuration Validator tool. It checks values only; it does not read Dataverse or authenticate.
2. Note which fields show ✗ (failed)
3. Go to sidebar config record
4. Fill in the missing values (see [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md))
5. Save and refresh

**Example output:**
```
✗ Missing: Client ID (sidebar_auth_client_id)
✗ Missing: Tenant ID (sidebar_auth_tenant_id)
✓ API Scope is properly formatted
```

---

#### **A3: "Client ID must be a valid UUID"**

**Where you see this:** Configuration Validator shows ✗

**What it means:** Client ID is not in UUID format (e.g., malformed or copied incorrectly)

**Valid format:**
```
8 digits - 4 digits - 4 digits - 4 digits - 12 digits
3a669365-5420-433a-913f-ad7e39424a8c
```

**How to fix:**
1. Go to Azure Portal → Entra ID → App registrations
2. Find your app
3. Copy the **Application (client) ID** (top of Overview)
4. Paste into sidebar config **exactly** (don't add extra spaces)
5. Save and refresh

---

#### **A4: "Tenant ID must be a valid UUID"**

**Where you see this:** Configuration Validator shows ✗

**What it means:** Tenant ID is malformed

**Valid format:** Same as Client ID (UUID format)

**How to fix:**
1. Go to Azure Portal → Entra ID
2. Copy the **Directory (tenant) ID** (top of Overview)
3. Paste into sidebar config **exactly**
4. Save and refresh

---

#### **A5: "API Scope must start with 'api://'"**

**Where you see this:** Configuration Validator shows ✗

**What it means:** API Scope doesn't follow `api://client-id/scope` format

**Valid format:**
```
api://3a669365-5420-433a-913f-ad7e39424a8c/Test.Read
```

**How to fix:**
1. Go to Azure Portal → Your app → Expose an API
2. Check **Application ID URI** (should be `api://` format)
3. Under **Scopes**, find your scope name
4. Copy the **full scope URL** (including `api://...`)
5. Paste into sidebar config
6. Save and refresh

---

#### **A6: "Token Endpoint must end with 'directline/token'"**

**Where you see this:** Configuration Validator shows ✗

**What it means:** Token endpoint URL is malformed or incomplete

**Valid format:**
```
https://...environment.api.powerplatform.microsoft.us/powervirtualagents/botsbyschema/.../directline/token?api-version=2022-03-01-preview
```

**How to fix:**
1. Go to Copilot Studio
2. Open your agent
3. Go to **Channels** → **Direct Line**
4. Copy the **Token Endpoint** URL (entire thing)
5. Paste into sidebar config `Token Endpoint` field
6. Save and refresh

**Verify region:**
- `.powerplatform.microsoft.com` → Commercial
- `.powerplatform.microsoft.us` → GCC
- Check it matches your organization

---

#### **A7: "Redirect URI is invalid"**

**Where you see this:** Configuration Validator shows warning

**What it means:** Redirect URI doesn't match your D365 org URL pattern

**Valid formats:**
```
https://contoso.crm9.dynamics.com/WebResources/sidebar_sso_canvas.html
https://yourorg.crm9.dynamics.us/WebResources/sidebar_sso_canvas.html (GCC)
```

**How to fix:**
1. Open your D365 org URL in browser (copy from address bar)
2. Append: `/WebResources/sidebar_sso_canvas.html`
3. Paste into sidebar config `Redirect URI` field
4. Verify in Entra app (Authentication → SPA Redirect URIs matches exactly)
5. Save and refresh

**Common mistake:**
- Copying wrong URL (test org instead of prod)
- Missing `/WebResources/` part
- Extra slashes or spaces

---

### B. Token Acquisition Errors

---

#### **B1: "Token acquisition failed"**

**Where you see this:** Browser console: `[sidebar-sso-setup] Token acquisition failed: ...`

**What it means:** MSAL couldn't acquire a token from Entra

**How to fix:**
1. Check browser console for full error message
2. Verify Entra app is **not disabled**
3. Check if app has **API permissions** configured (see [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md), Step 2)
4. Try clearing browser cache (Ctrl+Shift+Delete) and signing in again
5. If popup didn't appear: Check browser popup blocker settings

**Common causes:**
- Popup blocked by browser
- API Scope not configured in Entra app
- User doesn't have permission to use the app
- Network connectivity issue

---

#### **B2: "SSO silent failed" (followed by popup)**

**Where you see this:** Browser console message (this is OK, expected behavior)

**What it means:** No cached token found, MSAL falling back to popup. **This is normal on first sign-in.**

**How to fix:**
- Nothing to fix, this is expected!
- First-time users will see a popup
- Subsequent visits will use silent SSO (no popup)

**If popup doesn't appear:**
- Check browser popup blocker
- Allow popups for your D365 org
- Refresh and try again

---

#### **B3: "Token expired" (after 1+ hours)**

**Where you see this:** Sidebar becomes unresponsive after extended use

**What it means:** Access token expired (normal, tokens expire after 60 min)

**How to fix:**
- Hard refresh page (Ctrl+Shift+R)
- Sidebar will reacquire token silently
- No user action needed

**Prevention:**
- This shouldn't happen normally (sidebar renews at 59 min)
- If happening frequently, check system clock (time sync issues?)

---

### C. Canvas & Copilot Errors

---

#### **C1: "Connecting to Copilot Studio..." (never completes)**

**Where you see this:** Sidebar shows loading spinner, never loads chat

**What it means:** Token exchange with Copilot failed, or Direct Line connection failed

**How to fix:**
1. Check browser console for error messages
2. Verify Token Endpoint URL is correct (copy from Copilot Studio directly)
3. Verify Copilot agent is **Published** (not Draft)
4. Try hard refresh (Ctrl+Shift+R)

---

#### **C1a: Picker works but chat stays blank when testing with file:// URL**

**Where you see this:** Local preview opens the picker, but selected agent does not start chat.

**What it means:** This is usually expected in local preview. Full interactive Entra sign-in and embedded host context are validated in model-driven app runtime.

**How to fix:**
1. Test from Dynamics side pane (hosted web resource) instead of opening HTML directly from disk.
2. Re-test selection flow in hosted runtime.
3. If hosted runtime still fails, capture console errors and continue with sections B and C in this guide.

---

#### **C1b: Picker shows fallback list instead of Dataverse agent rows**

**Where you see this:** Banner indicates Dataverse agents are unavailable and bundled list is shown.

**What it means:** Child table rows could not be loaded for the selected parent config, or no active rows were found.

**How to fix:**
1. Verify `sidebar_genericsidebaragent` exists in the same environment.
2. Verify at least one child row has:
  - `sidebar_isactive = Yes`
  - valid `sidebar_tokenendpoint`
  - lookup to correct `sidebar_genericsidebar` parent
3. Publish customizations and hard refresh.
5. Check if agent is running without errors (go to Copilot Studio → Check agent status)

**Common causes:**
- Agent is in Draft status (not published)
- Token endpoint URL copied incorrectly
- Copilot Studio temporary outage
- Network/firewall blocking connection

---

#### **C2: "OAuth card keeps appearing"**

**Where you see this:** Chat shows repeated "Sign in" buttons, loop guard engaged

**What it means:** OAuth card middleware detected repeated auth failures (max 2 silent attempts exceeded)

**How to fix:**
1. Check Copilot agent's Direct Line channel settings
2. Verify Direct Line is **enabled**
3. Try hard refresh (Ctrl+Shift+R) to reset loop counter
4. Check browser console for root cause error
5. If persists, check Copilot agent conversation logs

**Prevention:**
- Ensure Direct Line channel enabled in Copilot Studio
- Verify token endpoint is working (test via Postman)

---

#### **C3: "Chat not responding" (no messages sent)**

**Where you see this:** User types message but agent doesn't respond

**What it means:** Direct Line token is invalid or conversation disconnected

**How to fix:**
1. Close sidebar (X button)
2. Reopen sidebar ("Open Sidebar" button)
3. Chat will reinitialize with fresh token
4. Try message again

**Prevention:**
- Improve network stability
- Check if Copilot agent has any backend errors

---

#### **C4: "I'll need you to sign in" message appears**

**Where you see this:** Chat shows OAuth card but user is already authenticated

**What it means:** OAuth middleware failed to suppress message (rare bug)

**How to fix:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Click "New Chat" button in sidebar (top-right menu)
3. This clears session cache and restarts chat

**Prevention:**
- This shouldn't happen with v2.0.0+
- If persists, check middleware logs in browser console

---

### D. Dataverse & Configuration Errors

---

#### **D1: "Failed to load config from Dataverse"**

**Where you see this:** Browser console + error alert

**What it means:** Dataverse API call failed (network, permissions, or config ID invalid)

**How to fix:**
1. Verify Dataverse is accessible (check org status in admin center)
2. Check Dataverse permissions (user must have read access to `sidebar_genericsidebar` table)
3. Verify config ID is valid GUID format
4. Try hard refresh (Ctrl+Shift+R)

**Common causes:**
- Dataverse table doesn't have SSO fields yet (run PowerShell script from [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md), Step 5)
- User doesn't have table permissions
- Network timeout

---

#### **D2: "Dataverse table not found"**

**Where you see this:** Error message in console or sidebar

**What it means:** `sidebar_genericsidebar` table doesn't exist or is inaccessible

**How to fix:**
1. Go to Dataverse (Power Platform Admin)
2. Verify `sidebar_genericsidebar` table exists
3. Verify user has **read** permissions on table
4. If table missing, recreate it or restore from backup

---

#### **D3: SSO fields missing from Dataverse**

**Where you see this:** Configuration Validator shows "Missing fields" error after step 5

**What it means:** The 8 SSO fields haven't been added to the table yet

**How to fix:**
1. Run PowerShell script from [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md), Step 5
2. Or manually add fields via UI (see Step 5, Option B)
3. Verify all 8 fields exist:
   - `sidebar_sso_enabled`
   - `sidebar_auth_client_id`
   - `sidebar_auth_tenant_id`
   - `sidebar_auth_api_scope`
   - `sidebar_auth_token_endpoint`
   - `sidebar_auth_redirect_uri`
   - `sidebar_auth_scopes`
   - `sidebar_auth_client_secret`

---

### E. Browser & Network Errors

---

#### **E1: "CORS error" or "No 'Access-Control-Allow-Origin' header"**

**Where you see this:** Browser console (red error)

**What it means:** Token endpoint doesn't allow requests from your D365 org

**How to fix:**
1. Verify Token Endpoint URL is exactly correct (copy from Copilot Studio)
2. Check if Copilot agent's CORS settings need adjustment
3. Verify Redirect URI is registered in Entra (see [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md), Step 1)
4. Try from different network (to rule out firewall)

**Note:** This usually means the Token Endpoint is incorrect

---

#### **E2: "Connection refused" or "Unable to reach server"**

**Where you see this:** Browser console network error

**What it means:** Token endpoint URL is unreachable (wrong URL, DNS, firewall, or service down)

**How to fix:**
1. Copy token endpoint URL from Copilot Studio (don't edit!)
2. Test in Postman/curl to verify it's reachable
3. Check if Copilot Studio is in an outage (check status.microsoft.com)
4. Check firewall/proxy settings
5. Try from different network

---

#### **E3: "401 Unauthorized"**

**Where you see this:** Browser console HTTP error

**What it means:** Token exchange failed, Copilot rejected the accessToken

**How to fix:**
1. Verify accessToken is correctly passed from bootstrap
2. Verify API Scope in Dataverse matches Copilot's expected scope
3. Verify Copilot agent is configured to accept this API scope
4. Check if user has permission to access Copilot agent

---

### F. Browser Cache & Session Issues

---

#### **F1: Changes not taking effect after updating config**

**Where you see this:** Modify Dataverse config but sidebar still shows old values

**What it means:** Browser cached old config or token

**How to fix:**
1. **Hard refresh:** Ctrl+Shift+R (not just F5)
2. **Close sidebar:** Click X button
3. **Reopen sidebar:** Click "Open Sidebar" button again
4. **Clear browser cache:** Settings → Privacy → Clear browsing data

---

#### **F2: "New Chat" button not working**

**Where you see this:** Click button but chat doesn't reset

**What it means:** Session cache not cleared

**How to fix:**
1. Hard refresh page (Ctrl+Shift+R)
2. Close sidebar entirely
3. Close browser tab and reopen
4. Try again

---

#### **F3: Logged-in user changed but sidebar still shows old user**

**Where you see this:** SSO shows previous user's data

**What it means:** Token cache still holds old session

**How to fix:**
1. Sign out of D365
2. Close browser tab
3. Open D365 again, sign in as new user
4. Open sidebar (will get new token)

---

### G. Security & Permission Errors

---

#### **G1: "User doesn't have permission to access sidebar config"**

**Where you see this:** User can open D365 but sidebar fails

**What it means:** User doesn't have read access to `sidebar_genericsidebar` table in Dataverse

**How to fix:**
1. Give user **read** permission on `sidebar_genericsidebar` table
2. In Dataverse: Security Roles → add read privilege to table
3. Assign security role to user
4. User logs out and back in

---

#### **G2: "Client secret is invalid"**

**Where you see this:** Token acquisition fails with "invalid_client"

**What it means:** Client secret in Dataverse doesn't match Entra app

**How to fix:**
1. Go to Azure Portal → Your app → Certificates & secrets
2. Create a **new client secret**
3. Copy the secret value (do this immediately, it won't show again)
4. Update Dataverse field `sidebar_auth_client_secret`
5. Save
6. Hard refresh sidebar

---

### H. GCC/GCCH Specific Errors

---

#### **H1: "Authority endpoint not found"**

**Where you see this:** MSAL initialization fails in GCC/GCCH

**What it means:** Authority URL doesn't match region

**How to fix (GCC):**
1. Verify authority is: `https://login.microsoftonline.com/<tenant-id>`
2. Verify Token Endpoint contains `.powerplatform.microsoft.us`

**How to fix (GCCH):**
1. Verify authority is: `https://login-us.microsoftonline.us/<tenant-id>`
2. Verify Token Endpoint contains `.powerplatform.microsoft.us`
3. Verify app is registered in GCC/GCCH Entra instance (not commercial)

---

#### **H2: "Token endpoint URL mismatch between org and config"**

**Where you see this:** Sidebar in GCC org but config points to commercial endpoint

**What it means:** Environment mismatch

**How to fix:**
1. Verify org URL contains `.crm9.dynamics.us` (GCC) or `.dyn365.cms` (GCCH)
2. Get token endpoint from region-specific Copilot Studio
3. Update Dataverse config with correct endpoint

---

### I. Debugging Tips

---

#### **Enable Debug Logging**

In browser console, run:
```javascript
// Enable detailed logging
localStorage.setItem('sidebar_sso_debug', 'true');
// Reload page
location.reload();
// Check console for [sidebar-sso-setup] messages
```

#### **Check MSAL State**

In browser console:
```javascript
// See cached accounts
console.log(window.SidebarSSO); // Shows if libraries loaded
// Check sessionStorage
console.log(sessionStorage.getItem('ai_sessions')); // Chat history
```

#### **Validate Token Endpoint**

In browser console:
```javascript
// Test if endpoint is reachable
fetch('https://your-token-endpoint-url', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <your-token>' }
})
.then(r => r.text())
.catch(e => console.error(e));
```

---

## Contact & Escalation

- **Setup questions:** See [ADMIN_SETUP_GUIDE.md](ADMIN_SETUP_GUIDE.md)
- **Security concerns:** See [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- **Microsoft Support:** Submit ticket via Azure portal or Power Platform admin center
- **Copilot Studio Support:** In-app Help → Support

---

**Version:** 2.0.1
**Last Updated:** 2026-08-05
**Still stuck?** Run [Configuration Validator](sidebar_sso_config_validator.html) and provide the output to support
