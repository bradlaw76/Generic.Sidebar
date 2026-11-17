import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNTHETIC_CONFIG_ID } from "../fixtures/sidebar-configs.js";
import { loadSidebarScript, loadSsoCanvas, loadSsoFallback } from "../helpers/load-web-resource.js";
import { createPaneMock, createXrmMock } from "../setup/xrm-mock.js";

describe("pane and SSO characterization", () => {
  let resource;
  const tokenEndpoint = "https://synthetic.environment.api.powerplatform.com/powervirtualagents/botsbyschema/synthetic/directline/token?api-version=2022-03-01-preview";

  afterEach(() => resource?.close());

  function config(ssoEnabled = false, overrides = {}) {
    return {
      sidebar_genericsidebarid: SYNTHETIC_CONFIG_ID,
      sidebar_title: "Synthetic Sidebar",
      sidebar_sso_enabled: ssoEnabled,
      sidebar_auth_client_id: "22222222-2222-4222-8222-222222222222",
      sidebar_auth_tenant_id: "33333333-3333-4333-8333-333333333333",
      sidebar_auth_api_scope: "api://synthetic.test/Agent.Invoke",
      sidebar_auth_token_endpoint: tokenEndpoint,
      sidebar_auth_redirect_uri: "https://contoso.crm.dynamics.com/WebResources/sidebar_sso_canvas.html",
      sidebar_auth_scopes: "api://synthetic.test/Agent.Invoke api://synthetic.test/Agent.Read",
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

  function getHandoffId(navigation) {
    const params = new URLSearchParams(navigation.data);
    return params.get("handoffId");
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

  it("does not downgrade SSO after a configuration read denial", async () => {
    const result = await load({
      ssoEnabled: true,
      allowedConsoleErrors: [/Generic_OpenSidebar error.*Synthetic read denied/],
    });
    result.retrieveMultipleRecords.mockImplementation(async (table) => {
      if (table === "sidebar_genericsidebar") throw new Error("Synthetic read denied");
      return { entities: [] };
    });
    await result.window.Generic_OpenSidebar();
    expect(result.pane.navigate).not.toHaveBeenCalled();
    expect(result.xrm.App.sidePanes.createPane).not.toHaveBeenCalled();
    expect(result.xrm.Navigation.openAlertDialog).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Synthetic read denied") }),
    );
    expect(result.retrieveMultipleRecords.mock.calls.filter(([table]) => table === "sidebar_genericsidebar")).toHaveLength(1);
  });

  it("navigates again when the same configuration changes from legacy to SSO", async () => {
    const existingPane = createPaneMock();
    const result = await load({ existingPane });
    await result.window.Generic_OpenSidebar();
    result.configRecord.sidebar_sso_enabled = true;
    await result.window.Generic_OpenSidebar();
    expect(existingPane.navigate).toHaveBeenCalledTimes(2);
    expect(existingPane.navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ webresourceName: "sidebar_sso_canvas" }),
    );
    expect(result.window.__sidebarLoadedRoute).toBe("sso-canvas");
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
      scopes: ["api://synthetic.test/Agent.Invoke", "api://synthetic.test/Agent.Read"],
      account: { username: "synthetic@example.test" },
    });
    const navigation = result.pane.navigate.mock.calls.find(([request]) => request.webresourceName === "sidebar_sso_canvas")[0];
    expect(navigation).toEqual({
      pageType: "webresource",
      webresourceName: "sidebar_sso_canvas",
      data: expect.stringMatching(/^handoffId=[a-f0-9]{32}$/),
    });
    expect(navigation.data).not.toContain("synthetic-silent-token");
    expect(navigation.data).not.toContain("powerplatform.com");
    const handoffId = getHandoffId(navigation);
    expect(result.window.SidebarSSO.consumeTokenHandoff(handoffId)).toEqual({
      userToken: "synthetic-silent-token",
      tokenEndpoint,
      expiresAt: expect.any(Number),
    });
    expect(() => result.window.SidebarSSO.consumeTokenHandoff(handoffId)).toThrow(/already used/);
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
    ["non-HTTPS token endpoint", { sidebar_auth_token_endpoint: "http://synthetic.environment.api.powerplatform.com/directline/token" }, /approved Copilot Studio/],
    ["lookalike token endpoint host", { sidebar_auth_token_endpoint: "https://synthetic.environment.api.powerplatform.com.attacker.test/directline/token" }, /approved Copilot Studio/],
    ["token endpoint with user information", { sidebar_auth_token_endpoint: "https://user@synthetic.environment.api.powerplatform.com/directline/token" }, /approved Copilot Studio/],
    ["token endpoint on the wrong path", { sidebar_auth_token_endpoint: "https://synthetic.environment.api.powerplatform.com/directline/token/forward" }, /approved Copilot Studio/],
    ["non-custom primary scope", { sidebar_auth_api_scope: "https://graph.microsoft.com/User.Read", sidebar_auth_scopes: "" }, /API Scope must use the format api:\/\//],
    ["mixed-resource scopes", { sidebar_auth_scopes: "User.Read api://synthetic.test/Agent.Invoke" }, /Additional OAuth scopes must target the same API resource|SSO Pane Navigation Failed|Secure navigation failed/],
  ])("fails closed after %s without recording a loaded route", async (_name, configOverrides, allowedError) => {
    const result = await load({
      ssoEnabled: true,
      configOverrides,
      allowedConsoleErrors: [allowedError, /SSO Pane Navigation Failed|SSO navigation failed|Secure navigation failed/],
    });
    await result.window.Generic_OpenSidebar();
    expectSecureSsoFailure(result);
    expect(result.msal.library.PublicClientApplication).not.toHaveBeenCalled();
  });

  it("uses the required API scope and deduplicates same-resource additional scopes", async () => {
    const result = await load({
      ssoEnabled: true,
      configOverrides: {
        sidebar_auth_scopes: "api://synthetic.test/Agent.Invoke api://synthetic.test/Agent.Read api://synthetic.test/Agent.Read",
      },
    });
    await result.window.Generic_OpenSidebar();
    expect(result.msal.instance.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: ["api://synthetic.test/Agent.Invoke", "api://synthetic.test/Agent.Read"],
      account: { username: "synthetic@example.test" },
    });
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
      data: expect.stringMatching(/^handoffId=[a-f0-9]{32}$/),
    }));
    const navigation = result.pane.navigate.mock.calls.find(([request]) => request.webresourceName === "sidebar_sso_canvas")[0];
    expect(result.window.SidebarSSO.consumeTokenHandoff(getHandoffId(navigation)).userToken).toBe("synthetic-popup-token");
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
    const failedNavigation = pane.navigate.mock.calls[0][0];
    expectSecureSsoFailure(result);
    expect(() => result.window.SidebarSSO.consumeTokenHandoff(getHandoffId(failedNavigation))).toThrow(/missing, expired, or already used/);
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

  it("reuses an MSAL client only for the same identity configuration", async () => {
    const first = createMsal();
    const second = createMsal({ accounts: [{ username: "second@example.test" }] });
    const library = {
      LogLevel: { Error: 3 },
      PublicClientApplication: vi.fn()
        .mockImplementationOnce(function PublicClientApplication() { return first.instance; })
        .mockImplementationOnce(function PublicClientApplication() { return second.instance; }),
    };
    const result = await load({ ssoEnabled: true, msal: { library, instance: first.instance } });
    await result.window.Generic_OpenSidebar();

    const baseConfig = {
      clientId: result.configRecord.sidebar_auth_client_id,
      authority: `https://login.microsoftonline.com/${result.configRecord.sidebar_auth_tenant_id}`,
      redirectUri: result.configRecord.sidebar_auth_redirect_uri,
      scopes: [result.configRecord.sidebar_auth_api_scope],
    };
    await result.window.SidebarSSO.acquireToken(baseConfig);
    expect(library.PublicClientApplication).toHaveBeenCalledOnce();

    await result.window.SidebarSSO.acquireToken({
      ...baseConfig,
      clientId: "44444444-4444-4444-8444-444444444444",
    });
    expect(library.PublicClientApplication).toHaveBeenCalledTimes(2);
    expect(second.instance.acquireTokenSilent).toHaveBeenCalledOnce();
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

  it("consumes an in-memory handoff and sends the bearer only in the exchange header", async () => {
    const consumeTokenHandoff = vi.fn(() => ({
      userToken: "synthetic-canvas-token",
      tokenEndpoint: "https://agent.example.test/token",
    }));
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "synthetic-direct-line-token" }),
    });
    const webChat = {
      createDirectLine: vi.fn(() => ({ connection: "synthetic" })),
      createStore: vi.fn(() => ({ dispatch: vi.fn() })),
      renderWebChat: vi.fn(),
    };
    const handoffId = "0123456789abcdef0123456789abcdef";
    resource = await loadSsoCanvas({ handoffId, consumeTokenHandoff, fetch, webChat });
    await resource.settle();

    expect(consumeTokenHandoff).toHaveBeenCalledWith(handoffId);
    expect(fetch).toHaveBeenCalledWith("https://agent.example.test/token", {
      method: "GET",
      redirect: "error",
      headers: { Authorization: "Bearer synthetic-canvas-token" },
    });
    expect(webChat.renderWebChat).toHaveBeenCalledWith(
      expect.any(Object),
      resource.document.getElementById("webchat"),
    );
    expect(resource.window.location.search).toBe("");
  });

  it("renders untrusted canvas errors as text instead of HTML", async () => {
    const maliciousDetail = '<img src=x onerror="window.__injected=true">Synthetic failure';
    const consumeTokenHandoff = vi.fn(() => {
      throw new Error(maliciousDetail);
    });
    resource = await loadSsoCanvas({
      handoffId: "0123456789abcdef0123456789abcdef",
      consumeTokenHandoff,
      fetch: vi.fn(),
      webChat: {},
    });
    await resource.settle();

    expect(resource.document.querySelector(".error-detail").textContent).toBe(maliciousDetail);
    expect(resource.document.querySelector(".error-message img")).toBeNull();
    expect(resource.window.__injected).toBeUndefined();
  });

  it("rejects expired SSO handoffs without navigating to anonymous content", async () => {
    const result = await load({ ssoEnabled: true });
    await result.window.Generic_OpenSidebar();
    const navigation = result.pane.navigate.mock.calls[0][0];
    vi.spyOn(result.window.Date, "now").mockReturnValue(Date.now() + 31000);
    expect(() => result.window.SidebarSSO.consumeTokenHandoff(getHandoffId(navigation)))
      .toThrow(/missing, expired, or already used/);
    expect(result.pane.navigate).not.toHaveBeenCalledWith(
      expect.objectContaining({ webresourceName: "sidebar_sidebar.html" }),
    );
  });
});