/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Workbench
 * FILE:         sidebar-designer/src/App.tsx
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  React / Fluent UI / Dataverse
 *
 * OVERVIEW
 * Provides task-focused editing, linked-agent management, validation, and a
 * sandboxed preview for Generic Sidebar configuration records.
 *
 * ARCHITECTURE
 * - UI: Fluent UI v9
 * - State: Local immutable drafts with dirty-state tracking
 * - Data: SidebarRepository abstraction
 * - Preview: Sandboxed iframe without same-origin access
 *
 * FEATURES
 * - Configuration selection and refresh
 * - Overview and Tab 1-4 content editing
 * - Linked-agent CRUD, defaulting, and ordering
 * - Appearance and iframe configuration
 * - Blocking validation and contextual navigation
 * - Explicit save state and partial-save error reporting
 *
 * SECURITY MODEL
 * - Dataverse operations run as the signed-in user.
 * - Embed previews run in a sandbox without same-origin privileges.
 * - Unsafe URL schemes are blocked by validation.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial workbench
 * ============================================================================
 */

import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Label,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Select,
  Spinner,
  Tab,
  TabList,
  Text,
  Textarea,
  Title1,
  Title2,
  Title3,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  Add24Regular,
  ArrowDown20Regular,
  ArrowUp20Regular,
  CheckmarkCircle20Regular,
  Delete20Regular,
  Edit20Regular,
  Eye20Regular,
  Save24Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AGENT_MENU_OPTIONS,
  AGENT_TYPE_OPTIONS,
  FILE_TYPE_OPTIONS,
  IFRAME_THEME_OPTIONS,
  createEmptyAgent,
  type ChoiceOption,
  type DesignerSection,
  type DesignerSnapshot,
  type SidebarAgent,
  type SidebarConfiguration,
  type SidebarRepository,
  type ValidationFinding,
} from "./model";
import { hasBlockingFindings, validateSnapshot } from "./validation";

const useStyles = makeStyles({
  shell: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerIdentity: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  body: {
    display: "grid",
    gridTemplateColumns: "240px minmax(520px, 1fr) minmax(320px, 420px)",
    minHeight: 0,
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: "none",
    "@media (max-width: 1350px)": {
      gridTemplateColumns: "220px minmax(520px, 1fr)",
    },
  },
  nav: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: "auto",
  },
  main: {
    padding: tokens.spacingVerticalXL,
    overflowY: "auto",
  },
  preview: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: "auto",
    "@media (max-width: 1350px)": {
      display: "none",
    },
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    maxWidth: "920px",
  },
  sectionHeader: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  card: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 1050px)": {
      gridTemplateColumns: "1fr",
    },
  },
  fieldSpan: {
    gridColumn: "1 / -1",
  },
  navTabs: {
    width: "100%",
  },
  navFooter: {
    display: "grid",
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalXL,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  agentToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  agentList: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  agentRow: {
    display: "grid",
    gridTemplateColumns: "40px minmax(180px, 1.4fr) minmax(120px, 1fr) 90px 110px auto",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  agentActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalXS,
  },
  finding: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  previewFrame: {
    width: "100%",
    height: "640px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: "#ffffff",
  },
  previewTabs: {
    marginBottom: tokens.spacingVerticalM,
  },
  dialogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalM,
    minWidth: "680px",
  },
  code: {
    fontFamily: "Cascadia Code, Consolas, monospace",
  },
  errorPage: {
    maxWidth: "720px",
    margin: "80px auto",
    padding: tokens.spacingVerticalXXL,
  },
});

const SECTION_LABELS: Record<DesignerSection, string> = {
  overview: "Overview",
  "tab-1": "Tab 1",
  "tab-2": "Tab 2",
  "tab-3": "Tab 3",
  "tab-4": "Tab 4",
  agents: "Linked Agents",
  appearance: "Appearance",
  validation: "Validation",
};

const snapshotKey = (
  snapshot: DesignerSnapshot | null,
  deletedAgents: SidebarAgent[],
): string =>
  snapshot
    ? JSON.stringify({
        snapshot,
        deletedAgentIds: deletedAgents
          .map((agent) => agent.sidebar_genericsidebaragentid)
          .sort(),
      })
    : "";

const numberOrNull = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const choiceLabel = (
  options: ChoiceOption[],
  value: number | null,
): string => options.find((option) => option.value === value)?.label ?? "None";

const tabValues = (
  configuration: SidebarConfiguration,
  tabNumber: number,
): { title: string; instructions: string; embed: string } => {
  switch (tabNumber) {
    case 1:
      return {
        title: configuration.sidebar_title1,
        instructions: configuration.sidebar_instructions,
        embed: configuration.sidebar_embedcode,
      };
    case 2:
      return {
        title: configuration.sidebar_title2,
        instructions: configuration.sidebar_instructions2,
        embed: configuration.sidebar_embedcode2,
      };
    case 3:
      return {
        title: configuration.sidebar_title3,
        instructions: configuration.sidebar_instructions3,
        embed: configuration.sidebar_embedcode3,
      };
    default:
      return {
        title: configuration.sidebar_title4,
        instructions: configuration.sidebar_instructions4,
        embed: configuration.sidebar_embedcode4,
      };
  }
};

const previewDocument = (
  configuration: SidebarConfiguration,
  tabNumber: number,
): string => {
  const tab = tabValues(configuration, tabNumber);
  const primary = configuration.sidebar_primarycolor || "#0f6cbd";
  const text = configuration.sidebar_textcolor || "#242424";
  const link = configuration.sidebar_linkcolor || "#115ea3";
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{margin:0;font-family:"Segoe UI",sans-serif;color:${text};background:#fff}
header{padding:16px 18px;background:${primary};color:#fff;font-weight:600}
nav{display:flex;gap:4px;padding:10px;border-bottom:1px solid #ddd}
nav span{padding:6px 10px;border-radius:4px;background:#f5f5f5}
nav .active{background:${primary};color:#fff}
main{padding:18px;line-height:1.45}
a{color:${link}}
.instructions{padding:10px 12px;margin-bottom:16px;background:#f5f5f5;border-left:3px solid ${primary}}
.empty{color:#666;font-style:italic}
</style></head><body>
<header>${configuration.sidebar_title || "Generic Sidebar"}</header>
<nav>${[1, 2, 3, 4]
    .map(
      (value) =>
        `<span class="${value === tabNumber ? "active" : ""}">${tabValues(configuration, value).title || `Tab ${value}`}</span>`,
    )
    .join("")}</nav>
<main>
${tab.instructions ? `<div class="instructions">${tab.instructions}</div>` : ""}
${tab.embed || '<div class="empty">No embedded content configured.</div>'}
</main></body></html>`;
};

interface AppProps {
  repository: SidebarRepository;
  demoMode: boolean;
}

export function App({ repository, demoMode }: AppProps) {
  const styles = useStyles();
  const [configurations, setConfigurations] = useState<
    SidebarConfiguration[]
  >([]);
  const [snapshot, setSnapshot] = useState<DesignerSnapshot | null>(null);
  const [baselineKey, setBaselineKey] = useState("");
  const [deletedAgents, setDeletedAgents] = useState<SidebarAgent[]>([]);
  const [activeSection, setActiveSection] =
    useState<DesignerSection>("overview");
  const [previewTab, setPreviewTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingAgentIndex, setEditingAgentIndex] = useState<number | null>(
    null,
  );
  const [agentDraft, setAgentDraft] = useState<SidebarAgent | null>(null);
  const [deleteAgentIndex, setDeleteAgentIndex] = useState<number | null>(null);
  const selectedConfigurationId = snapshot?.configuration
    .sidebar_genericsidebarid;
  const currentKey = snapshotKey(snapshot, deletedAgents);
  const isDirty = Boolean(snapshot) && currentKey !== baselineKey;
  const findings = useMemo(
    () => (snapshot ? validateSnapshot(snapshot) : []),
    [snapshot],
  );
  const blocking = hasBlockingFindings(findings);
  const loadGeneration = useRef(0);

  const loadConfiguration = useCallback(
    async (
      configuration: SidebarConfiguration,
      allConfigurations?: SidebarConfiguration[],
    ) => {
      const generation = ++loadGeneration.current;
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const agents = await repository.listAgents(
          configuration.sidebar_genericsidebarid,
        );
        if (generation !== loadGeneration.current) {
          return;
        }
        const next = {
          configuration: structuredClone(configuration),
          agents,
        };
        if (allConfigurations) {
          setConfigurations(allConfigurations);
        }
        setSnapshot(next);
        setDeletedAgents([]);
        setBaselineKey(snapshotKey(next, []));
      } catch (loadError) {
        if (generation === loadGeneration.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The configuration could not be loaded.",
          );
        }
      } finally {
        if (generation === loadGeneration.current) {
          setLoading(false);
        }
      }
    },
    [repository],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const available = await repository.listConfigurations();
      if (available.length === 0) {
        throw new Error(
          "No Generic Sidebar configuration records are available to the current user.",
        );
      }
      const preferred =
        available.find((configuration) => configuration.sidebar_default) ??
        available[0];
      await loadConfiguration(preferred, available);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The designer could not load.",
      );
      setLoading(false);
    }
  }, [loadConfiguration, repository]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  const updateConfiguration = <K extends keyof SidebarConfiguration>(
    field: K,
    value: SidebarConfiguration[K],
  ) => {
    setSnapshot((current) =>
      current
        ? {
            ...current,
            configuration: { ...current.configuration, [field]: value },
          }
        : current,
    );
    setNotice("");
  };

  const updateAgentDraft = <K extends keyof SidebarAgent>(
    field: K,
    value: SidebarAgent[K],
  ) => {
    setAgentDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const openNewAgent = () => {
    const nextSort =
      Math.max(0, ...(snapshot?.agents.map((agent) => agent.sidebar_sortorder) ?? [])) +
      10;
    setEditingAgentIndex(null);
    setAgentDraft(createEmptyAgent(nextSort));
  };

  const openEditAgent = (index: number) => {
    if (!snapshot) {
      return;
    }
    setEditingAgentIndex(index);
    setAgentDraft(structuredClone(snapshot.agents[index]));
  };

  const commitAgentDraft = () => {
    if (!snapshot || !agentDraft) {
      return;
    }
    setSnapshot((current) => {
      if (!current) {
        return current;
      }
      const agents = [...current.agents];
      if (editingAgentIndex === null) {
        agents.push(agentDraft);
      } else {
        agents[editingAgentIndex] = agentDraft;
      }
      if (agentDraft.sidebar_isdefaultagent) {
        for (let index = 0; index < agents.length; index += 1) {
          if (
            index !==
            (editingAgentIndex === null ? agents.length - 1 : editingAgentIndex)
          ) {
            agents[index] = {
              ...agents[index],
              sidebar_isdefaultagent: false,
            };
          }
        }
      }
      return { ...current, agents };
    });
    setAgentDraft(null);
    setEditingAgentIndex(null);
  };

  const confirmDeleteAgent = () => {
    if (!snapshot || deleteAgentIndex === null) {
      return;
    }
    const agent = snapshot.agents[deleteAgentIndex];
    if (agent.sidebar_genericsidebaragentid) {
      setDeletedAgents((current) => [...current, structuredClone(agent)]);
    }
    setSnapshot((current) =>
      current
        ? {
            ...current,
            agents: current.agents.filter(
              (_, index) => index !== deleteAgentIndex,
            ),
          }
        : current,
    );
    setDeleteAgentIndex(null);
  };

  const moveAgent = (index: number, direction: -1 | 1) => {
    setSnapshot((current) => {
      if (!current) {
        return current;
      }
      const destination = index + direction;
      if (destination < 0 || destination >= current.agents.length) {
        return current;
      }
      const agents = [...current.agents];
      [agents[index], agents[destination]] = [
        agents[destination],
        agents[index],
      ];
      return {
        ...current,
        agents: agents.map((agent, order) => ({
          ...agent,
          sidebar_sortorder: (order + 1) * 10,
        })),
      };
    });
  };

  const save = async () => {
    if (!snapshot || blocking) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const defaultsToClear = configuration.sidebar_default
        ? configurations.filter(
            (candidate) =>
              candidate.sidebar_default &&
              candidate.sidebar_genericsidebarid !==
                configuration.sidebar_genericsidebarid,
          )
        : [];
      await repository.save(snapshot, deletedAgents, defaultsToClear);
      const available = await repository.listConfigurations();
      const savedConfiguration = available.find(
        (candidate) =>
          candidate.sidebar_genericsidebarid ===
          configuration.sidebar_genericsidebarid,
      );
      if (!savedConfiguration) {
        throw new Error(
          "The save succeeded, but the configuration could not be reloaded.",
        );
      }
      const savedAgents = await repository.listAgents(
        savedConfiguration.sidebar_genericsidebarid,
      );
      const saved = {
        configuration: savedConfiguration,
        agents: savedAgents,
      };
      setConfigurations(available);
      setSnapshot(saved);
      setDeletedAgents([]);
      setBaselineKey(snapshotKey(saved, []));
      setNotice("Changes saved and validated successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Dataverse rejected the save.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !snapshot) {
    return (
      <div className={styles.errorPage}>
        <Spinner size="large" label="Loading Generic Sidebar Designer…" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={styles.errorPage}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Designer unavailable</MessageBarTitle>
            {error || "No editable configuration was loaded."}
          </MessageBarBody>
        </MessageBar>
        <Button onClick={() => void loadAll()}>Retry</Button>
      </div>
    );
  }

  const configuration = snapshot.configuration;

  const tabEditor = (tabNumber: number) => {
    const values = tabValues(configuration, tabNumber);
    const titleField = `sidebar_title${tabNumber}` as
      | "sidebar_title1"
      | "sidebar_title2"
      | "sidebar_title3"
      | "sidebar_title4";
    const instructionField = (
      tabNumber === 1 ? "sidebar_instructions" : `sidebar_instructions${tabNumber}`
    ) as
      | "sidebar_instructions"
      | "sidebar_instructions2"
      | "sidebar_instructions3"
      | "sidebar_instructions4";
    const embedField = (
      tabNumber === 1 ? "sidebar_embedcode" : `sidebar_embedcode${tabNumber}`
    ) as
      | "sidebar_embedcode"
      | "sidebar_embedcode2"
      | "sidebar_embedcode3"
      | "sidebar_embedcode4";
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title2>Tab {tabNumber}</Title2>
          <Text>
            Configure the label, administrator guidance, and rendered content
            for this sidebar slot.
          </Text>
        </div>
        <div className={styles.card}>
          <Field label="Display title">
            <Input
              value={values.title}
              onChange={(_, data) =>
                updateConfiguration(titleField, data.value)
              }
            />
          </Field>
          <Field
            label="Instructions"
            hint="Shown above the tab content when instructions are configured."
          >
            <Textarea
              resize="vertical"
              rows={7}
              value={values.instructions}
              onChange={(_, data) =>
                updateConfiguration(instructionField, data.value)
              }
            />
          </Field>
          <Field
            label="Embed code"
            hint="HTML or supported embed markup rendered by Generic.Sidebar."
          >
            <Textarea
              className={styles.code}
              resize="vertical"
              rows={16}
              value={values.embed}
              onChange={(_, data) =>
                updateConfiguration(embedField, data.value)
              }
            />
          </Field>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title2>Overview</Title2>
              <Text>
                Set record identity, sidebar behavior, and administrator notes.
              </Text>
            </div>
            <div className={styles.card}>
              <Title3>Configuration identity</Title3>
              <div className={styles.grid2}>
                <Field label="Header title" required>
                  <Input
                    value={configuration.sidebar_title}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_title", data.value)
                    }
                  />
                </Field>
                <Field label="Content type">
                  <Select
                    value={String(configuration.sidebar_filetype ?? "")}
                    onChange={(_, data) =>
                      updateConfiguration(
                        "sidebar_filetype",
                        numberOrNull(data.value),
                      )
                    }
                  >
                    <option value="">Not selected</option>
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quick title">
                  <Input
                    value={configuration.sidebar_quicktitle}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_quicktitle", data.value)
                    }
                  />
                </Field>
                <Field label="Default configuration">
                  {configurations.find(
                    (candidate) =>
                      candidate.sidebar_genericsidebarid ===
                      configuration.sidebar_genericsidebarid,
                  )?.sidebar_default ? (
                    <Badge appearance="filled" color="brand">
                      Current shared default
                    </Badge>
                  ) : (
                    <Checkbox
                      checked={configuration.sidebar_default}
                      label="Make this the shared default when saved"
                      onChange={(_, data) =>
                        updateConfiguration(
                          "sidebar_default",
                          data.checked === true,
                        )
                      }
                    />
                  )}
                </Field>
                <Field className={styles.fieldSpan} label="Quick notes">
                  <Textarea
                    resize="vertical"
                    rows={4}
                    value={configuration.sidebar_quicknotes}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_quicknotes", data.value)
                    }
                  />
                </Field>
              </div>
            </div>
            <div className={styles.card}>
              <Title3>Sidebar behavior</Title3>
              <Field
                label="Linked-agent menu tab"
                hint="Active linked agents replace embedded content in the selected tab."
              >
                <Select
                  value={String(
                    configuration.sidebar_agentmenutab ?? 100000000,
                  )}
                  onChange={(_, data) =>
                    updateConfiguration(
                      "sidebar_agentmenutab",
                      numberOrNull(data.value),
                    )
                  }
                >
                  {AGENT_MENU_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        );
      case "tab-1":
        return tabEditor(1);
      case "tab-2":
        return tabEditor(2);
      case "tab-3":
        return tabEditor(3);
      case "tab-4":
        return tabEditor(4);
      case "agents":
        return (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title2>Linked Agents</Title2>
              <Text>
                Manage the agents rendered in{" "}
                {choiceLabel(
                  AGENT_MENU_OPTIONS,
                  configuration.sidebar_agentmenutab,
                )}
                .
              </Text>
            </div>
            <div className={styles.card}>
              <div className={styles.agentToolbar}>
                <div className={styles.statusRow}>
                  <Badge appearance="filled">
                    {snapshot.agents.length} total
                  </Badge>
                  <Badge appearance="outline">
                    {
                      snapshot.agents.filter(
                        (agent) => agent.sidebar_isactive,
                      ).length
                    }{" "}
                    active
                  </Badge>
                </div>
                <Button
                  appearance="primary"
                  icon={<Add24Regular />}
                  onClick={openNewAgent}
                >
                  Add agent
                </Button>
              </div>
              <div className={styles.agentList}>
                {snapshot.agents.length === 0 ? (
                  <Text>No linked agents have been configured.</Text>
                ) : (
                  snapshot.agents.map((agent, index) => (
                    <div
                      className={styles.agentRow}
                      key={
                        agent.sidebar_genericsidebaragentid ??
                        `new-agent-${index}`
                      }
                    >
                      <div>
                        <Tooltip content="Move up" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<ArrowUp20Regular />}
                            disabled={index === 0}
                            onClick={() => moveAgent(index, -1)}
                            aria-label={`Move ${agent.sidebar_displayname || agent.sidebar_name} up`}
                          />
                        </Tooltip>
                        <Tooltip content="Move down" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<ArrowDown20Regular />}
                            disabled={index === snapshot.agents.length - 1}
                            onClick={() => moveAgent(index, 1)}
                            aria-label={`Move ${agent.sidebar_displayname || agent.sidebar_name} down`}
                          />
                        </Tooltip>
                      </div>
                      <div>
                        <Text weight="semibold" block>
                          {agent.sidebar_displayname ||
                            agent.sidebar_name ||
                            "Unnamed agent"}
                        </Text>
                        <Text size={200}>{agent.sidebar_agentkey}</Text>
                      </div>
                      <Text>
                        {choiceLabel(
                          AGENT_TYPE_OPTIONS,
                          agent.sidebar_agenttype,
                        )}
                      </Text>
                      <Text>{agent.sidebar_sortorder}</Text>
                      <div className={styles.statusRow}>
                        <Badge
                          appearance="tint"
                          color={
                            agent.sidebar_isactive ? "success" : "informative"
                          }
                        >
                          {agent.sidebar_isactive ? "Active" : "Inactive"}
                        </Badge>
                        {agent.sidebar_isdefaultagent && (
                          <Badge appearance="filled" color="brand">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className={styles.agentActions}>
                        <Tooltip content="Edit agent" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<Edit20Regular />}
                            onClick={() => openEditAgent(index)}
                            aria-label={`Edit ${agent.sidebar_displayname || agent.sidebar_name}`}
                          />
                        </Tooltip>
                        <Tooltip content="Delete agent" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<Delete20Regular />}
                            onClick={() => setDeleteAgentIndex(index)}
                            aria-label={`Delete ${agent.sidebar_displayname || agent.sidebar_name}`}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case "appearance":
        return (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title2>Appearance and frame</Title2>
              <Text>
                Configure colors, dimensions, permissions, and optional icon
                behavior.
              </Text>
            </div>
            <div className={styles.card}>
              <Title3>Colors</Title3>
              <div className={styles.grid2}>
                <Field label="Primary color">
                  <input
                    type="color"
                    aria-label="Primary color"
                    value={configuration.sidebar_primarycolor || "#0f6cbd"}
                    onChange={(event) =>
                      updateConfiguration(
                        "sidebar_primarycolor",
                        event.target.value,
                      )
                    }
                  />
                </Field>
                <Field label="Text color">
                  <input
                    type="color"
                    aria-label="Text color"
                    value={configuration.sidebar_textcolor || "#242424"}
                    onChange={(event) =>
                      updateConfiguration(
                        "sidebar_textcolor",
                        event.target.value,
                      )
                    }
                  />
                </Field>
                <Field label="Link color">
                  <input
                    type="color"
                    aria-label="Link color"
                    value={configuration.sidebar_linkcolor || "#115ea3"}
                    onChange={(event) =>
                      updateConfiguration(
                        "sidebar_linkcolor",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            </div>
            <div className={styles.card}>
              <Title3>Embedded frame</Title3>
              <div className={styles.grid2}>
                <Field label="Width (pixels)">
                  <Input
                    type="number"
                    min={240}
                    max={1600}
                    value={String(configuration.sidebar_iframewidth ?? "")}
                    onChange={(_, data) =>
                      updateConfiguration(
                        "sidebar_iframewidth",
                        numberOrNull(data.value),
                      )
                    }
                  />
                </Field>
                <Field label="Height (pixels)">
                  <Input
                    type="number"
                    min={240}
                    max={2400}
                    value={String(configuration.sidebar_iframeheight ?? "")}
                    onChange={(_, data) =>
                      updateConfiguration(
                        "sidebar_iframeheight",
                        numberOrNull(data.value),
                      )
                    }
                  />
                </Field>
                <Field label="Theme">
                  <Select
                    value={String(configuration.sidebar_iframetheme ?? "")}
                    onChange={(_, data) =>
                      updateConfiguration(
                        "sidebar_iframetheme",
                        numberOrNull(data.value),
                      )
                    }
                  >
                    <option value="">Default</option>
                    {IFRAME_THEME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Allow permissions">
                  <Input
                    value={configuration.sidebar_iframeallow}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_iframeallow", data.value)
                    }
                  />
                </Field>
                <Field className={styles.fieldSpan} label="Inline style">
                  <Textarea
                    className={styles.code}
                    rows={4}
                    resize="vertical"
                    value={configuration.sidebar_iframestyle}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_iframestyle", data.value)
                    }
                  />
                </Field>
                <Field className={styles.fieldSpan} label="Sidebar icon">
                  <Input
                    value={configuration.sidebar_sidebaricon}
                    onChange={(_, data) =>
                      updateConfiguration("sidebar_sidebaricon", data.value)
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        );
      case "validation":
        return (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Title2>Validation</Title2>
              <Text>
                Resolve blocking errors before saving. Warnings document
                potentially surprising runtime behavior.
              </Text>
            </div>
            <div className={styles.card}>
              <div className={styles.statusRow}>
                <Badge appearance="filled" color={blocking ? "danger" : "success"}>
                  {
                    findings.filter((finding) => finding.severity === "error")
                      .length
                  }{" "}
                  errors
                </Badge>
                <Badge appearance="outline" color="warning">
                  {
                    findings.filter(
                      (finding) => finding.severity === "warning",
                    ).length
                  }{" "}
                  warnings
                </Badge>
              </div>
              {findings.map((finding) => (
                <div className={styles.finding} key={finding.id}>
                  {finding.severity === "error" ? (
                    <Warning20Regular color={tokens.colorPaletteRedForeground1} />
                  ) : (
                    <CheckmarkCircle20Regular
                      color={tokens.colorPaletteBlueForeground2}
                    />
                  )}
                  <Text>{finding.message}</Text>
                  <Button
                    size="small"
                    onClick={() => setActiveSection(finding.section)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerIdentity}>
          <div>
            <Title1>Sidebar Designer</Title1>
            <Text block>
              {configuration.sidebar_title || "Untitled configuration"}
            </Text>
          </div>
          {demoMode && <Badge color="warning">Demo data</Badge>}
          {isDirty && <Badge appearance="tint">Unsaved changes</Badge>}
        </div>
        <div className={styles.headerActions}>
          <Combobox
            aria-label="Configuration"
            value={configuration.sidebar_title}
            selectedOptions={[configuration.sidebar_genericsidebarid]}
            onOptionSelect={(_, data) => {
              const selected = configurations.find(
                (item) =>
                  item.sidebar_genericsidebarid === data.optionValue,
              );
              if (selected && (!isDirty || window.confirm("Discard unsaved changes?"))) {
                void loadConfiguration(selected);
              }
            }}
          >
            {configurations.map((item) => (
              <Option
                key={item.sidebar_genericsidebarid}
                value={item.sidebar_genericsidebarid}
              >
                {item.sidebar_title || "Untitled configuration"}
              </Option>
            ))}
          </Combobox>
          <Button
            appearance="secondary"
            onClick={() => {
              const selected = configurations.find(
                (item) =>
                  item.sidebar_genericsidebarid === selectedConfigurationId,
              );
              if (selected && (!isDirty || window.confirm("Discard unsaved changes?"))) {
                void loadConfiguration(selected);
              }
            }}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            appearance="primary"
            icon={<Save24Regular />}
            onClick={() => void save()}
            disabled={!isDirty || blocking || saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </header>

      <fieldset
        className={styles.body}
        disabled={saving}
        aria-busy={saving}
      >
        <nav className={styles.nav} aria-label="Designer sections">
          <TabList
            className={styles.navTabs}
            vertical
            selectedValue={activeSection}
            onTabSelect={(_, data) =>
              setActiveSection(data.value as DesignerSection)
            }
          >
            {(Object.keys(SECTION_LABELS) as DesignerSection[]).map(
              (section) => (
                <Tab key={section} value={section}>
                  {SECTION_LABELS[section]}
                </Tab>
              ),
            )}
          </TabList>
          <div className={styles.navFooter}>
            <Label>Configuration ID</Label>
            <Text size={200}>{configuration.sidebar_genericsidebarid}</Text>
            <Label>Content type</Label>
            <Text size={200}>
              {choiceLabel(FILE_TYPE_OPTIONS, configuration.sidebar_filetype)}
            </Text>
          </div>
        </nav>

        <main className={styles.main}>
          {error && (
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>Operation failed</MessageBarTitle>
                {error}
              </MessageBarBody>
            </MessageBar>
          )}
          {notice && (
            <MessageBar intent="success">
              <MessageBarBody>
                <MessageBarTitle>Saved</MessageBarTitle>
                {notice}
              </MessageBarBody>
            </MessageBar>
          )}
          {renderSection()}
        </main>

        <aside className={styles.preview} aria-label="Sidebar preview">
          <div className={styles.statusRow}>
            <Eye20Regular />
            <Title3>Preview</Title3>
          </div>
          <Text block>
            Runs configured markup in an isolated sandbox. Verify the packaged
            sidebar before production use.
          </Text>
          <TabList
            className={styles.previewTabs}
            selectedValue={String(previewTab)}
            onTabSelect={(_, data) => setPreviewTab(Number(data.value))}
          >
            {[1, 2, 3, 4].map((tab) => (
              <Tab key={tab} value={String(tab)}>
                {tab}
              </Tab>
            ))}
          </TabList>
          <iframe
            className={styles.previewFrame}
            title={`Tab ${previewTab} sidebar preview`}
            sandbox="allow-forms allow-popups allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={previewDocument(configuration, previewTab)}
          />
        </aside>
      </fieldset>

      <Dialog
        open={agentDraft !== null}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setAgentDraft(null);
            setEditingAgentIndex(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {editingAgentIndex === null ? "Add linked agent" : "Edit linked agent"}
            </DialogTitle>
            <DialogContent>
              {agentDraft && (
                <div className={styles.dialogGrid}>
                  <Field label="Agent name" required>
                    <Input
                      value={agentDraft.sidebar_name}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_name", data.value)
                      }
                    />
                  </Field>
                  <Field label="Display name" required>
                    <Input
                      value={agentDraft.sidebar_displayname}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_displayname", data.value)
                      }
                    />
                  </Field>
                  <Field label="Agent key" required>
                    <Input
                      value={agentDraft.sidebar_agentkey}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_agentkey", data.value)
                      }
                    />
                  </Field>
                  <Field label="Agent type">
                    <Select
                      value={String(agentDraft.sidebar_agenttype ?? "")}
                      onChange={(_, data) =>
                        updateAgentDraft(
                          "sidebar_agenttype",
                          numberOrNull(data.value),
                        )
                      }
                    >
                      <option value="">Not selected</option>
                      {AGENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Sort order">
                    <Input
                      type="number"
                      min={0}
                      value={String(agentDraft.sidebar_sortorder)}
                      onChange={(_, data) =>
                        updateAgentDraft(
                          "sidebar_sortorder",
                          numberOrNull(data.value) ?? 0,
                        )
                      }
                    />
                  </Field>
                  <div className={styles.statusRow}>
                    <Checkbox
                      label="Active"
                      checked={agentDraft.sidebar_isactive}
                      onChange={(_, data) =>
                        updateAgentDraft(
                          "sidebar_isactive",
                          data.checked === true,
                        )
                      }
                    />
                    <Checkbox
                      label="Default"
                      checked={agentDraft.sidebar_isdefaultagent}
                      onChange={(_, data) =>
                        updateAgentDraft(
                          "sidebar_isdefaultagent",
                          data.checked === true,
                        )
                      }
                    />
                  </div>
                  <Field className={styles.fieldSpan} label="Description">
                    <Textarea
                      rows={3}
                      resize="vertical"
                      value={agentDraft.sidebar_description}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_description", data.value)
                      }
                    />
                  </Field>
                  <Field className={styles.fieldSpan} label="Embed code">
                    <Textarea
                      className={styles.code}
                      rows={8}
                      resize="vertical"
                      value={agentDraft.sidebar_embedcode}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_embedcode", data.value)
                      }
                    />
                  </Field>
                  <Field label="Icon URL">
                    <Input
                      value={agentDraft.sidebar_iconurl}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_iconurl", data.value)
                      }
                    />
                  </Field>
                  <Field label="Token endpoint">
                    <Input
                      value={agentDraft.sidebar_tokenendpoint}
                      onChange={(_, data) =>
                        updateAgentDraft("sidebar_tokenendpoint", data.value)
                      }
                    />
                  </Field>
                  <Field
                    className={styles.fieldSpan}
                    label="Authentication scope override"
                  >
                    <Input
                      value={agentDraft.sidebar_authscopeoverride}
                      onChange={(_, data) =>
                        updateAgentDraft(
                          "sidebar_authscopeoverride",
                          data.value,
                        )
                      }
                    />
                  </Field>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => {
                  setAgentDraft(null);
                  setEditingAgentIndex(null);
                }}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={commitAgentDraft}
                disabled={
                  !agentDraft?.sidebar_name.trim() ||
                  !agentDraft.sidebar_displayname.trim() ||
                  !agentDraft.sidebar_agentkey.trim()
                }
              >
                Apply agent
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={deleteAgentIndex !== null}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setDeleteAgentIndex(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete linked agent?</DialogTitle>
            <DialogContent>
              This removes the relationship row from Dataverse when you save.
              The operation cannot be undone after saving.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteAgentIndex(null)}>Cancel</Button>
              <Button appearance="primary" onClick={confirmDeleteAgent}>
                Delete from draft
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
