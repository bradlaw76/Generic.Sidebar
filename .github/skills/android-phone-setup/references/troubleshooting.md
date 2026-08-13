# Troubleshooting Guide

## Quick Diagnostics

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Token endpoint returns 500 | Missing `ACS_CONNECTION_STRING` | Set app setting in Function App |
| Token endpoint returns 404 | Function not deployed | Re-deploy with `az functionapp deployment` |
| Bundle endpoint returns 404 | `acs-sdk-bundle.js` missing from deploy | Rebuild bundle and redeploy |
| CORS error in browser console | D365 domain not in allowed origins | Add CORS origin to Function App |
| "CallAgent failed" in console | Invalid/expired token | Check token endpoint returns fresh token |
| No audio on call | Microphone permission denied | Grant mic access in browser settings |
| Phone loads but no ACS option | ACS settings empty | Configure via Settings screen or Dataverse |
| Genesys softphone doesn't react | localStorage event not firing | Both components must be in same D365 session |
| Call drops after 10 minutes | ACS token expired mid-call | Token has 24h expiry; check clock sync |
| "Cannot read properties of undefined" | ACS SDK bundle not loaded | Verify bundle URL is accessible |

## Detailed Fixes

### CORS Errors

**Error:** `Access to fetch at '...' from origin 'https://yourorg.crm.dynamics.com' has been blocked by CORS policy`

```bash
# Check current CORS settings
az functionapp cors show \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs

# Add your D365 domain
az functionapp cors add \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --allowed-origins "https://yourorg.crm.dynamics.com"
```

### Token Endpoint Failing

**Test the endpoint directly:**
```bash
curl -s https://your-func.azurewebsites.net/api/getAcsToken | jq .
```

**Expected response:**
```json
{
  "token": "eyJ...",
  "expiresOn": "2026-03-09T...",
  "userId": "8:acs:..."
}
```

**If 500 error — check app settings:**
```bash
az functionapp config appsettings list \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --query "[?name=='ACS_CONNECTION_STRING'].value" -o tsv
```

**If empty — set it:**
```bash
az functionapp config appsettings set \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --settings "ACS_CONNECTION_STRING=endpoint=https://..."
```

### Bundle Not Loading

**Test bundle endpoint:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  https://your-func.azurewebsites.net/api/serveAcsBundle
```

Should return `200`. If `404`:

1. Check the bundle file exists in the deployed function:
   ```bash
   az functionapp deployment list-publishing-profiles \
     --name fn-sidebar-acs \
     --resource-group rg-sidebar-acs
   ```

2. Rebuild and redeploy:
   ```bash
   cd acs-bundle
   npm install
   npx esbuild entry.js --bundle --outfile=../azure-functions/serveAcsBundle/acs-sdk-bundle.js --format=iife
   cd ../azure-functions
   zip -r deploy.zip . -x "node_modules/*"
   az functionapp deployment source config-zip \
     --name fn-sidebar-acs \
     --resource-group rg-sidebar-acs \
     --src deploy.zip
   ```

### Microphone Permission

Browsers require HTTPS and user consent for microphone access.

**Chrome:** Click lock icon → Site settings → Microphone → Allow  
**Edge:** Click lock icon → Permissions → Microphone → Allow  
**Firefox:** Click shield icon → Permissions → Allow microphone

If running locally (HTTP), use `localhost` — browsers allow mic on localhost without HTTPS.

### Phone Not Appearing in D365 Sidebar

1. Verify web resource exists:
   - Settings → Customizations → Web Resources
   - Search for `gensoft_AndroidCellPhone`
2. Verify it's published (unpublished resources don't load)
3. Check the sidebar pane configuration references the correct web resource name
4. Clear browser cache and reload D365

### localStorage Integration Issues

The phone writes to `localStorage.genericSimCall`. If the Genesys Softphone isn't reacting:

1. Open browser DevTools → Application → Local Storage
2. Look for `genericSimCall` key after placing a call
3. Verify the JSON payload has `"state": "RINGING"` or `"state": "CONNECTED"`
4. Both the phone and softphone must be in the **same browser tab/session**

### Azure Resource Cleanup

To remove all resources (if starting over):

```bash
az group delete --name rg-sidebar-acs --yes --no-wait
```

This deletes the resource group and everything inside it (Function App, Storage, ACS resource). Phone numbers are released when the ACS resource is deleted.
