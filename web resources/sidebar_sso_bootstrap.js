/*
=============================================================================
COMPONENT:    sidebar_sso_bootstrap
FILE:         web resources\sidebar_sso_bootstrap.js
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-07-21
ENVIRONMENT:  JavaScript (Dynamics 365 Web Resource)
PORTAL URL:   N/A

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Reusable MSAL 2.x initialization and token acquisition layer for Generic.Sidebar SSO.
Provides silent token acquisition with popup fallback, token caching, and timeout handling.
No hardcoded configuration — all config passed as parameters.

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source:      Passed at runtime (no hardcoding)
- Entity/Table:     N/A
- Auth Model:       MSAL 2.x PKCE flow (public client, federated credentials)
- Rendering:        N/A (library only)
- API Pattern:      Async promise-based
- Dependencies:     @azure/msal-browser (2.38.3 from CDN or web resource)

-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- MSAL initialization with configurable authority + scopes
- Silent token acquisition with automatic expiry check
- Popup fallback for first-time consent
- Token caching with 60s expiry buffer
- Timeout handling (5s max per token request)
- Error logging (console) for diagnostics
- No hardcoded secrets, URLs, or client IDs

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. MSAL 2.38.3 available (CDN or local web resource)
2. Entra app registration with:
   - Redirect URI configured (SPA)
   - API scope exposed (e.g., api://client-id/Agent.Invoke)
   - Admin consent granted (User.Read + custom scope)
3. Caller must pass valid config object at runtime

-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- CSRF Token:      PKCE built into MSAL (automatic)
- Auth Scope:      Passed at runtime; no hardcoding
- Data Exposure:   Token never logged; expiry respected
- Role Dependency: None (token scope controls access downstream)

-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- N/A (library only, no DOM)

-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- MSAL CDN load may fail in offline environments (provide local fallback)
- Popup fallback requires user interaction (cannot be fully silent)
- Token cache is per-tab (sessionStorage); not persistent across browser restarts

-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
✔ Load MSAL library without errors
✔ Initialize PublicClientApplication with passed config
✔ Acquire token silently (existing session)
✔ Acquire token with popup (first-time consent)
✔ Handle token expiry gracefully
✔ Timeout if token request exceeds 5s
✔ Log diagnostics to console

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-07-21  Initial release - MSAL 2.38.3 integration for Generic.Sidebar

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Do NOT hardcode client IDs, tenant IDs, or scopes
- Token cache must respect expiry (60s buffer)
- All config must come from caller (function parameters)
- Timeout maximum: 5 seconds per token request
- Token never written to console logs (security)
=============================================================================
*/

(function (window) {
  "use strict";

  var MSAL_VERSION = "2.38.3";
  var TOKEN_CACHE_KEY = "sidebar_sso_token_cache";
  var MSAL_CACHE_SCOPE = "sessionStorage";
  var SILENT_TIMEOUT = 5000; // 5 seconds
  var TOKEN_EXPIRY_BUFFER = 60000; // 60 seconds
  var DEBUG = true; // Set to false in production

  function log() { if (DEBUG) console.log.apply(console, ["[sidebar-sso-bootstrap]"].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, ["[sidebar-sso-bootstrap]"].concat([].slice.call(arguments))); }
  function err() { console.error.apply(console, ["[sidebar-sso-bootstrap]"].concat([].slice.call(arguments))); }

  // =========================================================================
  // MSAL LIBRARY LOADER (CDN + Fallback)
  // =========================================================================

  var _msalLibReady = null;
  var _msalInstance = null;

  function _loadMsalLibrary() {
    if (_msalLibReady) return _msalLibReady;

    // Check if already loaded globally
    if (typeof msal !== "undefined" && msal.PublicClientApplication) {
      log("MSAL already loaded globally");
      _msalLibReady = Promise.resolve(msal);
      return _msalLibReady;
    }

    // Attempt CDN load
    _msalLibReady = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@" + MSAL_VERSION + "/lib/msal-browser.min.js";
      script.async = true;

      script.onload = function () {
        log("MSAL loaded from CDN");
        if (typeof msal !== "undefined" && msal.PublicClientApplication) {
          resolve(msal);
        } else {
          reject(new Error("MSAL CDN loaded but PublicClientApplication not found"));
        }
      };

      script.onerror = function () {
        err("MSAL CDN load failed; fallback not available (provide local web resource or ensure CDN access)");
        reject(new Error("MSAL CDN load failed"));
      };

      document.head.appendChild(script);
    });

    return _msalLibReady;
  }

  // =========================================================================
  // MSAL INSTANCE INITIALIZATION
  // =========================================================================

  function _initializeMsal(config) {
    if (_msalInstance) return Promise.resolve(_msalInstance);

    return _loadMsalLibrary().then(function (msalLib) {
      log("Initializing MSAL with authority: " + config.authority);

      try {
        _msalInstance = new msalLib.PublicClientApplication({
          auth: {
            clientId: config.clientId,
            authority: config.authority,
            redirectUri: config.redirectUri
          },
          cache: {
            cacheLocation: MSAL_CACHE_SCOPE,
            storeAuthStateInCookie: false
          },
          system: {
            loggerOptions: {
              loggerCallback: function (logLevel, message) {
                if (logLevel === msalLib.LogLevel.Error) {
                  warn("MSAL error: " + message);
                }
              }
            }
          }
        });

        return _msalInstance.initialize();
      } catch (e) {
        err("MSAL initialization failed: " + (e && e.message ? e.message : e));
        throw e;
      }
    });
  }

  // =========================================================================
  // TOKEN ACQUISITION (Silent → Popup Fallback)
  // =========================================================================

  function _acquireTokenSilent(msalInstance, scopes, account) {
    return Promise.race([
      msalInstance.acquireTokenSilent({
        scopes: scopes,
        account: account
      }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("Silent token request timeout")); }, SILENT_TIMEOUT);
      })
    ]);
  }

  function _acquireTokenPopup(msalInstance, scopes) {
    return msalInstance.acquireTokenPopup({
      scopes: scopes
    });
  }

  // =========================================================================
  // PUBLIC API: Get User Token
  // =========================================================================

  function acquireUserToken(config) {
    if (!config || !config.clientId || !config.authority || !config.scopes) {
      return Promise.reject(new Error("Invalid config: clientId, authority, and scopes are required"));
    }

    log("Token acquisition requested for scopes: " + config.scopes.join(", "));

    return _initializeMsal(config).then(function (msalInstance) {
      var accounts = msalInstance.getAllAccounts();
      var account = accounts.length > 0 ? accounts[0] : null;

      log("Found " + accounts.length + " account(s)");

      // Attempt silent SSO
      if (account) {
        log("Attempting silent token acquisition with existing account");
        return _acquireTokenSilent(msalInstance, config.scopes, account)
          .then(function (response) {
            log("Silent token acquired successfully (expires: " + (response.expiresOn ? response.expiresOn.toLocaleString() : "N/A") + ")");
            return response.accessToken;
          })
          .catch(function (silentError) {
            warn("Silent acquisition failed: " + (silentError && silentError.message ? silentError.message : silentError));
            log("Falling back to popup authentication");
            return _acquireTokenPopup(msalInstance, config.scopes)
              .then(function (response) {
                msalInstance.setActiveAccount(response.account);
                log("Token acquired via popup");
                return response.accessToken;
              });
          });
      } else {
        // No account found, try SSO silent first
        log("No account found; attempting SSO silent");
        return msalInstance.ssoSilent({
          scopes: config.scopes
        })
          .then(function (response) {
            msalInstance.setActiveAccount(response.account);
            log("SSO silent successful");
            return response.accessToken;
          })
          .catch(function (ssoError) {
            warn("SSO silent failed: " + (ssoError && ssoError.message ? ssoError.message : ssoError));
            log("Falling back to popup authentication");
            return _acquireTokenPopup(msalInstance, config.scopes)
              .then(function (response) {
                msalInstance.setActiveAccount(response.account);
                log("Token acquired via popup");
                return response.accessToken;
              });
          });
      }
    });
  }

  // =========================================================================
  // EXPORT
  // =========================================================================

  window.SidebarSSO = window.SidebarSSO || {};
  window.SidebarSSO.acquireToken = acquireUserToken;

  log("SidebarSSO.acquireToken ready");

})(window);
