/*
=============================================================================
COMPONENT:    sidebar_sidebar
FILE:         web resources\sidebar_sidebar.js
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-03-04
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

  // Track the currently loaded configId on window to survive form reloads
  // This persists across record navigations within the same browser session
  if (typeof window.__sidebarLoadedConfigId === "undefined") {
    window.__sidebarLoadedConfigId = null;
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

  // Get Default row (or most recent) with minimal fields for header setup + SSO flag
  async function getDefaultConfigRow() {
    const select = "$select=sidebar_genericsidebarid,sidebar_title,sidebar_sso_enabled,sidebar_auth_client_id,sidebar_auth_tenant_id,sidebar_auth_api_scope,sidebar_auth_token_endpoint,sidebar_auth_redirect_uri,sidebar_auth_scopes";
    try {
      const r1 = await Xrm.WebApi.retrieveMultipleRecords(
        TABLE, `?${select}&$filter=sidebar_default eq true&$top=1`
      );
      if (r1.entities.length) return r1.entities[0];
    } catch {}

    try {
      const r2 = await Xrm.WebApi.retrieveMultipleRecords(
        TABLE, `?${select}&$orderby=createdon desc&$top=1`
      );
      if (r2.entities.length) return r2.entities[0];
    } catch {}

    return null;
  }

  async function getConfig() {
    const cfg = { width: DEFAULTS.width, title: DEFAULTS.fallbackTitle };
    try {
      const w = await getEnv("Sidebar.PaneWidth"); if (w && !isNaN(+w)) cfg.width = +w;

      const rec = await getDefaultConfigRow();
      if (rec) {
        cfg.configId = rec.sidebar_genericsidebarid;
        if (rec.sidebar_title) cfg.title = rec.sidebar_title;
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

      // Check if the pane already has the same config loaded - skip navigate to preserve chat state
      // Only skip if: 1) pane existed (not new), 2) config matches, 3) we have a tracked configId
      if (!pane.__isNewPane && 
          window.__sidebarLoadedConfigId && 
          window.__sidebarLoadedConfigId === cfg.configId) {
        console.log("Sidebar already showing same config, bringing to front without reload");
        return;
      }

      // Pass configId + SSO detection
      const params = new URLSearchParams();
      if (cfg.configId) params.set("configId", cfg.configId);

      // SSO DETECTION: Check if SSO is enabled for this config
      // If enabled, route to SSO canvas; otherwise use standard canvas
      let targetCanvas = "sidebar_sidebar.html";
      let useSso = false;

      try {
        if (cfg.ssoEnabled) {
          console.log("[SSO] SSO enabled for this config");
          // Load SSO bootstrap + setup libraries before navigation
          await new Promise(function (resolve, reject) {
            // Ensure SSO libraries are loaded
            if (typeof window.SidebarSSO !== "undefined" && typeof window.SidebarSSO.handlePaneNavigation === "function") {
              console.log("[SSO] Libraries already loaded");
              resolve();
              return;
            }
            // Both bootstrap and setup must be loaded before proceeding
            var libsLoaded = 0;
            var onLibLoad = function () {
              libsLoaded++;
              if (libsLoaded >= 2) resolve();
            };
            if (typeof window.SidebarSSO === "undefined") {
              // Load bootstrap first
              var bootScript = document.createElement("script");
              bootScript.src = Xrm.Utility.getGlobalContext().getClientUrl() + "/WebResources/sidebar_sso_bootstrap";
              bootScript.onload = onLibLoad;
              bootScript.onerror = function () { reject(new Error("Failed to load SSO bootstrap")); };
              document.head.appendChild(bootScript);
            } else {
              libsLoaded++;
            }
            if (typeof window.SidebarSSO === "undefined" || typeof window.SidebarSSO.handlePaneNavigation !== "function") {
              // Load setup
              var setupScript = document.createElement("script");
              setupScript.src = Xrm.Utility.getGlobalContext().getClientUrl() + "/WebResources/sidebar_sso_setup";
              setupScript.onload = onLibLoad;
              setupScript.onerror = function () { reject(new Error("Failed to load SSO setup")); };
              document.head.appendChild(setupScript);
            } else {
              libsLoaded++;
            }
            setTimeout(function () { if (libsLoaded < 2) reject(new Error("SSO library load timeout")); }, 5000);
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

