/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Dataverse Repository
 * FILE:         sidebar-designer/src/dataverse.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  Model-driven app / Dataverse Web API
 *
 * OVERVIEW
 * Loads and saves Generic Sidebar configurations and linked agents by using
 * the signed-in model-driven app user's supported Xrm.WebApi client.
 *
 * ARCHITECTURE
 * - Parent: sidebar_genericsidebar
 * - Child: sidebar_genericsidebaragent
 * - Lookup navigation: sidebar_genericsidebarid_sidebar_genericsidebar
 * - Persistence: One atomic OData batch changeset with ETag preconditions
 *
 * SECURITY MODEL
 * - Dataverse enforces the current user's table and row privileges.
 * - No service principal, secret, token, or local storage is used.
 * - Atomic changesets prevent partial saves.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial repository implementation
 * ============================================================================
 */

import {
  AGENT_ENTITY,
  AGENT_ID,
  CONFIG_ENTITY,
  CONFIG_ID,
  normalizeGuid,
  type DesignerSnapshot,
  type SidebarAgent,
  type SidebarConfiguration,
  type SidebarRepository,
} from "./model";

interface RetrieveMultipleResult<T> {
  entities: T[];
}

export interface XrmWebApi {
  retrieveMultipleRecords<T>(
    entityLogicalName: string,
    options?: string,
    maxPageSize?: number,
  ): Promise<RetrieveMultipleResult<T>>;
}

export interface XrmLike {
  WebApi: XrmWebApi;
  Utility: {
    getGlobalContext(): {
      getClientUrl(): string;
    };
  };
}

declare global {
  interface Window {
    Xrm?: XrmLike;
  }
}

const CONFIG_FIELDS = [
  CONFIG_ID,
  "sidebar_title",
  "sidebar_filetype",
  "sidebar_quicktitle",
  "sidebar_default",
  "sidebar_quicknotes",
  "sidebar_agentmenutab",
  "sidebar_title1",
  "sidebar_instructions",
  "sidebar_embedcode",
  "sidebar_title2",
  "sidebar_instructions2",
  "sidebar_embedcode2",
  "sidebar_title3",
  "sidebar_instructions3",
  "sidebar_embedcode3",
  "sidebar_title4",
  "sidebar_instructions4",
  "sidebar_embedcode4",
  "sidebar_primarycolor",
  "sidebar_textcolor",
  "sidebar_linkcolor",
  "sidebar_iframeallow",
  "sidebar_iframeheight",
  "sidebar_iframestyle",
  "sidebar_iframetheme",
  "sidebar_iframewidth",
  "sidebar_sidebaricon",
] as const;

const AGENT_FIELDS = [
  AGENT_ID,
  "sidebar_name",
  "sidebar_displayname",
  "sidebar_agentkey",
  "sidebar_agenttype",
  "sidebar_description",
  "sidebar_embedcode",
  "sidebar_iconurl",
  "sidebar_isactive",
  "sidebar_isdefaultagent",
  "sidebar_sortorder",
  "sidebar_authscopeoverride",
  "sidebar_tokenendpoint",
] as const;

const CONFIG_UPDATE_FIELDS: readonly (keyof SidebarConfiguration)[] = [
  "sidebar_title",
  "sidebar_filetype",
  "sidebar_quicktitle",
  "sidebar_default",
  "sidebar_quicknotes",
  "sidebar_agentmenutab",
  "sidebar_title1",
  "sidebar_instructions",
  "sidebar_embedcode",
  "sidebar_title2",
  "sidebar_instructions2",
  "sidebar_embedcode2",
  "sidebar_title3",
  "sidebar_instructions3",
  "sidebar_embedcode3",
  "sidebar_title4",
  "sidebar_instructions4",
  "sidebar_embedcode4",
  "sidebar_primarycolor",
  "sidebar_textcolor",
  "sidebar_linkcolor",
  "sidebar_iframeallow",
  "sidebar_iframeheight",
  "sidebar_iframestyle",
  "sidebar_iframetheme",
  "sidebar_iframewidth",
  "sidebar_sidebaricon",
];

const AGENT_UPDATE_FIELDS: readonly (keyof SidebarAgent)[] = [
  "sidebar_name",
  "sidebar_displayname",
  "sidebar_agentkey",
  "sidebar_agenttype",
  "sidebar_description",
  "sidebar_embedcode",
  "sidebar_iconurl",
  "sidebar_isactive",
  "sidebar_isdefaultagent",
  "sidebar_sortorder",
  "sidebar_authscopeoverride",
  "sidebar_tokenendpoint",
];

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value : "";

const normalizeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeBoolean = (value: unknown): boolean => value === true;

const normalizeConfiguration = (
  record: Record<string, unknown>,
): SidebarConfiguration => ({
  _etag: normalizeText(record["@odata.etag"]),
  sidebar_genericsidebarid: normalizeGuid(String(record[CONFIG_ID] ?? "")),
  sidebar_title: normalizeText(record.sidebar_title),
  sidebar_filetype: normalizeNumber(record.sidebar_filetype),
  sidebar_quicktitle: normalizeText(record.sidebar_quicktitle),
  sidebar_default: normalizeBoolean(record.sidebar_default),
  sidebar_quicknotes: normalizeText(record.sidebar_quicknotes),
  sidebar_agentmenutab: normalizeNumber(record.sidebar_agentmenutab),
  sidebar_title1: normalizeText(record.sidebar_title1),
  sidebar_instructions: normalizeText(record.sidebar_instructions),
  sidebar_embedcode: normalizeText(record.sidebar_embedcode),
  sidebar_title2: normalizeText(record.sidebar_title2),
  sidebar_instructions2: normalizeText(record.sidebar_instructions2),
  sidebar_embedcode2: normalizeText(record.sidebar_embedcode2),
  sidebar_title3: normalizeText(record.sidebar_title3),
  sidebar_instructions3: normalizeText(record.sidebar_instructions3),
  sidebar_embedcode3: normalizeText(record.sidebar_embedcode3),
  sidebar_title4: normalizeText(record.sidebar_title4),
  sidebar_instructions4: normalizeText(record.sidebar_instructions4),
  sidebar_embedcode4: normalizeText(record.sidebar_embedcode4),
  sidebar_primarycolor: normalizeText(record.sidebar_primarycolor),
  sidebar_textcolor: normalizeText(record.sidebar_textcolor),
  sidebar_linkcolor: normalizeText(record.sidebar_linkcolor),
  sidebar_iframeallow: normalizeText(record.sidebar_iframeallow),
  sidebar_iframeheight: normalizeNumber(record.sidebar_iframeheight),
  sidebar_iframestyle: normalizeText(record.sidebar_iframestyle),
  sidebar_iframetheme: normalizeNumber(record.sidebar_iframetheme),
  sidebar_iframewidth: normalizeNumber(record.sidebar_iframewidth),
  sidebar_sidebaricon: normalizeText(record.sidebar_sidebaricon),
});

const normalizeAgent = (record: Record<string, unknown>): SidebarAgent => ({
  _etag: normalizeText(record["@odata.etag"]),
  sidebar_genericsidebaragentid: normalizeGuid(String(record[AGENT_ID] ?? "")),
  sidebar_name: normalizeText(record.sidebar_name),
  sidebar_displayname: normalizeText(record.sidebar_displayname),
  sidebar_agentkey: normalizeText(record.sidebar_agentkey),
  sidebar_agenttype: normalizeNumber(record.sidebar_agenttype),
  sidebar_description: normalizeText(record.sidebar_description),
  sidebar_embedcode: normalizeText(record.sidebar_embedcode),
  sidebar_iconurl: normalizeText(record.sidebar_iconurl),
  sidebar_isactive: normalizeBoolean(record.sidebar_isactive),
  sidebar_isdefaultagent: normalizeBoolean(record.sidebar_isdefaultagent),
  sidebar_sortorder: normalizeNumber(record.sidebar_sortorder) ?? 0,
  sidebar_authscopeoverride: normalizeText(record.sidebar_authscopeoverride),
  sidebar_tokenendpoint: normalizeText(record.sidebar_tokenendpoint),
});

const pickFields = <T extends object>(
  value: T,
  fields: readonly (keyof T)[],
): Record<string, unknown> =>
  Object.fromEntries(fields.map((field) => [String(field), value[field]]));

const resolveXrm = (): XrmLike => {
  const local = window.Xrm;
  if (local?.WebApi) {
    return local;
  }

  try {
    const parentXrm = window.parent !== window ? window.parent.Xrm : undefined;
    if (parentXrm?.WebApi) {
      return parentXrm;
    }
  } catch (error) {
    throw new Error(
      `The model-driven app host could not be accessed: ${String(error)}`,
    );
  }

  throw new Error(
    "Generic Sidebar Designer must be launched from the Generic.Sidebar model-driven app.",
  );
};

export class DataverseSidebarRepository implements SidebarRepository {
  private readonly api: XrmWebApi;
  private readonly clientUrl: string;

  constructor(xrm: XrmLike = resolveXrm()) {
    this.api = xrm.WebApi;
    this.clientUrl = xrm.Utility.getGlobalContext().getClientUrl().replace(/\/$/, "");
  }

  async listConfigurations(): Promise<SidebarConfiguration[]> {
    const query = `?$select=${CONFIG_FIELDS.join(",")}&$orderby=sidebar_default desc,sidebar_title asc`;
    const response = await this.api.retrieveMultipleRecords<
      Record<string, unknown>
    >(CONFIG_ENTITY, query, 250);
    return response.entities.map(normalizeConfiguration);
  }

  async listAgents(configurationId: string): Promise<SidebarAgent[]> {
    const id = normalizeGuid(configurationId);
    if (!id) {
      throw new Error("A configuration ID is required to load linked agents.");
    }

    const query = `?$select=${AGENT_FIELDS.join(",")}&$filter=_sidebar_genericsidebarid_value eq ${id}&$orderby=sidebar_sortorder asc,sidebar_name asc`;
    const response = await this.api.retrieveMultipleRecords<
      Record<string, unknown>
    >(AGENT_ENTITY, query, 250);
    return response.entities.map(normalizeAgent);
  }

  async save(
    snapshot: DesignerSnapshot,
    deletedAgents: SidebarAgent[],
    defaultConfigurationsToClear: SidebarConfiguration[],
  ): Promise<void> {
    const configurationId = normalizeGuid(
      snapshot.configuration.sidebar_genericsidebarid,
    );
    if (!configurationId) {
      throw new Error("The selected configuration has no Dataverse ID.");
    }

    if (!snapshot.configuration._etag) {
      throw new Error(
        "The configuration concurrency token is missing. Reload before saving.",
      );
    }

    const operations: BatchOperation[] = [
      {
        method: "PATCH",
        entitySet: "sidebar_genericsidebars",
        id: configurationId,
        etag: snapshot.configuration._etag,
        body: pickFields(snapshot.configuration, CONFIG_UPDATE_FIELDS),
      },
    ];

    for (const previousDefault of defaultConfigurationsToClear) {
      if (!previousDefault._etag) {
        throw new Error(
          `The concurrency token for default configuration "${previousDefault.sidebar_title}" is missing. Reload before saving.`,
        );
      }
      operations.push({
        method: "PATCH",
        entitySet: "sidebar_genericsidebars",
        id: normalizeGuid(previousDefault.sidebar_genericsidebarid),
        etag: previousDefault._etag,
        body: { sidebar_default: false },
      });
    }

    for (const deletedAgent of deletedAgents) {
      if (
        !deletedAgent.sidebar_genericsidebaragentid ||
        !deletedAgent._etag
      ) {
        throw new Error(
          `The concurrency token for deleted agent "${deletedAgent.sidebar_displayname || deletedAgent.sidebar_name}" is missing. Reload before saving.`,
        );
      }
      operations.push({
        method: "DELETE",
        entitySet: "sidebar_genericsidebaragents",
        id: normalizeGuid(deletedAgent.sidebar_genericsidebaragentid),
        etag: deletedAgent._etag,
      });
    }

    for (const agent of snapshot.agents) {
      const payload = pickFields(agent, AGENT_UPDATE_FIELDS);
      if (agent.sidebar_genericsidebaragentid) {
        if (!agent._etag) {
          throw new Error(
            `The concurrency token for agent "${agent.sidebar_displayname || agent.sidebar_name}" is missing. Reload before saving.`,
          );
        }
        operations.push({
          method: "PATCH",
          entitySet: "sidebar_genericsidebaragents",
          id: normalizeGuid(agent.sidebar_genericsidebaragentid),
          etag: agent._etag,
          body: payload,
        });
      } else {
        payload[
          "sidebar_genericsidebarid_sidebar_genericsidebar@odata.bind"
        ] = `/sidebar_genericsidebars(${configurationId})`;
        operations.push({
          method: "POST",
          entitySet: "sidebar_genericsidebaragents",
          body: payload,
        });
      }
    }

    await this.executeAtomicBatch(operations);
  }

  private async executeAtomicBatch(
    operations: BatchOperation[],
  ): Promise<void> {
    const batchBoundary = `batch_${crypto.randomUUID()}`;
    const changeBoundary = `changeset_${crypto.randomUUID()}`;
    const lines: string[] = [
      `--${batchBoundary}`,
      `Content-Type: multipart/mixed; boundary=${changeBoundary}`,
      "",
    ];

    operations.forEach((operation, index) => {
      const resource = operation.id
        ? `${operation.entitySet}(${operation.id})`
        : operation.entitySet;
      lines.push(
        `--${changeBoundary}`,
        "Content-Type: application/http",
        "Content-Transfer-Encoding: binary",
        `Content-ID: ${index + 1}`,
        "",
        `${operation.method} ${this.clientUrl}/api/data/v9.2/${resource} HTTP/1.1`,
        "Accept: application/json",
      );
      if (operation.body) {
        lines.push("Content-Type: application/json; type=entry");
      }
      if (operation.etag) {
        lines.push(`If-Match: ${operation.etag}`);
      }
      lines.push("");
      if (operation.body) {
        lines.push(JSON.stringify(operation.body));
      }
    });

    lines.push(`--${changeBoundary}--`, `--${batchBoundary}--`, "");

    const response = await fetch(`${this.clientUrl}/api/data/v9.2/$batch`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": `multipart/mixed; boundary=${batchBoundary}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: lines.join("\r\n"),
    });
    const responseBody = await response.text();
    const operationFailure = responseBody.match(/HTTP\/1\.1\s+([45]\d{2})/);
    if (!response.ok || operationFailure) {
      const status = operationFailure?.[1] ?? String(response.status);
      const detail = responseBody.slice(0, 1200);
      if (status === "412") {
        throw new Error(
          "A configuration or linked agent changed in Dataverse after it was loaded. Reload the designer and reapply your changes.",
        );
      }
      throw new Error(
        `Dataverse rejected the atomic save with HTTP ${status}: ${detail}`,
      );
    }
  }
}

interface BatchOperation {
  method: "PATCH" | "POST" | "DELETE";
  entitySet: "sidebar_genericsidebars" | "sidebar_genericsidebaragents";
  id?: string;
  etag?: string;
  body?: Record<string, unknown>;
}
