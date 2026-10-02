/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Explicit Demo Repository
 * FILE:         sidebar-designer/src/mockData.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  Local React development only
 *
 * OVERVIEW
 * Supplies deterministic sample data only when the URL explicitly includes
 * ?demo=1. It is never selected as a production fallback.
 *
 * SECURITY MODEL
 * - No network requests or credentials.
 * - Demo mode must be explicitly requested.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial local demo data
 * ============================================================================
 */

import {
  type DesignerSnapshot,
  type SidebarAgent,
  type SidebarConfiguration,
  type SidebarRepository,
} from "./model";

const configuration: SidebarConfiguration = {
  _etag: 'W/"1"',
  sidebar_genericsidebarid: "00000000-0000-0000-0000-000000000001",
  sidebar_title: "SSA Agent Support",
  sidebar_filetype: 172520001,
  sidebar_quicktitle: "SSA Federal Fraud Integrity Advisor",
  sidebar_default: true,
  sidebar_quicknotes: "Primary sidebar configuration for SSA support agents.",
  sidebar_agentmenutab: 100000001,
  sidebar_title1: "Federal Fraud Support",
  sidebar_instructions: "Select a linked agent to begin.",
  sidebar_embedcode: "",
  sidebar_title2: "Reference",
  sidebar_instructions2: "Important case-reference links.",
  sidebar_embedcode2: "<p>Reference content</p>",
  sidebar_title3: "Escalation",
  sidebar_instructions3: "",
  sidebar_embedcode3: "",
  sidebar_title4: "Resources",
  sidebar_instructions4: "",
  sidebar_embedcode4: "",
  sidebar_primarycolor: "#0f6cbd",
  sidebar_textcolor: "#242424",
  sidebar_linkcolor: "#115ea3",
  sidebar_iframeallow: "clipboard-read; clipboard-write",
  sidebar_iframeheight: 720,
  sidebar_iframestyle: "border:0",
  sidebar_iframetheme: null,
  sidebar_iframewidth: 420,
  sidebar_sidebaricon: "",
};

const agents: SidebarAgent[] = [
  {
    _etag: 'W/"11"',
    sidebar_genericsidebaragentid:
      "00000000-0000-0000-0000-000000000011",
    sidebar_name: "Federal Earnings Fraud Navigator",
    sidebar_displayname: "Federal Earnings Fraud Navigator",
    sidebar_agentkey: "earnings-fraud",
    sidebar_agenttype: 100000000,
    sidebar_description: "Assists with federal earnings fraud investigations.",
    sidebar_embedcode: "<p>Fraud navigator agent</p>",
    sidebar_iconurl: "",
    sidebar_isactive: true,
    sidebar_isdefaultagent: true,
    sidebar_sortorder: 10,
    sidebar_authscopeoverride: "",
    sidebar_tokenendpoint: "",
  },
  {
    _etag: 'W/"12"',
    sidebar_genericsidebaragentid:
      "00000000-0000-0000-0000-000000000012",
    sidebar_name: "General IT Services & Support Agent",
    sidebar_displayname: "IT Support",
    sidebar_agentkey: "it-support",
    sidebar_agenttype: 100000000,
    sidebar_description: "General IT support.",
    sidebar_embedcode: "<p>IT support agent</p>",
    sidebar_iconurl: "",
    sidebar_isactive: true,
    sidebar_isdefaultagent: false,
    sidebar_sortorder: 20,
    sidebar_authscopeoverride: "",
    sidebar_tokenendpoint: "",
  },
];

export class MockSidebarRepository implements SidebarRepository {
  private configuration = structuredClone(configuration);
  private agents = structuredClone(agents);

  async listConfigurations(): Promise<SidebarConfiguration[]> {
    return [structuredClone(this.configuration)];
  }

  async listAgents(): Promise<SidebarAgent[]> {
    return structuredClone(this.agents);
  }

  async save(
    snapshot: DesignerSnapshot,
    deletedAgents: SidebarAgent[],
    defaultConfigurationsToClear: SidebarConfiguration[],
  ): Promise<void> {
    void defaultConfigurationsToClear;
    this.configuration = structuredClone(snapshot.configuration);
    this.agents = snapshot.agents
      .filter(
        (agent) =>
          !agent.sidebar_genericsidebaragentid ||
          !deletedAgents.some(
            (deleted) =>
              deleted.sidebar_genericsidebaragentid ===
              agent.sidebar_genericsidebaragentid,
          ),
      )
      .map((agent, index) => ({
        ...agent,
        _etag: `W/"${index + 100}"`,
        sidebar_genericsidebaragentid:
          agent.sidebar_genericsidebaragentid ??
          `00000000-0000-0000-0000-${String(index + 100).padStart(12, "0")}`,
      }));
    this.configuration._etag = 'W/"2"';
  }
}
