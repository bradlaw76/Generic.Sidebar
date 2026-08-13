# Configuration Options

Three approaches for configuring ACS endpoints on the Android Phone Simulator.

## Option A: Settings Screen (Recommended for Quick Setup)

The phone has a built-in Settings screen. Users enter values that persist to `localStorage`.

| Setting | Key | Default |
|---------|-----|---------|
| ACS Token URL | `acsTokenUrl` | (empty — ACS disabled) |
| ACS Phone Number | `acsPhoneNumber` | (empty — ACS disabled) |
| ACS Bundle URL | `acsBundleUrl` | Derived from Token URL |

**Behavior when empty:** ACS calling is disabled; phone falls back to simulated mode.

### How to Configure

1. Open the phone in D365 (or standalone HTML)
2. Tap the **gear icon** (⚙) on the phone home screen
3. Scroll to **ACS Settings** section
4. Enter:
   - **Token URL**: `https://your-func.azurewebsites.net/api/getAcsToken`
   - **Phone Number**: `+1XXXXXXXXXX`
5. Tap **Save**

### Pros / Cons

| Pro | Con |
|-----|-----|
| Zero code changes | Per-browser (not shared) |
| Instant toggle on/off | User must know the URLs |
| No Dataverse dependency | Clears if localStorage cleared |

---

## Option B: Dataverse Config (Enterprise)

Store ACS settings in the existing `gensoft_genericsoftphone` Dataverse table so they're shared across all users in the D365 environment.

### Required Columns

Add these to `gensoft_genericsoftphone`:

| Display Name | Schema Name | Type | Max Length |
|-------------|-------------|------|-----------|
| ACS Token Endpoint | `gensoft_acstokenurl` | Single Line Text | 500 |
| ACS Outbound Number | `gensoft_acsoutboundnumber` | Single Line Text | 20 |

### How the Phone Reads Config

On init, the phone queries:
```javascript
Xrm.WebApi.retrieveRecord("gensoft_genericsoftphone", recordId,
  "?$select=gensoft_acstokenurl,gensoft_acsoutboundnumber")
```

If values are present → ACS mode enabled.  
If empty → Falls back to localStorage settings, then to simulated mode.

### Pros / Cons

| Pro | Con |
|-----|-----|
| Shared across all users | Requires Dataverse schema changes |
| Centrally managed | Needs Xrm.WebApi access |
| Survives browser clears | Slightly more complex setup |

---

## Option C: Auto-Discovery (Cleanest)

The token endpoint returns all configuration in its response. The phone only needs **one URL** configured.

### Modified Token Response

```json
{
  "token": "eyJ...",
  "expiresOn": "2026-03-09T14:30:00.000Z",
  "userId": "8:acs:...",
  "phoneNumber": "+14046897084",
  "bundleUrl": "https://fn-sidebar-acs.azurewebsites.net/api/serveAcsBundle"
}
```

### Required Code Changes

In `azure-functions/getAcsToken/index.js`, add to response body:
```javascript
phoneNumber: process.env.ACS_PHONE_NUMBER || '+1XXXXXXXXXX',
bundleUrl: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/serveAcsBundle`
```

### Pros / Cons

| Pro | Con |
|-----|-----|
| Single URL to configure | Requires function code change |
| Self-documenting | Phone must handle new fields |
| Easy to switch environments | Token endpoint does more |

---

## Fallback Chain

The phone uses this priority:

```
1. Dataverse config (Option B)     — if Xrm.WebApi available and fields populated
2. localStorage settings (Option A) — if set in Settings screen
3. Hardcoded defaults               — if present in HTML
4. Disabled                          — pure simulated mode
```
