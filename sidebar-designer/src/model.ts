/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Domain Model
 * FILE:         sidebar-designer/src/model.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  React / TypeScript / Dataverse
 *
 * OVERVIEW
 * Defines the editable Generic Sidebar configuration and linked-agent models.
 *
 * ARCHITECTURE
 * - Tables: sidebar_genericsidebar, sidebar_genericsidebaragent
 * - State: Immutable React draft objects
 * - Persistence: SidebarRepository
 *
 * SECURITY MODEL
 * - Models contain configuration data only and never authentication tokens.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial domain model
 * ============================================================================
 */

export const CONFIG_ENTITY = "sidebar_genericsidebar";
export const CONFIG_ID = "sidebar_genericsidebarid";
export const AGENT_ENTITY = "sidebar_genericsidebaragent";
export const AGENT_ID = "sidebar_genericsidebaragentid";

export type DesignerSection =
  | "overview"
  | "tab-1"
  | "tab-2"
  | "tab-3"
  | "tab-4"
  | "agents"
  | "appearance"
  | "validation";

export interface ChoiceOption {
  label: string;
  value: number;
}

export const FILE_TYPE_OPTIONS: ChoiceOption[] = [
  { value: 172520000, label: ".js (Storage)" },
  { value: 172520001, label: ".html" },
  { value: 172520002, label: "Copilot Embed Code" },
  { value: 172520003, label: "Canvas App" },
];

export const AGENT_MENU_OPTIONS: ChoiceOption[] = [
  { value: 100000000, label: "None" },
  { value: 100000001, label: "Tab 1" },
  { value: 100000002, label: "Tab 2" },
  { value: 100000003, label: "Tab 3" },
  { value: 100000004, label: "Tab 4" },
];

export const AGENT_TYPE_OPTIONS: ChoiceOption[] = [
  { value: 100000000, label: "Copilot Studio" },
  { value: 100000001, label: "PVA Legacy" },
  { value: 100000002, label: "Other" },
];

export const IFRAME_THEME_OPTIONS: ChoiceOption[] = [
  { value: 172520000, label: "Dark" },
  { value: 172520001, label: "High Contrast" },
];

export interface SidebarConfiguration {
  _etag: string;
  sidebar_genericsidebarid: string;
  sidebar_title: string;
  sidebar_filetype: number | null;
  sidebar_quicktitle: string;
  sidebar_default: boolean;
  sidebar_quicknotes: string;
  sidebar_agentmenutab: number | null;
  sidebar_title1: string;
  sidebar_instructions: string;
  sidebar_embedcode: string;
  sidebar_title2: string;
  sidebar_instructions2: string;
  sidebar_embedcode2: string;
  sidebar_title3: string;
  sidebar_instructions3: string;
  sidebar_embedcode3: string;
  sidebar_title4: string;
  sidebar_instructions4: string;
  sidebar_embedcode4: string;
  sidebar_primarycolor: string;
  sidebar_textcolor: string;
  sidebar_linkcolor: string;
  sidebar_iframeallow: string;
  sidebar_iframeheight: number | null;
  sidebar_iframestyle: string;
  sidebar_iframetheme: number | null;
  sidebar_iframewidth: number | null;
  sidebar_sidebaricon: string;
}

export interface SidebarAgent {
  _etag?: string;
  sidebar_genericsidebaragentid?: string;
  sidebar_name: string;
  sidebar_displayname: string;
  sidebar_agentkey: string;
  sidebar_agenttype: number | null;
  sidebar_description: string;
  sidebar_embedcode: string;
  sidebar_iconurl: string;
  sidebar_isactive: boolean;
  sidebar_isdefaultagent: boolean;
  sidebar_sortorder: number;
  sidebar_authscopeoverride: string;
  sidebar_tokenendpoint: string;
}

export interface DesignerSnapshot {
  configuration: SidebarConfiguration;
  agents: SidebarAgent[];
}

export interface ValidationFinding {
  id: string;
  severity: "error" | "warning" | "info";
  section: DesignerSection;
  message: string;
}

export interface SidebarRepository {
  listConfigurations(): Promise<SidebarConfiguration[]>;
  listAgents(configurationId: string): Promise<SidebarAgent[]>;
  save(
    snapshot: DesignerSnapshot,
    deletedAgents: SidebarAgent[],
    defaultConfigurationsToClear: SidebarConfiguration[],
  ): Promise<void>;
}

export const EMPTY_CONFIGURATION: SidebarConfiguration = {
  _etag: "",
  sidebar_genericsidebarid: "",
  sidebar_title: "",
  sidebar_filetype: null,
  sidebar_quicktitle: "",
  sidebar_default: false,
  sidebar_quicknotes: "",
  sidebar_agentmenutab: 100000000,
  sidebar_title1: "",
  sidebar_instructions: "",
  sidebar_embedcode: "",
  sidebar_title2: "",
  sidebar_instructions2: "",
  sidebar_embedcode2: "",
  sidebar_title3: "",
  sidebar_instructions3: "",
  sidebar_embedcode3: "",
  sidebar_title4: "",
  sidebar_instructions4: "",
  sidebar_embedcode4: "",
  sidebar_primarycolor: "#0f6cbd",
  sidebar_textcolor: "#242424",
  sidebar_linkcolor: "#115ea3",
  sidebar_iframeallow: "",
  sidebar_iframeheight: 600,
  sidebar_iframestyle: "",
  sidebar_iframetheme: null,
  sidebar_iframewidth: 400,
  sidebar_sidebaricon: "",
};

export const createEmptyAgent = (sortOrder: number): SidebarAgent => ({
  sidebar_name: "",
  sidebar_displayname: "",
  sidebar_agentkey: "",
  sidebar_agenttype: 100000000,
  sidebar_description: "",
  sidebar_embedcode: "",
  sidebar_iconurl: "",
  sidebar_isactive: true,
  sidebar_isdefaultagent: false,
  sidebar_sortorder: sortOrder,
  sidebar_authscopeoverride: "",
  sidebar_tokenendpoint: "",
});

export const normalizeGuid = (value: string): string =>
  value.replace(/[{}]/g, "").toLowerCase();
