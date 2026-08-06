/*
=============================================================================
COMPONENT:    sidebar_sidebar
FILE:         web resources\sidebar_sidebar.js
VERSION:      2.2.1
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-07-23
ENVIRONMENT:  JavaScript
PORTAL URL:   N/A

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
SpeckKit component header applied for governance and maintainability.

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source:      As implemented in file
- Entity/Table:     N/A
- Auth Model:       As implemented in host app
- Rendering:        Client-side
- API Pattern:      As implemented in file
- OData:            N/A

-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Search:           As implemented
- Filtering:        As implemented
- Sorting:          As implemented
- Pagination:       As implemented
- Create:           As implemented
- Update:           As implemented
- Delete:           As implemented
- Validation:       As implemented
- UX Notes:         See file content

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Dependencies:    As required by this file and host app.

-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- CSRF Token:      As implemented
- Auth Scope:      As implemented
- Data Exposure:   As implemented
- Role Dependency: As implemented

-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- Root Scope ID:   As implemented
- Scoped styles where applicable

-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- See project docs and implementation constraints.

-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
✔ Load component without runtime errors
✔ Core interactions behave as expected

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v2.2.1  2026-08-05  Reliability: hydrate SSO flag and load SSO dependencies in order
  * Reads sidebar_sso_enabled with a backward-compatible Dataverse fallback
  * Loads the MSAL bootstrap before the SSO orchestration resource
v2.2.0  2026-07-23  Minor: Keep tab host renderer as primary runtime
  * Removed forced full-page child-picker routing
  * Preserved route tracking for legacy vs SSO canvas modes
  * Kept pane reuse safety without bypassing tab-level agent integrations
v2.1.0  2026-07-23  Minor: Route to child-agent picker when linked agents exist
  * Added child-agent detection against sidebar_genericsidebaragent
  * Auto-routes pane to vz_AgentSidePanelHTML.html when linked agents exist
  * Added route tracking to avoid stale pane reuse across mode changes
  * Fixed SSO flag hydration from Dataverse config row
v2.0.0  2026-07-22  Major: Enterprise SSO integration
  * Added SSO detection + routing for Copilot Studio embeds
  * Dynamically load MSAL + orchestration for SSO configs
  * Fetch SSO fields from Dataverse (client ID, tenant, scopes)
  * Graceful fallback to standard canvas if SSO fails
  * 100% backwards compatible with non-SSO configs
  * Zero hardcoding - all secrets from Dataverse
v1.0.0  2026-03-04  Added SpeckKit component header block

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Do NOT bypass security or auth protections in host integrations.
- Changes must be additive unless explicitly approved.
=============================================================================
*/
// v2.5.0 – Persist configId tracking across form navigations using window object.

(function () {
  const PANE_ID = "genericSidebarPane";
  const DEFAULTS = { width: 500, fallbackTitle: "Sidebar" };
  const TABLE = "sidebar_genericsidebar";     // your table logical name
  const WEBRESOURCE_VERSION = "2026.07.23.1";

  // Track the currently loaded configId on window to survive form reloads
  // This persists across record navigations within the same browser session
  if (typeof window.__sidebarLoadedConfigId === "undefined") {
    window.__sidebarLoadedConfigId = null;
  }
  if (typeof window.__sidebarLoadedRoute === "undefined") {
    window.__sidebarLoadedRoute = null;
  }

  async function getEnv(schema) {
    try {
      const defs = await Xrm.WebApi.retrieveMultipleRecords(
        "environmentvariabledefinition",
        `?$select=schemaname,environmentvariabledefinitionid&$filter=schemaname eq '${schema}'&$top=1`
      );
      if (!defs.entities.length) return null;
      const def = defs.entities[0];
      const vals = await Xrm.WebApi.retrieveMultipleRecords(
        "environmentvariablevalue",
        `?$select=value&$filter=environmentvariabledefinitionid eq ${def.environmentvariabledefinitionid}`
      );
      return vals.entities[0]?.value ?? null;
    } catch { return null; }
  }

  // Get Default row (or most recent) with minimal fields for header setup + SSO flag.
  // Some older environments do not have the optional SSO field, so retry without it.
  async function getDefaultConfigRow() {
    const legacySelect = "$select=sidebar_genericsidebarid,sidebar_title";
    const ssoSelect = legacySelect + ",sidebar_sso_enabled";

    async function queryDefault(select) {
      const r1 = await Xrm.WebApi.retrieveMultipleRecords(
        TABLE, `?${select}&$filter=sidebar_default eq true&$orderby=modifiedon desc&$top=1`
      );
      if (r1.entities.length) return r1.entities[0];
      return null;
    }

    async function queryMostRecent(select) {
      const r2 = await Xrm.WebApi.retrieveMultipleRecords(
        TABLE, `?${select}&$orderby=modifiedon desc&$top=1`
      );
      if (r2.entities.length) return r2.entities[0];
      return null;
    }

    try {
      return await queryDefault(ssoSelect) || await queryMostRecent(ssoSelect);
    } catch (e) {
      console.warn("SSO field is unavailable; continuing with legacy sidebar configuration", e);
      try {
        return await queryDefault(legacySelect) || await queryMostRecent(legacySelect);
      } catch {
        return null;
      }
    }
  }

  async function getConfig() {
    const cfg = { width: DEFAULTS.width, title: DEFAULTS.fallbackTitle };
    try {
      const w = await getEnv("Sidebar.PaneWidth"); if (w && !isNaN(+w)) cfg.width = +w;

      const rec = await getDefaultConfigRow();
      if (rec) {
        cfg.configId = rec.sidebar_genericsidebarid;
        if (rec.sidebar_title) cfg.title = rec.sidebar_title;
        // Optional field in some orgs; absence should never block config resolution.
        cfg.sidebar_sso_enabled = rec.sidebar_sso_enabled;
      }
    } catch {}
    return cfg;
  }

  async function ensurePane(cfg) {
    let pane = Xrm.App.sidePanes.getPane(PANE_ID);
    let isNewPane = false;
    
    if (!pane) {
      isNewPane = true;
      pane = await Xrm.App.sidePanes.createPane({
        paneId: PANE_ID,
        canClose: true,
        width: cfg.width,
        title: cfg.title
        // No imageName property - removed icon support
      });
      // Clear tracking when creating new pane
      window.__sidebarLoadedConfigId = null;
      window.__sidebarLoadedRoute = null;
      console.log("Created new sidebar pane");
    } else {
      try { if (pane.setTitle && cfg.title) await pane.setTitle(cfg.title); } catch {}
      // Removed setImage call
      if (typeof pane.setVisible === "function") await pane.setVisible(true);
      console.log("Reusing existing sidebar pane");
    }
    if (typeof pane.bringToFront === "function") await pane.bringToFront();
    pane.__isNewPane = isNewPane;
    return pane;
  }

  // Main function that opens the sidebar
  async function openSidebar(executionContext) {
    try {
      console.log("Generic_OpenSidebar called");
      console.log("Current tracked configId:", window.__sidebarLoadedConfigId);
      
      // Optional allowlist by entity (if you want to add this back)
      let currentEntity = null;
      try { 
        currentEntity = executionContext?.getFormContext?.()?.data?.entity?.getEntityName(); 
      } catch(e) {
        console.log("Could not get entity name:", e);
      }

      const cfg = await getConfig();
      console.log("Configuration loaded:", cfg);
      
      // Parse SSO flag from config record if available
      const ssoEnabledField = cfg.sidebar_sso_enabled;
      cfg.ssoEnabled = (ssoEnabledField === true || ssoEnabledField === 1 || ssoEnabledField === "true");

      const pane = await ensurePane(cfg);

      // Pass configId + SSO detection
      const params = new URLSearchParams();
      if (cfg.configId) params.set("configId", cfg.configId);
      params.set("wrv", WEBRESOURCE_VERSION);

      // SSO DETECTION: Check if SSO is enabled for this config
      // If enabled, route to SSO canvas; otherwise use standard canvas
      let targetCanvas = "sidebar_sidebar.html";
      let useSso = false;

      try {
        if (cfg.ssoEnabled) {
          console.log("[SSO] SSO enabled for this config");
          // Load SSO bootstrap + setup libraries before navigation
          await new Promise(function (resolve, reject) {
            if (typeof window.SidebarSSO !== "undefined" && typeof window.SidebarSSO.handlePaneNavigation === "function") {
              console.log("[SSO] Libraries already loaded");
              resolve();
              return;
            }

            var clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
            var loadScript = function (name, onLoad) {
              var script = document.createElement("script");
              script.src = clientUrl + "/WebResources/" + name;
              script.onload = onLoad;
              script.onerror = function () { reject(new Error("Failed to load " + name)); };
              document.head.appendChild(script);
            };

            var loadSetup = function () {
              if (typeof window.SidebarSSO !== "undefined" && typeof window.SidebarSSO.handlePaneNavigation === "function") {
                resolve();
                return;
              }
              loadScript("sidebar_sso_setup", resolve);
            };

            if (typeof window.SidebarSSO !== "undefined" && typeof window.SidebarSSO.acquireToken === "function") {
              loadSetup();
            } else {
              loadScript("sidebar_sso_bootstrap", loadSetup);
            }
          });
          targetCanvas = "sidebar_sso_canvas.html";
          useSso = true;
        }
      } catch (e) {
        console.warn("[SSO] Failed to load SSO libraries: " + e.message + "; falling back to standard canvas");
        // Continue with non-SSO canvas on library load failure
        useSso = false;
        targetCanvas = "sidebar_sidebar.html";
      }

      const routeKey = useSso ? "sso-canvas" : "legacy-canvas";

      // Check if the pane already has the same config+route loaded - skip navigate to preserve chat state
        var isConfigAuthoringForm = currentEntity === "sidebar_genericsidebar";

        if (!isConfigAuthoringForm &&
          !pane.__isNewPane &&
          window.__sidebarLoadedConfigId &&
          window.__sidebarLoadedConfigId === cfg.configId &&
          window.__sidebarLoadedRoute === routeKey) {
        console.log("Sidebar already showing same config/route, bringing to front without reload");
        return;
      }

      console.log("Navigating to web resource:", targetCanvas, "SSO=", useSso);

      if (useSso && typeof window.SidebarSSO !== "undefined" && typeof window.SidebarSSO.handlePaneNavigation === "function") {
        // Use SSO orchestration
        console.log("[SSO] Using SSO orchestration for pane navigation");
        await window.SidebarSSO.handlePaneNavigation(cfg.configId, pane, "sidebar_sso_canvas")
          .catch(function (e) {
            console.error("[SSO] SSO navigation failed: " + e.message + "; using fallback canvas");
            // Fallback: navigate to standard canvas if SSO fails
            return pane.navigate({
              pageType: "webresource",
              webresourceName: "sidebar_sidebar.html",
              data: params.toString()
            });
          });
      } else {
        // Use standard canvas navigation
        await pane.navigate({
          pageType: "webresource",
          webresourceName: targetCanvas,
          data: params.toString()
        });
      }

      // Track the loaded config on window to persist across form navigations
      window.__sidebarLoadedConfigId = cfg.configId;
      window.__sidebarLoadedRoute = routeKey;

      console.log("Sidebar opened successfully");
    } catch (e) {
      console.error("Generic_OpenSidebar error:", e);
      // Show user-friendly error
      if (typeof Xrm !== 'undefined' && Xrm.Navigation) {
        Xrm.Navigation.openAlertDialog({
          text: `Failed to open sidebar: ${e.message}`,
          title: "Sidebar Error"
        });
      }
    }
  }

  // Multiple ways to expose the function to handle different loading scenarios
  
  // Method 1: Direct global assignment (immediate)
  if (typeof window !== 'undefined') {
    window.Generic_OpenSidebar = openSidebar;
  }

  // Method 2: Assign when Xrm is ready
  function ensureGlobalFunction() {
    if (typeof Xrm !== 'undefined' && Xrm.WebApi) {
      window.Generic_OpenSidebar = openSidebar;
      console.log("Generic_OpenSidebar function registered");
      return true;
    }
    return false;
  }

  // Try immediate assignment
  if (!ensureGlobalFunction()) {
    // Method 3: Retry with intervals if Xrm not ready yet
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const retryInterval = setInterval(() => {
      attempts++;
      if (ensureGlobalFunction() || attempts >= maxAttempts) {
        clearInterval(retryInterval);
        if (attempts >= maxAttempts) {
          console.error("Failed to register Generic_OpenSidebar - Xrm not available");
        }
      }
    }, 100);
  }

  // Method 4: Also try on DOMContentLoaded
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      ensureGlobalFunction();
    });
  }

})();

