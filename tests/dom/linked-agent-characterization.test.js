import { afterEach, describe, expect, it } from "vitest";
import { SYNTHETIC_CONFIG_ID } from "../fixtures/sidebar-configs.js";
import { loadLinkedAgentPicker } from "../helpers/load-web-resource.js";
import { createXrmMock } from "../setup/xrm-mock.js";

function syntheticSidebarRecord() {
  return {
    sidebar_genericsidebarid: SYNTHETIC_CONFIG_ID,
    sidebar_title: "Synthetic Sidebar",
    sidebar_auth_client_id: "22222222-2222-4222-8222-222222222222",
    sidebar_auth_tenant_id: "33333333-3333-4333-8333-333333333333",
    sidebar_auth_api_scope: "api://synthetic.test/Test.Read",
    sidebar_auth_redirect_uri: "https://contoso.crm.dynamics.com/WebResources/synthetic_picker.html",
    sidebar_auth_scopes: "",
  };
}

function syntheticAgent(overrides = {}) {
  return {
    sidebar_genericsidebaragentid: "44444444-4444-4444-8444-444444444444",
    sidebar_name: "synthetic-agent",
    sidebar_agentkey: "synthetic-agent",
    sidebar_displayname: "Synthetic Agent",
    sidebar_description: "Synthetic agent for characterization",
    sidebar_tokenendpoint: "https://agent.example.test/token",
    sidebar_embedcode: "",
    sidebar_sortorder: 1,
    sidebar_isactive: true,
    sidebar_isdefaultagent: false,
    sidebar_authscopeoverride: "",
    sidebar_agenttype: "Copilot Studio",
    sidebar_iconurl: "",
    statecode: 0,
    statuscode: 1,
    ...overrides,
  };
}

describe("linked-agent picker characterization", () => {
  let resource;

  afterEach(() => resource?.close());

  function xrmForAgents(agentResult) {
    return createXrmMock({
      retrieveRecord: async () => syntheticSidebarRecord(),
      retrieveMultipleRecords: async (entityName) => {
        if (entityName === "sidebar_genericsidebaragent") return agentResult;
        return { entities: [syntheticSidebarRecord()] };
      },
    });
  }

  it("discovers parent.Xrm and renders a successful active-agent query", async () => {
    const mocks = xrmForAgents({ entities: [syntheticAgent()] });
    resource = await loadLinkedAgentPicker({ parentXrm: mocks.xrm });
    expect(mocks.retrieveRecord).toHaveBeenCalled();
    expect(mocks.retrieveMultipleRecords).toHaveBeenCalledWith(
      "sidebar_genericsidebaragent",
      expect.stringContaining("statecode eq 0"),
    );
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(1);
    expect(resource.document.querySelector(".quickBtn").textContent).toContain("Synthetic Agent");
  });

  it("uses window.opener.Xrm when parent Xrm is unavailable", async () => {
    const mocks = xrmForAgents({ entities: [syntheticAgent()] });
    resource = await loadLinkedAgentPicker({ openerXrm: mocks.xrm });
    expect(mocks.retrieveRecord).toHaveBeenCalled();
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(1);
  });

  it("renders an empty state after a successful empty Dataverse query", async () => {
    const mocks = xrmForAgents({ entities: [] });
    resource = await loadLinkedAgentPicker({ parentXrm: mocks.xrm });
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(0);
    expect(resource.document.querySelector("#quickActions").textContent).toContain("No active agents are configured");
  });

  it.each([
    "Generic Sidebar Agent table is missing",
    "Read access to Generic Sidebar Agent was denied",
  ])("shows an actionable dependency error when %s", async (message) => {
    const mocks = xrmForAgents({ entities: [] });
    mocks.retrieveMultipleRecords.mockImplementation(async (entityName) => {
      if (entityName === "sidebar_genericsidebaragent") throw new Error(message);
      return { entities: [syntheticSidebarRecord()] };
    });
    resource = await loadLinkedAgentPicker({
      parentXrm: mocks.xrm,
      allowedConsoleErrors: [/Linked-agent initialization failed/],
    });
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(0);
    const alert = resource.document.querySelector("#quickActions [role='alert']");
    expect(alert?.textContent).toContain("Generic Sidebar Agent table");
    expect(alert?.textContent).toContain("read permissions");
    expect(resource.document.querySelector("#quickActions").textContent).not.toContain("No active agents are configured");
    expect(resource.document.querySelector("#welcomeText").textContent).not.toContain("bundled agent list");
    expect(resource.document.querySelector("#frame").getAttribute("src")).toBe("about:blank");
  });

  it("does not substitute preview agents when no Dataverse configuration exists", async () => {
    const mocks = createXrmMock({
      retrieveRecord: async () => { throw new Error("Synthetic configuration not found"); },
      retrieveMultipleRecords: async () => ({ entities: [] }),
    });
    resource = await loadLinkedAgentPicker({
      parentXrm: mocks.xrm,
      allowedConsoleErrors: [/Linked-agent initialization failed/],
    });
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(0);
    expect(resource.document.querySelector("#quickActions [role='alert']")?.textContent).toContain("sidebar configuration");
    expect(mocks.retrieveMultipleRecords).not.toHaveBeenCalledWith(
      "sidebar_genericsidebaragent",
      expect.anything(),
    );
  });

  it("surfaces default-configuration query failures without offering bundled agents", async () => {
    const mocks = createXrmMock({
      retrieveRecord: async () => { throw new Error("Synthetic configuration not found"); },
      retrieveMultipleRecords: async () => { throw new Error("Synthetic configuration read denied"); },
    });
    resource = await loadLinkedAgentPicker({
      parentXrm: mocks.xrm,
      allowedConsoleErrors: [/Linked-agent initialization failed/],
    });
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(0);
    expect(resource.document.querySelector("#quickActions [role='alert']")).not.toBeNull();
    expect(resource.document.querySelector("#welcomeText").textContent).not.toContain("bundled agent list");
    expect(mocks.retrieveMultipleRecords).toHaveBeenCalledOnce();
  });

  it("retains a valid default configuration when the requested record is unavailable", async () => {
    const mocks = xrmForAgents({ entities: [syntheticAgent()] });
    mocks.retrieveRecord.mockRejectedValue(new Error("Synthetic configuration not found"));
    resource = await loadLinkedAgentPicker({ parentXrm: mocks.xrm });
    expect(mocks.retrieveMultipleRecords).toHaveBeenCalledWith(
      "sidebar_genericsidebaragent",
      expect.stringContaining(SYNTHETIC_CONFIG_ID),
    );
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(1);
    expect(resource.document.querySelector(".quickBtn").textContent).toContain("Synthetic Agent");
  });

  it("filters inactive rows returned despite the active query", async () => {
    const mocks = xrmForAgents({ entities: [syntheticAgent({ sidebar_isactive: false })] });
    resource = await loadLinkedAgentPicker({ parentXrm: mocks.xrm });
    expect(mocks.retrieveMultipleRecords).toHaveBeenCalledWith(
      "sidebar_genericsidebaragent",
      expect.stringContaining("sidebar_isactive ne false"),
    );
    expect(resource.document.querySelectorAll(".quickBtn")).toHaveLength(0);
    expect(resource.document.querySelector("#quickActions").textContent).toContain("No active agents are configured");
  });

  it("currently substitutes bundled fallback agents when Dynamics Xrm is unavailable", async () => {
    resource = await loadLinkedAgentPicker();
    expect(resource.document.querySelectorAll(".quickBtn").length).toBeGreaterThan(0);
    expect(resource.document.querySelector("#welcomeText").textContent).toContain("Using the bundled agent list");
  });

  it("reads existing picker sessions from sessionStorage without clearing them during initialization", async () => {
    const sessions = [{ key: "synthetic-agent", ts: 1786545808000 }];
    const mocks = xrmForAgents({ entities: [syntheticAgent()] });
    resource = await loadLinkedAgentPicker({ parentXrm: mocks.xrm, sessionData: sessions });
    expect(JSON.parse(resource.window.sessionStorage.getItem("ai_sessions"))).toEqual(sessions);
    const historyItems = resource.document.querySelectorAll("#historyList .historyItem");
    expect(historyItems).toHaveLength(1);
    expect(historyItems[0].textContent).toBe("Synthetic Agent");
  });
});