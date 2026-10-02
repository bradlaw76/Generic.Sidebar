/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Validation
 * FILE:         sidebar-designer/src/validation.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  React / TypeScript
 *
 * OVERVIEW
 * Performs deterministic client-side validation before Dataverse writes.
 *
 * ARCHITECTURE
 * - Input: DesignerSnapshot
 * - Output: Actionable findings linked to designer sections
 * - Side effects: None
 *
 * SECURITY MODEL
 * - Rejects unsafe URL schemes and warns about executable embed content.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial validation rules
 * ============================================================================
 */

import type {
  DesignerSection,
  DesignerSnapshot,
  ValidationFinding,
} from "./model";

const TAB_FIELDS = [
  {
    section: "tab-1",
    title: "sidebar_title1",
    embed: "sidebar_embedcode",
  },
  {
    section: "tab-2",
    title: "sidebar_title2",
    embed: "sidebar_embedcode2",
  },
  {
    section: "tab-3",
    title: "sidebar_title3",
    embed: "sidebar_embedcode3",
  },
  {
    section: "tab-4",
    title: "sidebar_title4",
    embed: "sidebar_embedcode4",
  },
] as const;

const isSafeUrl = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateSnapshot = (
  snapshot: DesignerSnapshot,
): ValidationFinding[] => {
  const { configuration, agents } = snapshot;
  const findings: ValidationFinding[] = [];
  const add = (
    id: string,
    severity: ValidationFinding["severity"],
    section: DesignerSection,
    message: string,
  ) => findings.push({ id, severity, section, message });

  if (!configuration.sidebar_title.trim()) {
    add(
      "configuration-title",
      "error",
      "overview",
      "Header title is required.",
    );
  }

  if (configuration.sidebar_iframewidth !== null) {
    if (
      configuration.sidebar_iframewidth < 240 ||
      configuration.sidebar_iframewidth > 1600
    ) {
      add(
        "iframe-width",
        "error",
        "appearance",
        "Iframe width must be between 240 and 1600 pixels.",
      );
    }
  }

  if (configuration.sidebar_iframeheight !== null) {
    if (
      configuration.sidebar_iframeheight < 240 ||
      configuration.sidebar_iframeheight > 2400
    ) {
      add(
        "iframe-height",
        "error",
        "appearance",
        "Iframe height must be between 240 and 2400 pixels.",
      );
    }
  }

  TAB_FIELDS.forEach((tab, index) => {
    const title = configuration[tab.title].trim();
    const embed = configuration[tab.embed].trim();
    if (embed && !title) {
      add(
        `tab-${index + 1}-title`,
        "warning",
        tab.section,
        `Tab ${index + 1} has content but no display title.`,
      );
    }
    if (/<script[\s>]/i.test(embed)) {
      add(
        `tab-${index + 1}-script`,
        "info",
        tab.section,
        `Tab ${index + 1} contains executable script and will preview in a sandbox.`,
      );
    }
  });

  const activeAgents = agents.filter((agent) => agent.sidebar_isactive);
  const defaultAgents = activeAgents.filter(
    (agent) => agent.sidebar_isdefaultagent,
  );
  if (defaultAgents.length > 1) {
    add(
      "multiple-default-agents",
      "error",
      "agents",
      "Only one active linked agent can be the default.",
    );
  }

  const keys = new Map<string, number>();
  agents.forEach((agent, index) => {
    const key = agent.sidebar_agentkey.trim().toLowerCase();
    if (!agent.sidebar_name.trim()) {
      add(
        `agent-${index}-name`,
        "error",
        "agents",
        `Agent ${index + 1} requires an agent name.`,
      );
    }
    if (!agent.sidebar_displayname.trim()) {
      add(
        `agent-${index}-display`,
        "error",
        "agents",
        `Agent ${index + 1} requires a display name.`,
      );
    }
    if (!key) {
      add(
        `agent-${index}-key`,
        "error",
        "agents",
        `Agent ${index + 1} requires an agent key.`,
      );
    } else {
      keys.set(key, (keys.get(key) ?? 0) + 1);
    }
    if (agent.sidebar_sortorder < 0) {
      add(
        `agent-${index}-sort`,
        "error",
        "agents",
        `Agent ${index + 1} sort order cannot be negative.`,
      );
    }
    if (!isSafeUrl(agent.sidebar_iconurl)) {
      add(
        `agent-${index}-icon`,
        "error",
        "agents",
        `Agent ${index + 1} icon URL must be a valid HTTPS URL.`,
      );
    }
    if (!isSafeUrl(agent.sidebar_tokenendpoint)) {
      add(
        `agent-${index}-token`,
        "error",
        "agents",
        `Agent ${index + 1} token endpoint must be a valid HTTPS URL.`,
      );
    }
  });

  keys.forEach((count, key) => {
    if (count > 1) {
      add(
        `duplicate-agent-${key}`,
        "error",
        "agents",
        `Agent key "${key}" is duplicated.`,
      );
    }
  });

  const menuTab = configuration.sidebar_agentmenutab ?? 100000000;
  if (menuTab !== 100000000 && activeAgents.length === 0) {
    add(
      "agent-menu-empty",
      "warning",
      "overview",
      "An agent menu tab is selected, but there are no active linked agents.",
    );
  }

  if (menuTab >= 100000001 && menuTab <= 100000004) {
    const tabIndex = menuTab - 100000001;
    const selectedTab = TAB_FIELDS[tabIndex];
    if (selectedTab && configuration[selectedTab.embed].trim()) {
      add(
        "agent-menu-content-conflict",
        "warning",
        selectedTab.section,
        `The linked-agent menu and embedded content are both configured for Tab ${tabIndex + 1}. The agent menu takes precedence when active agents exist.`,
      );
    }
  }

  if (findings.length === 0) {
    add(
      "validation-clean",
      "info",
      "validation",
      "Configuration is ready to save.",
    );
  }

  return findings;
};

export const hasBlockingFindings = (
  findings: ValidationFinding[],
): boolean => findings.some((finding) => finding.severity === "error");
