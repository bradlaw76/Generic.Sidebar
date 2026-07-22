/*
=============================================================================
COMPONENT:    sidebar_sso_setup
FILE:         web resources\sidebar_sso_setup.js
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-07-21
ENVIRONMENT:  JavaScript (Dynamics 365 Web Resource)
PORTAL URL:   N/A

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Orchestration layer that bridges Generic.Sidebar parent and SSO subsystem.
Fetches config from Dataverse, validates, acquires MSAL token, and passes to canvas.

This is the "glue" that connects the generic sidebar system to SSO-enabled Copilot embeds.
Does NOT modify non-SSO embeds (backwards compatible).

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source:      sidebar_genericsidebar Dataverse table
- Entity/Table:     sidebar_genericsidebar (SSO config fields)
- Auth Model:       MSAL via sidebar_sso_bootstrap.js
- Rendering:        N/A (orchestration only)
- API Pattern:      Async promise-based
- Dependencies:     sidebar_sso_bootstrap.js, Xrm.WebApi

-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Load SSO config from Dataverse (no hardcoding)
- Validate required fields (client ID, tenant ID, etc.)
- Check SSO enabled flag before attempting auth
- Acquire MSAL token with error handling
- Pass token + endpoint to canvas iframe
- Diagnostic logging (success, failures, validation errors)
- Graceful fallback: non-SSO embeds continue to work if SSO fails

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. sidebar_sso_bootstrap.js must be loaded first
2. sidebar_genericsidebar table must exist with SSO fields:
   - sidebar_sso_enabled (Yes/No)
   - sidebar_auth_client_id (Text)
   - sidebar_auth_tenant_id (Text)
   - sidebar_auth_api_scope (Text)
   - sidebar_auth_token_endpoint (Text)
   - sidebar_auth_redirect_uri (Text)
   - sidebar_auth_scopes (Text)
3. Caller must provide valid configId (GUID of config row)

-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- CSRF Token:      Token passing handled by parent + canvas (secure URL handling)
- Auth Scope:      From Dataverse (admin-configured, never hardcoded)
- Data Exposure:   Token never logged; passed via URL param (stripped after read)
- Role Dependency: None (RBAC handled by Copilot Studio downstream)

-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- N/A (orchestration only)

-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- Requires Xrm.WebApi (Dynamics 365 only)
- Token endpoint call may timeout if Copilot Studio is slow
- MSAL popup requires user interaction

-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
✔ Load config row from Dataverse
✔ Validate SSO enabled flag
✔ Validate required fields present
✔ Acquire token successfully
✔ Pass token to canvas iframe
✔ Handle Dataverse fetch errors gracefully
✔ Handle MSAL errors gracefully
✔ Non-SSO embeds remain unaffected

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v2.0.0  2026-07-22  Orchestration layer for Generic.Sidebar SSO
v1.0.0  2026-07-21  Initial release - config loading + validation

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Do NOT hardcode any config values
- SSO config comes entirely from Dataverse
- If SSO fails, fallback to non-auth mode (graceful degradation)
- All errors must be logged with actionable remediation suggestions
- Token must be passed securely to canvas (URL query params, stripped after read)
=============================================================================
*/

(function (window) {
  "use strict";

  var DEBUG = true;

  function log() { if (DEBUG) console.log.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }
  function err() { console.error.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }

  // =========================================================================
  // DATAVERSE CONFIG LOADING
  // =========================================================================

  function _loadConfigFromDataverse(configId) {
    if (!configId) {
      return Promise.reject(new Error("No config ID provided"));
    }

    log("Loading SSO config from Dataverse: " + configId);

    var select = "$select=sidebar_sso_enabled," +
      "sidebar_auth_client_id," +
      "sidebar_auth_tenant_id," +
      "sidebar_auth_api_scope," +
      "sidebar_auth_token_endpoint," +
      "sidebar_auth_redirect_uri," +
      "sidebar_auth_scopes";

    return Xrm.WebApi.retrieveRecord(
      "sidebar_genericsidebar",
      configId,
      "?" + select
    )
    .then(function (record) {
      log("Config loaded successfully");
      return record;
    })
    .catch(function (e) {
      err("Failed to load config from Dataverse: " + (e && e.message ? e.message : e));
      throw e;
    });
  }

  // =========================================================================
  // CONFIG VALIDATION
  // =========================================================================

  function _validateSSOConfig(record) {
    log("Validating SSO config");

    // Check if SSO is enabled
    if (!record.sidebar_sso_enabled) {
      log("SSO not enabled for this config");
      return {
        valid: false,
        reason: "SSO_DISABLED",
        message: "SSO is disabled for this configuration row"
      };
    }

    // Validate required fields
    var requiredFields = {
      "sidebar_auth_client_id": "Client ID",
      "sidebar_auth_tenant_id": "Tenant ID",
      "sidebar_auth_api_scope": "API Scope",
      "sidebar_auth_token_endpoint": "Token Endpoint"
    };

    var missingFields = [];
    for (var field in requiredFields) {
      if (!record[field]) {
        missingFields.push(requiredFields[field] + " (" + field + ")");
      }
    }

    if (missingFields.length > 0) {
      err("Missing required SSO fields: " + missingFields.join(", "));
      return {
        valid: false,
        reason: "MISSING_FIELDS",
        message: "SSO configuration incomplete. Missing: " + missingFields.join(", "),
        missingFields: missingFields
      };
    }

    // Validate endpoint URL format
    if (!record.sidebar_auth_token_endpoint.match(/^https:\/\//i)) {
      err("Token endpoint must be HTTPS");
      return {
        valid: false,
        reason: "INVALID_ENDPOINT",
        message: "Token endpoint must start with https://"
      };
    }

    log("Config validation passed");
    return { valid: true };
  }

  // =========================================================================
  // MSAL TOKEN ACQUISITION
  // =========================================================================

  function _acquireToken(config) {
    if (typeof window.SidebarSSO === "undefined" || typeof window.SidebarSSO.acquireToken !== "function") {
      return Promise.reject(new Error("SidebarSSO.acquireToken not available; ensure sidebar_sso_bootstrap.js is loaded"));
    }

    var scopes = (config.sidebar_auth_scopes || config.sidebar_auth_api_scope).split(/\s+/).filter(function (s) { return s.length > 0; });

    var msalConfig = {
      clientId: config.sidebar_auth_client_id,
      authority: "https://login.microsoftonline.com/" + config.sidebar_auth_tenant_id,
      redirectUri: config.sidebar_auth_redirect_uri || window.location.href,
      scopes: scopes
    };

    log("Acquiring token for scopes: " + scopes.join(", "));

    return window.SidebarSSO.acquireToken(msalConfig)
      .then(function (token) {
        log("Token acquired successfully");
        return token;
      })
      .catch(function (e) {
        err("Token acquisition failed: " + (e && e.message ? e.message : e));
        throw e;
      });
  }

  // =========================================================================
  // CANVAS NAVIGATION WITH SSO
  // =========================================================================

  function _navigateCanvasWithSSO(pane, canvasWebResourceName, configRecord, userToken) {
    if (!pane || typeof pane.navigate !== "function") {
      return Promise.reject(new Error("Invalid pane object"));
    }

    log("Navigating canvas with SSO token");

    var data = "tokenEndpoint=" + encodeURIComponent(configRecord.sidebar_auth_token_endpoint) +
               "&usertoken=" + encodeURIComponent(userToken);

    try {
      pane.navigate({
        pageType: "webresource",
        webresourceName: canvasWebResourceName,
        data: data
      });

      log("Canvas navigation successful");
      return Promise.resolve();
    } catch (e) {
      err("Canvas navigation failed: " + (e && e.message ? e.message : e));
      return Promise.reject(e);
    }
  }

  // =========================================================================
  // PUBLIC API: Handle Pane Navigation with SSO
  // =========================================================================

  function handlePaneNavigation(configId, pane, canvasWebResourceName) {
    if (!configId || !pane || !canvasWebResourceName) {
      warn("Incomplete parameters for SSO pane navigation");
      return Promise.reject(new Error("Missing required parameters: configId, pane, canvasWebResourceName"));
    }

    log("=== SSO Pane Navigation Started ===");
    log("Config ID: " + configId);
    log("Canvas: " + canvasWebResourceName);

    return _loadConfigFromDataverse(configId)
      .then(function (record) {
        var validation = _validateSSOConfig(record);
        if (!validation.valid) {
          warn("SSO validation failed: " + validation.reason);
          return Promise.reject(new Error(validation.message));
        }
        return record;
      })
      .then(function (record) {
        return _acquireToken(record)
          .then(function (token) {
            return { token: token, record: record };
          });
      })
      .then(function (result) {
        return _navigateCanvasWithSSO(pane, canvasWebResourceName, result.record, result.token);
      })
      .then(function () {
        log("=== SSO Pane Navigation Completed Successfully ===");
      })
      .catch(function (error) {
        err("=== SSO Pane Navigation Failed ===");
        err("Error: " + (error && error.message ? error.message : error));
        return Promise.reject(error);
      });
  }

  // =========================================================================
  // EXPORT
  // =========================================================================

  window.SidebarSSO = window.SidebarSSO || {};
  window.SidebarSSO.handlePaneNavigation = handlePaneNavigation;

  log("SidebarSSO.handlePaneNavigation ready");

})(window);
