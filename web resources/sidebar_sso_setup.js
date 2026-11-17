/*
=============================================================================
COMPONENT:    sidebar_sso_setup
FILE:         web resources\sidebar_sso_setup.js
VERSION:      2.2.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-11-17
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
- Pass an opaque one-time handoff ID to the canvas iframe
- Diagnostic logging (success, failures, validation errors)
- Fail closed: SSO errors never navigate to anonymous content

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
- CSRF Token:      Token passing handled by a same-origin, one-time memory handoff
- Auth Scope:      From Dataverse (admin-configured, never hardcoded)
- Data Exposure:   Token and endpoint never logged or placed in navigation URLs
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
v2.2.0  2026-11-17  H004 validate linked-agent endpoint/scope through shared SSO
v2.1.0  2026-10-06  Enforce single-resource scopes and one-time in-memory token handoff
v2.0.1  2026-08-13  Await pane navigation before reporting SSO success
v2.0.0  2026-07-22  Orchestration layer for Generic.Sidebar SSO
v1.0.0  2026-07-21  Initial release - config loading + validation

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Do NOT hardcode any config values
- SSO config comes entirely from Dataverse
- If SSO fails, reject navigation so the launcher can preserve a secure failure state
- All errors must be logged with actionable remediation suggestions
- Token must be claimed through the expiring, single-use same-origin handoff
=============================================================================
*/

(function (window) {
  "use strict";

  var DEBUG = true;
  var TOKEN_HANDOFF_TTL_MS = 30000;
  var _tokenHandoffs = Object.create(null);

  function log() { if (DEBUG) console.log.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }
  function err() { console.error.apply(console, ["[sidebar-sso-setup]"].concat([].slice.call(arguments))); }

  function _removeExpiredTokenHandoffs() {
    var now = Date.now();
    Object.keys(_tokenHandoffs).forEach(function (handoffId) {
      if (_tokenHandoffs[handoffId].expiresAt <= now) {
        delete _tokenHandoffs[handoffId];
      }
    });
  }

  function _createTokenHandoff(userToken, tokenEndpoint) {
    _removeExpiredTokenHandoffs();
    var randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    var handoffId = Array.prototype.map.call(randomBytes, function (value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
    _tokenHandoffs[handoffId] = {
      userToken: userToken,
      tokenEndpoint: tokenEndpoint,
      expiresAt: Date.now() + TOKEN_HANDOFF_TTL_MS
    };
    return handoffId;
  }

  function _discardTokenHandoff(handoffId) {
    delete _tokenHandoffs[handoffId];
  }

  function consumeTokenHandoff(handoffId) {
    _removeExpiredTokenHandoffs();
    if (!/^[a-f0-9]{32}$/.test(handoffId || "")) {
      throw new Error("Invalid SSO token handoff ID");
    }

    var handoff = _tokenHandoffs[handoffId];
    delete _tokenHandoffs[handoffId];
    if (!handoff) {
      throw new Error("SSO token handoff is missing, expired, or already used");
    }
    return handoff;
  }

  function _resolveTokenScopes(record) {
    var primaryScope = (record.sidebar_auth_api_scope || "").trim();
    var primaryMatch = primaryScope.match(/^api:\/\/([^/\s]+)\/([^/\s]+)$/i);
    if (!primaryMatch) {
      throw new Error("API Scope must use the format api://<resource>/<scope>");
    }

    var resourceAudience = primaryMatch[1].toLowerCase();
    var configuredScopes = (record.sidebar_auth_scopes || "").split(/\s+/).filter(function (scope) {
      return scope.length > 0;
    });
    var scopes = [primaryScope];

    configuredScopes.forEach(function (scope) {
      var scopeMatch = scope.match(/^api:\/\/([^/\s]+)\/([^/\s]+)$/i);
      if (!scopeMatch || scopeMatch[1].toLowerCase() !== resourceAudience) {
        throw new Error("Additional OAuth scopes must target the same API resource as API Scope");
      }
      if (!scopes.some(function (existing) { return existing.toLowerCase() === scope.toLowerCase(); })) {
        scopes.push(scope);
      }
    });

    return scopes;
  }

  function _isTrustedTokenEndpoint(endpoint) {
    var parsed;
    try {
      parsed = new URL(endpoint);
    } catch (e) {
      return false;
    }

    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
      return false;
    }

    var hostname = parsed.hostname.toLowerCase();
    var trustedSuffixes = [
      ".environment.api.powerplatform.com",
      ".environment.api.powerplatform.microsoft.com",
      ".environment.api.powerplatform.microsoft.us",
      ".environment.api.gov.powerplatform.microsoft.us",
      ".powerva.microsoft.com",
      ".powerva.microsoft.us"
    ];
    var trustedHost = trustedSuffixes.some(function (suffix) {
      return hostname.length > suffix.length && hostname.endsWith(suffix);
    });
    var trustedPath = /\/directline\/token\/?$/i.test(parsed.pathname);
    return trustedHost && trustedPath;
  }

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

    // Restrict bearer-token exchange to Copilot Studio Direct Line endpoints.
    if (!_isTrustedTokenEndpoint(record.sidebar_auth_token_endpoint)) {
      err("Token endpoint is not an approved Copilot Studio Direct Line endpoint");
      return {
        valid: false,
        reason: "INVALID_ENDPOINT",
        message: "Token endpoint must use an approved Copilot Studio host and end with /directline/token"
      };
    }

    try {
      _resolveTokenScopes(record);
    } catch (scopeError) {
      err(scopeError.message);
      return {
        valid: false,
        reason: "INVALID_SCOPES",
        message: scopeError.message
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

    var scopes = _resolveTokenScopes(config);

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
    var handoffId = _createTokenHandoff(userToken, configRecord.sidebar_auth_token_endpoint);
    var data = "handoffId=" + encodeURIComponent(handoffId);

    try {
      return Promise.resolve(pane.navigate({
        pageType: "webresource",
        webresourceName: canvasWebResourceName,
        data: data
      }))
      .then(function () {
        log("Canvas navigation successful");
      })
      .catch(function (e) {
        _discardTokenHandoff(handoffId);
        err("Canvas navigation failed: " + (e && e.message ? e.message : e));
        throw e;
      });
    } catch (e) {
      _discardTokenHandoff(handoffId);
      err("Canvas navigation failed: " + (e && e.message ? e.message : e));
      return Promise.reject(e);
    }
  }

  // =========================================================================
  // PUBLIC API: Handle Pane Navigation with SSO
  // =========================================================================

  function handlePaneNavigation(configId, pane, canvasWebResourceName, agent) {
    if (!configId || !pane || !canvasWebResourceName) {
      warn("Incomplete parameters for SSO pane navigation");
      return Promise.reject(new Error("Missing required parameters: configId, pane, canvasWebResourceName"));
    }

    log("=== SSO Pane Navigation Started ===");
    log("Config ID: " + configId);
    log("Canvas: " + canvasWebResourceName);

    return _loadConfigFromDataverse(configId)
      .then(function (record) {
        if (agent) {
          record = Object.assign({}, record, {
            sidebar_auth_token_endpoint: agent.tokenEndpoint
          });
          if (agent.authScopeOverride) {
            record.sidebar_auth_api_scope = agent.authScopeOverride.trim();
            record.sidebar_auth_scopes = "";
          }
        }
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
  window.SidebarSSO.consumeTokenHandoff = consumeTokenHandoff;

  log("SidebarSSO.handlePaneNavigation ready");

})(window);
