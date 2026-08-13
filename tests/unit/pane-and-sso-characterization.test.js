import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNTHETIC_CONFIG_ID } from "../fixtures/sidebar-configs.js";
import { loadSidebarScript, loadSsoFallback } from "../helpers/load-web-resource.js";
import { createPaneMock, createXrmMock } from "../setup/xrm-mock.js";

describe("pane and SSO characterization", () => {
  let resource;

  afterEach(() => resource?.close());

  function config(ssoEnabled = false, overrides = {}) {
    return {
      sidebar_genericsidebarid: SYNTHETIC_CONFIG_ID,
      sidebar_title: "Synthetic Sidebar",
      sidebar_sso_enabled: ssoEnabled,
      sidebar_auth_client_id: "22222222-2222-4222-8222-222222222222",
      sidebar_auth_tenant_id: "33333333-3333-4333-8333-333333333333",
      sidebar_auth_api_scope: "api://synthetic.test/Agent.Invoke",
      sidebar_auth_token_endpoint: "https://agent.example.test/token",
      sidebar_auth_redirect_uri: "https://contoso.crm.dynamics.com/WebResources/sidebar_sso_canvas.html",
      sidebar_auth_scopes: "User.Read api://synthetic.test/Agent.Invoke",
      ...overrides,
    };
  }

  function createMsal(options = {}) {
    const instance = {
      initialize: vi.fn(),
      getAllAccounts: vi.fn(() => options.accounts ?? [{ username: "synthetic@example.test" }]),
      acquireTokenSilent: vi.fn().mockImplementation(() => options.silentFailure
        ? Promise.reject(new Error("Synthetic silent token failure"))
        : Promise.resolve({ accessToken: "synthetic-silent-token", expiresOn: new Date("2030-01-01T00:00:00Z") })),
      acquireTokenPopup: vi.fn().mockImplementation(() => options.popupFailure
        ? Promise.reject(new Error("Synthetic popup token failure"))
        : Promise.resolve({ accessToken: "synthetic-popup-token", account: { username: "synthetic@example.test" } })),
      ssoSilent: vi.fn().mockImplementation(() => options.ssoFailure
        ? Promise.reject(new Error("Synthetic SSO silent failure"))
        : Promise.resolve({ accessToken: "synthetic-sso-token", account: { username: "synthetic@example.test" } })),
      setActiveAccount: vi.fn(),
    };
    instance.initialize.mockResolvedValue(undefined);
    return {
      instance,
      library: {
        LogLevel: { Error: 3 },
        PublicClientApplication: vi.fn(function PublicClientApplication() { return instance; }),
      },
    };
  }

  async function load(options = {}) {
    const configRecord = config(options.ssoEnabled, options.configOverrides);
    const mocks = createXrmMock({
      configRecord,
      existingPane: options.existingPane,
      pane: options.pane,
    });
    const msal = options.msal || createMsal();
    resource = await loadSidebarScript({
      xrm: mocks.xrm,
      scriptLoad: options.scriptLoad,
      msal: msal.library,
      allowedConsoleErrors: options.allowedConsoleErrors,
    });
    return { ...mocks, ...resource, msal, configRecord };
  }

  function expectSecureSsoFailure(result, pane = result.pane) {
    expect(pane.navigate).toHaveBeenCalledWith(expect.objectContaining({
      webresourceName: "sidebar_sso_canvas_fallback.html",
    }));
    expect(pane.navigate).not.toHaveBeenCalledWith(expect.objectContaining({
      webresourceName: "sidebar_sidebar.html",
    }));
    expect(result.window.__sidebarLoadedConfigId).toBeNull();
    expect(result.window.__sidebarLoadedRoute).toBeNull();
  }

  it("queries for an existing pane and creates and navigates a new non-SSO pane", async () => {
    const result = await load();
    await result.window.Generic_OpenSidebar();
    expect(result.xrm.App.sidePanes.getPane).toHaveBeenCalledWith("genericSidebarPane");
    expect(result.xrm.App.sidePanes.createPane).toHaveBeenCalledOnce();
    expect(result.pane.navigate).toHaveBeenCalledWith(expect.objectContaining({ webresourceName: "sidebar_sidebar.html" }));
    expect(result.window.__sidebarLoadedConfigId).toBe(SYNTHETIC_CONFIG_ID);
    expect(result.window.__sidebarLoadedRoute).toBe("legacy-canvas");
  });

  it("reuses an existing pane and skips unnecessary navigation across simulated record navigation", async () => {
    const existingPane = createPaneMock();
    const result = await load({ existingPane });
    await result.window.Generic_OpenSidebar();
    expect(existingPane.navigate).toHaveBeenCalledOnce();
    await result.window.Generic_OpenSidebar({
      getFormContext: () => ({ data: { entity: { getEntityName: () => "incident" } } }),
    });
    expect(existingPane.navigate).toHaveBeenCalledOnce();
    expect(existingPane.bringToFront).toHaveBeenCalledTimes(2);
  });

  it("loads real SSO dependencies in order, retrieves and validates config, acquires a token, and navigates", async () => {
    const result = await load({ ssoEnabled: true });
    await result.window.Generic_OpenSidebar();
    const scriptSources = [...result.window.document.querySelectorAll("script[src]")].map((script) => script.src);
    expect(scriptSources[0]).toContain("sidebar_sso_bootstrap");
    expect(scriptSources[1]).toContain("sidebar_sso_setup");
    expect(result.window.SidebarSSO.acquireToken).toBeTypeOf("function");
    expect(result.window.SidebarSSO.handlePaneNavigation).toBeTypeOf("function");
    expect(result.retrieveRecord).toHaveBeenCalledWith(
      "sidebar_genericsidebar",
      SYNTHETIC_CONFIG_ID,
      expect.stringContaining("sidebar_auth_token_endpoint"),
    );
    expect(result.msal.library.PublicClientApplication).toHaveBeenCalledWith(expect.objectContaining({
      auth: expect.objectContaining({
        clientId: result.configRecord.sidebar_auth_client_id,
        authority: `https://login.microsoftonline.com/${result.configRecord.sidebar_auth_tenant_id}`,
      }),
    }));
    expect(result.msal.instance.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: ["User.Read", "api://synthetic.test/Agent.Invoke"],
      account: { username: "synthetic@example.test" },
    });
    expect(result.pane.navigate).toHaveBeenCalledWith({
      pageType: "webresource",
      webresourceName: "sidebar_sso_canvas",
      data: "tokenEndpoint=https%3A%2F%2Fagent.example.test%2Ftoken&usertoken=synthetic-silent-token",
    });
    expect(result.window.__sidebarLoadedRoute).toBe("sso-canvas");
  });

  it.each(["bootstrap-failure", "setup-failure"])("fails closed when %s prevents dependency loading", async (scriptLoad) => {
    const result = await load({
      ssoEnabled: true,
      scriptLoad,
      allowedConsoleErrors: [/Secure navigation failed.*Failed to load sidebar_sso_/],
    });
    await result.window.Generic_OpenSidebar();
    expectSecureSsoFailure(result);
  });

  it.each([
    ["missing required configuration", { sidebar_auth_client_id: "" }, /Missing required SSO fields|SSO configuration incomplete|SSO Pane Navigation Failed|SSO navigation failed/],
    ["invalid token endpoint", { sidebar_auth_token_endpoint: "http://agent.example.test/token" }, /Token endpoint must (be HTTPS|start with https)|SSO Pane Navigation Failed|SSO navigation failed/],
  ])("fails closed after %s without recording a loaded route", async (_name, configOverrides, allowedError) => {
    const result = await load({
      ssoEnabled: true,
      configOverrides,
      allowedConsoleErrors: [allowedError, /Secure navigation failed/],
    });
    await result.window.Generic_OpenSidebar();
    expectSecureSsoFailure(result);
    expect(result.msal.library.PublicClientApplication).not.toHaveBeenCalled();
  });

  it("falls back from silent token failure to the real bootstrap popup path", async () => {
    const msal = createMsal({ silentFailure: true });
    const result = await load({ ssoEnabled: true, msal });
    await result.window.Generic_OpenSidebar();
    expect(msal.instance.acquireTokenSilent).toHaveBeenCalledOnce();
    expect(msal.instance.acquireTokenPopup).toHaveBeenCalledOnce();
    expect(msal.instance.setActiveAccount).toHaveBeenCalledWith({ username: "synthetic@example.test" });
    expect(result.pane.navigate).toHaveBeenCalledWith(expect.objectContaining({
      webresourceName: "sidebar_sso_canvas",
      data: expect.stringContaining("usertoken=synthetic-popup-token"),
    }));
  });

  it("fails closed after token failure without recording a loaded route", async () => {
    const msal = createMsal({ silentFailure: true, popupFailure: true });
    const result = await load({
      ssoEnabled: true,
      msal,
      allowedConsoleErrors: [/Token acquisition failed|Synthetic popup token failure|SSO Pane Navigation Failed|SSO navigation failed|Secure navigation failed/],
    });
    await result.window.Generic_OpenSidebar();
    expect(msal.instance.acquireTokenSilent).toHaveBeenCalledOnce();
    expect(msal.instance.acquireTokenPopup).toHaveBeenCalledOnce();
    expectSecureSsoFailure(result);
  });

  it("fails closed when asynchronous pane navigation rejects", async () => {
    const pane = createPaneMock();
    pane.navigate.mockRejectedValueOnce(new Error("Synthetic pane navigation failure"));
    const result = await load({
      ssoEnabled: true,
      pane,
      allowedConsoleErrors: [/Canvas navigation failed|Synthetic pane navigation failure|SSO Pane Navigation Failed|SSO navigation failed|Secure navigation failed/],
    });
    await result.window.Generic_OpenSidebar();
    expectSecureSsoFailure(result);
  });

  it("uses the original MSAL client after initialize resolves its void contract", async () => {
    const msal = createMsal();
    const result = await load({ ssoEnabled: true, msal });
    await result.window.Generic_OpenSidebar();
    expect(msal.instance.initialize).toHaveBeenCalledOnce();
    expect(msal.instance.acquireTokenSilent).toHaveBeenCalledOnce();
    expect(result.pane.navigate).toHaveBeenCalledWith(expect.objectContaining({ webresourceName: "sidebar_sso_canvas" }));
    expect(result.window.__sidebarLoadedRoute).toBe("sso-canvas");
  });

  it("retries SSO after failure and records the route only after the retry succeeds", async () => {
    const existingPane = createPaneMock();
    const msal = createMsal();
    msal.instance.acquireTokenSilent.mockRejectedValueOnce(new Error("Synthetic silent token failure"));
    msal.instance.acquireTokenPopup.mockRejectedValueOnce(new Error("Synthetic popup token failure"));
    const result = await load({
      ssoEnabled: true,
      existingPane,
      msal,
      allowedConsoleErrors: [/Token acquisition failed|Synthetic popup token failure|SSO Pane Navigation Failed|SSO navigation failed|Secure navigation failed/],
    });
    await result.window.Generic_OpenSidebar();
    expectSecureSsoFailure(result, existingPane);
    expect(msal.instance.acquireTokenSilent).toHaveBeenCalledOnce();

    await result.window.Generic_OpenSidebar();
    expect(msal.instance.acquireTokenSilent).toHaveBeenCalledTimes(2);
    expect(existingPane.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ webresourceName: "sidebar_sso_canvas" }));
    expect(result.window.__sidebarLoadedConfigId).toBe(SYNTHETIC_CONFIG_ID);
    expect(result.window.__sidebarLoadedRoute).toBe("sso-canvas");
  });

  it("exposes an explicit retry action from the real SSO failure page", async () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    resource = await loadSsoFallback({ retry });

    await resource.window.retryConnection();

    expect(retry).toHaveBeenCalledOnce();
    expect(resource.document.querySelector(".btn-retry").disabled).toBe(true);
    expect(resource.document.querySelector(".btn-retry").textContent).toBe("Retrying...");
  });
});