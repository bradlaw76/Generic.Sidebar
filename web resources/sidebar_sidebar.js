// v2.3.0 – Title from table, removed icon functionality, pass configId to HTML.

(function () {
  const PANE_ID = "genericSidebarPane";
  const DEFAULTS = { width: 500, fallbackTitle: "Sidebar" };
  const TABLE = "sidebar_genericsidebar";     // your table logical name

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

  // Get Default row (or most recent) with minimal fields for header setup
  async function getDefaultConfigRow() {
    const select = "$select=sidebar_genericsidebarid,sidebar_title";
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
    if (!pane) {
      pane = await Xrm.App.sidePanes.createPane({
        paneId: PANE_ID,
        canClose: true,
        width: cfg.width,
        title: cfg.title
        // No imageName property - removed icon support
      });
    } else {
      try { if (pane.setTitle && cfg.title) await pane.setTitle(cfg.title); } catch {}
      // Removed setImage call
      if (typeof pane.setVisible === "function") await pane.setVisible(true);
    }
    if (typeof pane.bringToFront === "function") await pane.bringToFront();
    return pane;
  }

  // Main function that opens the sidebar
  async function openSidebar(executionContext) {
    try {
      console.log("Generic_OpenSidebar called");
      
      // Optional allowlist by entity (if you want to add this back)
      let currentEntity = null;
      try { 
        currentEntity = executionContext?.getFormContext?.()?.data?.entity?.getEntityName(); 
      } catch(e) {
        console.log("Could not get entity name:", e);
      }

      const cfg = await getConfig();
      console.log("Configuration loaded:", cfg);

      const pane = await ensurePane(cfg);

      // Pass only configId - removed icon-related parameters
      const params = new URLSearchParams();
      if (cfg.configId) params.set("configId", cfg.configId);

      console.log("Navigating to web resource with params:", params.toString());

      await pane.navigate({
        pageType: "webresource",
        webresourceName: "sidebar_sidebar.html", // Make sure this matches your HTML web resource name
        data: params.toString()
      });

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
