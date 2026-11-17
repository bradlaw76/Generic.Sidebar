import { vi } from "vitest";
import { SYNTHETIC_CLIENT_URL, SYNTHETIC_CONFIG_ID } from "../fixtures/sidebar-configs.js";

export function createPaneMock() {
  return {
    navigate: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
    setVisible: vi.fn().mockResolvedValue(undefined),
    bringToFront: vi.fn().mockResolvedValue(undefined),
  };
}

export function createXrmMock(options = {}) {
  const pane = options.pane || createPaneMock();
  const existingPane = options.existingPane || null;
  const configRecord = options.configRecord || {
    sidebar_genericsidebarid: SYNTHETIC_CONFIG_ID,
    sidebar_title: "Synthetic Sidebar",
    sidebar_sso_enabled: false,
  };

  const retrieveMultipleRecords = vi.fn(async (entityName) => {
    if (options.retrieveMultipleRecords) {
      return options.retrieveMultipleRecords(entityName);
    }
    if (entityName === "environmentvariabledefinition") return { entities: [] };
    if (entityName === "sidebar_genericsidebar") return { entities: [configRecord] };
    if (entityName === "sidebar_genericsidebaragent") return { entities: [] };
    return { entities: [] };
  });

  const retrieveRecord = vi.fn(async (entityName, id, query) => {
    if (options.retrieveRecord) return options.retrieveRecord(entityName, id, query);
    return configRecord;
  });

  const xrm = {
    Utility: {
      getGlobalContext: vi.fn(() => ({ getClientUrl: () => SYNTHETIC_CLIENT_URL })),
    },
    WebApi: { retrieveRecord, retrieveMultipleRecords },
    App: {
      sidePanes: {
        getPane: vi.fn(() => existingPane),
        createPane: vi.fn().mockResolvedValue(pane),
      },
    },
    Navigation: {
      openAlertDialog: vi.fn().mockResolvedValue(undefined),
    },
  };

  return { xrm, pane, retrieveRecord, retrieveMultipleRecords };
}