# Generic Sidebar SSO — Security Guide

**Version:** 2.0.1
**Last Updated:** 2026-08-05
**Audience:** Security Officers, Platform Administrators, Developers

---

## Table of Contents
1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Token Lifecycle](#token-lifecycle)
4. [Credential Storage](#credential-storage)
5. [HIPAA Compliance](#hipaa-compliance)
6. [GCC/GCCH Considerations](#gcccch-considerations)
7. [Incident Response](#incident-response)

---

## Overview

Generic Sidebar SSO implements OAuth 2.0 PKCE (Proof Key for Code Exchange) with zero-hardcoding principles. This guide covers:

- **How tokens flow** through the system
- **Where secrets are stored** and how they're protected
- **Compliance requirements** for regulated industries
- **Regional considerations** for GCC/GCCH
- **Incident response** procedures

### Key Security Principles

✅ **Zero Hardcoding:** No Client IDs, Tenant IDs, or Token Endpoints in code  
✅ **Dataverse-Driven:** Runtime configuration is stored in Dataverse, not source code
✅ **PKCE Flow:** Proof Key for Code Exchange prevents token interception  
✅ **Session Scoped:** Tokens cached in sessionStorage, cleared on browser close  
✅ **HTTPS Only:** All token endpoints must be HTTPS  
✅ **No Token Logging:** Tokens never written to console or logs  

### Runtime Validation Notes

- The side-panel picker passes runtime token data to the canvas using a temporary query payload.
- The canvas removes query token values from the visible URL immediately after parsing (`history.replaceState`).
- End-to-end SSO verification must be performed in hosted Dynamics runtime, not `file://` preview.

---

## Security Architecture

### Component Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER (User's Machine)                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [sidebar_sidebar.js]                                           │
│  ├─ Reads SSO config from Dataverse                             │
│  ├─ Detects SSO enabled flag                                    │
│  └─ Routes to SSO canvas or standard canvas                     │
│                                                                   │
│  [sidebar_sso_bootstrap.js] - MSAL 2.38.3                       │
│  ├─ Initializes PublicClientApplication (PKCE)                 │
│  ├─ Attempts silent SSO (browser cache)                         │
│  ├─ Falls back to popup on first sign-in                        │
│  ├─ Returns accessToken (60s expiry buffer)                     │
│  └─ NO SECRETS HARDCODED                                        │
│                                                                   │
│  [sidebar_sso_setup.js]                                         │
│  ├─ Fetches config from Dataverse                               │
│  ├─ Validates required fields                                   │
│  ├─ Calls bootstrap.acquireToken()                              │
│  └─ Passes token to canvas via URL (then strips from URL bar)   │
│                                                                   │
│  [sidebar_sso_canvas.html]                                      │
│  ├─ Reads token from URL param                                  │
│  ├─ Exchanges for Direct Line token (Copilot Studio)            │
│  ├─ Strips token from visible URL bar (history.replaceState)    │
│  ├─ Renders Web Chat with OAuth middleware                      │
│  └─ Caches Direct Line token in sessionStorage                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓                                  ↓
┌──────────────────────────┐   ┌──────────────────────────┐
│ DATAVERSE (Tenant)       │   │ COPILOT STUDIO (Tenant)  │
├──────────────────────────┤   ├──────────────────────────┤
│ sidebar_genericsidebar   │   │ Agent + Direct Line      │
│ ├─ Client ID             │   │ ├─ Token Endpoint        │
│ ├─ Tenant ID             │   │ ├─ Session Token         │
│ ├─ API Scope             │   │ └─ Conversation State    │
│ ├─ Token Endpoint        │   │                          │
│ ├─ Redirect URI          │   │ Exchanges user tokens    │
│ └─ No browser secret     │   │ for Direct Line tokens   │
│                          │   │                          │
│ Access Control:          │   │ Access Control:          │
│ ├─ Dataverse RBAC        │   │ ├─ AAD Token Validation  │
│ ├─ D365 Org isolation    │   │ ├─ Agent Permissions     │
│ └─ Table-level security  │   │ └─ IP Restrictions (opt) │
└──────────────────────────┘   └──────────────────────────┘
```

### Security Boundaries

| Boundary | Protection | Responsibility |
|----------|-----------|-----------------|
| **Code→Dataverse** | HTTPS TLS 1.2+ | Azure infrastructure |
| **Browser→Copilot** | HTTPS TLS 1.2+ | Azure infrastructure |
| **Configuration Storage** | Dataverse RBAC + TLS | Tenant administrator |
| **Token Cache** | sessionStorage (not persistent) | Browser isolation |
| **Redirect Validation** | PKCE + URL match | MSAL library + Entra |

### Query Token Handling

The runtime currently uses query payload handoff between side panel and canvas. The canvas removes the values immediately after parsing, but this remains a residual risk until an origin-validated inter-frame handoff replaces it. Current controls are:

1. HTTPS-only hosting.
2. Immediate URL cleanup in canvas after parsing token data.
3. No token logging in console/app logs.
4. Session-scoped token cache.

Recommended future hardening:

1. Replace query payload handoff with `postMessage` to reduce transient URL exposure.
2. Add explicit origin checks for inter-frame communication.

### Validation status

The local configuration validator checks supplied-value format and consistency only. It does not authenticate with Entra ID, read Dataverse, or call a Copilot Studio token endpoint. Hosted Dynamics validation is required before production SSO approval. See `ADMIN_VALIDATION_CHECKLIST.md`.

---

## Token Lifecycle

### Access Token (Entra → MSAL)

**Lifetime:** 60 minutes (default)  
**Buffer:** Sidebar checks 60 seconds before expiry → renews early  
**Storage:** sessionStorage (cleared on browser close)  
**Usage:** User identity, requested by app on behalf of user

```
User signs in (popup or silent)
    ↓
Entra issues accessToken (exp: 1 hour)
    ↓
Sidebar caches token in sessionStorage
    ↓
When token age > 1h - 60s (i.e., > 59 min old)
    ↓
Sidebar calls MSAL.acquireTokenSilent() again
    ↓
New token issued → cache updated
```

**Security:** Token never written to disk, never logged, cleared on session end.

### Direct Line Token (Copilot Studio → Canvas)

**Lifetime:** 30–60 minutes (Copilot-controlled)  
**Storage:** In-memory Direct Line client for the active page
**Usage:** Authorizes direct line WebSocket connection to Copilot agent

```
Canvas exchanges (accessToken, tokenEndpoint)
    ↓
POST to Copilot token endpoint with Bearer accessToken
    ↓
Copilot validates accessToken via Entra
    ↓
Copilot issues Direct Line token (exp: 30–60 min)
    ↓
WebChat uses Direct Line token to connect to agent
```

**Security:** Direct Line token is Copilot-scoped (cannot be used elsewhere), browser-scoped (cannot be extracted by other domains).

### Refresh Token (Entra, Silent SSO)

**Lifetime:** Up to 90 days (with activity)  
**Storage:** MSAL manages in sessionStorage  
**Usage:** Silently refresh accessToken without user interaction

```
First sign-in: User grants consent
    ↓
Entra issues accessToken + refreshToken + ID token
    ↓
MSAL caches all 3 in sessionStorage
    ↓
On next page load: MSAL calls ssoSilent()
    ↓
Uses refreshToken to get new accessToken (no user interaction)
    ↓
User signed in automatically
```

**Security:** Refresh tokens are single-use. If compromised, Entra validates and rotates. MSAL handles all refresh token logic internally.

---

## Credential Storage

### Runtime Configuration and Tokens

| Secret | Location | Protection | Rotation |
|--------|----------|-----------|----------|
| **Client ID** | Dataverse table `sidebar_auth_client_id` | Dataverse RBAC + TLS | Never (public) |
| **Tenant ID** | Dataverse table `sidebar_auth_tenant_id` | Dataverse RBAC + TLS | Never (public) |
| **API Scope** | Dataverse table `sidebar_auth_api_scope` | Dataverse RBAC + TLS | Quarterly (policy) |
| **Token Endpoint** | Dataverse table `sidebar_auth_token_endpoint` | Dataverse RBAC + TLS | On agent regeneration |
| **Redirect URI** | Dataverse table `sidebar_auth_redirect_uri` | Dataverse RBAC + TLS | On environment change |
| **Client Secret** | Not used by browser SSO | Do not store in browser-facing configuration | N/A |
| **Access Token (runtime)** | Browser sessionStorage | Browser isolation | Automatic (1h expiry) |
| **Refresh Token (runtime)** | Browser sessionStorage | Browser isolation | Automatic (90d expiry) |
| **Direct Line Token** | Active page memory | Browser isolation | On page close/reload |

### Best Practices for Secret Management

#### ✅ DO:

1. **Use environment variables for sensitive values:**
   ```powershell
   $clientId = [System.Environment]::GetEnvironmentVariable("SIDEBAR_CLIENT_ID")
   ```

2. **Keep browser SSO public-client only:**
    - Generic Sidebar uses MSAL authorization code flow with PKCE.
    - Do not add a client secret to Dataverse values read by browser web resources.
    - Store any service-to-service secret in a server-side secret store and never pass it to the browser.

3. **Rotate server-side secrets according to policy:**
    - Entra app → Certificates & secrets → Delete old secret → Create new.
    - Update the server-side secret store; never update a browser-facing configuration record.

4. **Audit access to sidebar config:**
   - Monitor Dataverse audit log for SSO field changes
   - Alert on Client ID or Token Endpoint modifications

5. **Use HTTPS everywhere:**
   - Redirect URI must be `https://` (not `http://`)
   - Token endpoints must be `https://`

#### ❌ DON'T:

1. ❌ Hardcode Client IDs in code
2. ❌ Treat temporary query-string token handoff as a long-term security boundary
3. ❌ Log tokens to console or application logs
4. ❌ Store tokens in localStorage permanently
5. ❌ Use same Client ID across multiple environments
6. ❌ Share token endpoints in chat/email (they identify your agent)
7. ❌ Commit Dataverse configs to git

---

## HIPAA Compliance

If you're processing Protected Health Information (PHI), follow these controls:

### Encryption

✅ **In Transit:**
- HTTPS TLS 1.2+ for all API calls (enforced by Azure)
- Direct Line uses HTTPS + WebSocket Secure (WSS)

✅ **At Rest:**
- Dataverse stores secrets encrypted (via Field-level encryption)
- Enable Dataverse encryption key management in admin center

### Audit & Logging

✅ **Who accessed what:**
- Enable Dataverse audit on `sidebar_genericsidebar` table
- Log config changes (Client ID, Token Endpoint)
- Audit trail: Admin center → Dataverse → Audit

✅ **Token Usage:**
- Enable Copilot Studio conversation logging
- Archive conversations for compliance review
- Do NOT log user tokens themselves

### Data Isolation

✅ **Per-Organization:**
- Each D365 org has its own Dataverse instance
- SSO config isolated per org
- No cross-org token sharing

✅ **Per-User:**
- Each user gets own accessToken + refresh token
- Sidebar cannot access other users' tokens
- MSAL enforces browser isolation

### Consent & Privacy

✅ **First-Time Sign-In:**
- Popup shows Microsoft sign-in page
- User sees app name + scopes requested
- User grants/denies consent

✅ **Privacy:**
- Sidebar reads User.Read scope (user's basic profile)
- No access to health records, diagnoses, or medical data
- Copilot agent controls what data it reads

### Incident Response

If token compromise is suspected:

1. **Revoke the affected sessions and credentials:**
    - Revoke the user's Entra sessions and access tokens.
    - If a separate server-side integration credential may be affected, rotate it in its server-side secret store.
    - Generic Sidebar browser SSO has no client secret to rotate and stores no secret in Dataverse.

2. **Revoke all sessions:**
   - Go to Entra app → Sessions (if available)
   - Sign out all users

3. **Review audit log:**
   - Dataverse audit → Check who accessed SSO config
   - Check token usage patterns (anomalies)

4. **Notify affected users:**
   - Security team to send security alert
   - Request password change

---

## GCC/GCCH Considerations

### Commercial Cloud
- **Entra Endpoint:** `https://login.microsoftonline.com`
- **Copilot Token Endpoint:** `https://...environment.api.powerplatform.microsoft.com/...`
- **Region:** `US (default)`

### GCC (Government Community Cloud)
- **Entra Endpoint:** `https://login.microsoftonline.com` (same public endpoint)
- **Copilot Token Endpoint:** `https://...environment.api.powerplatform.microsoft.us/...` (note `.us` suffix)
- **Region:** `US Government`
- **Isolation:** GCC isolated tenant (no commercial data)

### GCCH (GCC High)
- **Entra Endpoint:** `https://login-us.microsoftonline.us` (separate endpoint)
- **Copilot Token Endpoint:** `https://...environment.api.powerplatform.microsoft.us/...`
- **Region:** `US Government (High)`
- **Isolation:** Maximum isolation, highest sensitivity workloads
- **Requires:** Separate Entra instance, separate app registration

### Deployment Steps

**For GCC/GCCH:**

1. Create app registration **in your region-specific Entra instance**
2. Set authority to region-specific endpoint:
   ```javascript
   authority: "https://login-us.microsoftonline.us/<tenant-id>" // GCCH example
   ```
3. Copy token endpoint from region-specific Copilot Studio
4. Store all config in region-specific Dataverse

**Verify Region:**
- Check Dataverse org URL:
  - `.crm9.dynamics.com` → Commercial
  - `.crm9.dynamics.us` → GCC
  - `.crm.dyn365.cms` → GCCH

---

## Incident Response

### Token Compromise Checklist

**Immediate (0–5 minutes):**
- [ ] Revoke affected Entra sessions and access tokens
- [ ] Rotate any affected server-side integration credential in its secret store
- [ ] Monitor for suspicious Copilot activity

**Short-term (5–30 minutes):**
- [ ] Check Dataverse audit log for unauthorized config changes
- [ ] Review Copilot conversation logs for unusual queries
- [ ] Gather evidence (timestamps, IP addresses, user accounts)

**Medium-term (1–24 hours):**
- [ ] Notify security team
- [ ] Conduct forensic review
- [ ] Document incident in security log

**Long-term (1–7 days):**
- [ ] Post-incident review meeting
- [ ] Update security policies if needed
- [ ] Communicate findings to stakeholders

### Suspicious Activity Indicators

⚠️ **Watch for:**
- Unexpected Client ID/Token Endpoint changes in Dataverse
- Unusual Copilot agent queries (e.g., data exfiltration attempts)
- Failed token exchanges (401 errors)
- Redirect URI changes
- API scope modifications without authorization

---

## Secrets Checklist

Before going to production:

- [ ] Client ID is UUID format (e.g., `3a669365-5420-...`)
- [ ] Tenant ID is UUID format (e.g., `a8037933-4d29-...`)
- [ ] API Scope starts with `api://` (e.g., `api://3a669365.../Test.Read`)
- [ ] Token Endpoint is HTTPS + contains `directline/token`
- [ ] Redirect URI matches your org URL exactly
- [ ] No browser client secret exists in Dataverse configuration
- [ ] Dataverse audit enabled on SSO fields
- [ ] No secrets in source code (check git history)
- [ ] HIPAA compliance controls enabled (if applicable)
- [ ] Region-specific endpoints verified

---

## Support & Escalation

- **Security Issue:** Contact Microsoft Security Response Center (MSRC)
- **Token Problem:** Check browser console logs, validate config with validator tool
- **Entra Problem:** Contact Entra support via Azure portal
- **Copilot Problem:** Contact Copilot Studio support

---

**Version:** 2.0.1
**Last Updated:** 2026-08-05
**Next:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for error resolution
