/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Dataverse Repository Tests
 * FILE:         sidebar-designer/src/dataverse.test.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  Vitest / Dataverse batch simulation
 *
 * OVERVIEW
 * Verifies atomic changeset construction, ETag concurrency, default handoff,
 * and explicit conflict reporting without contacting Dataverse.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial repository tests
 * ============================================================================
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DataverseSidebarRepository,
  type XrmLike,
  type XrmWebApi,
} from "./dataverse";
import {
  EMPTY_CONFIGURATION,
  createEmptyAgent,
  type DesignerSnapshot,
  type SidebarConfiguration,
} from "./model";

const createXrm = (): XrmLike => ({
  WebApi: {
    retrieveMultipleRecords: vi.fn(),
  } as XrmWebApi,
  Utility: {
    getGlobalContext: () => ({
      getClientUrl: () => "https://example.crm.dynamics.com",
    }),
  },
});

const createSnapshot = (): DesignerSnapshot => ({
  configuration: {
    ...structuredClone(EMPTY_CONFIGURATION),
    _etag: 'W/"100"',
    sidebar_genericsidebarid: "00000000-0000-0000-0000-000000000001",
    sidebar_title: "Sidebar",
    sidebar_default: true,
  },
  agents: [
    {
      ...createEmptyAgent(10),
      _etag: 'W/"200"',
      sidebar_genericsidebaragentid:
        "00000000-0000-0000-0000-000000000002",
      sidebar_name: "Agent",
      sidebar_displayname: "Agent",
      sidebar_agentkey: "agent",
    },
  ],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DataverseSidebarRepository.save", () => {
  it("submits parent and agent changes in one ETag-protected changeset", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("HTTP/1.1 204 No Content\r\n", { status: 200 }),
      );
    const repository = new DataverseSidebarRepository(createXrm());

    await repository.save(createSnapshot(), [], []);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    const body = String(request?.body);
    expect(body).toContain(
      "PATCH https://example.crm.dynamics.com/api/data/v9.2/sidebar_genericsidebars(00000000-0000-0000-0000-000000000001)",
    );
    expect(body).toContain(
      "PATCH https://example.crm.dynamics.com/api/data/v9.2/sidebar_genericsidebaragents(00000000-0000-0000-0000-000000000002)",
    );
    expect(body).toContain('If-Match: W/"100"');
    expect(body).toContain('If-Match: W/"200"');
    expect(body).toMatch(/Content-Type: multipart\/mixed; boundary=changeset_/);
  });

  it("includes default handoff in the same atomic changeset", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("HTTP/1.1 204 No Content\r\n", { status: 200 }),
      );
    const repository = new DataverseSidebarRepository(createXrm());
    const previousDefault: SidebarConfiguration = {
      ...structuredClone(EMPTY_CONFIGURATION),
      _etag: 'W/"300"',
      sidebar_genericsidebarid:
        "00000000-0000-0000-0000-000000000003",
      sidebar_title: "Previous default",
      sidebar_default: true,
    };

    await repository.save(createSnapshot(), [], [previousDefault]);

    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body).toContain(
      "sidebar_genericsidebars(00000000-0000-0000-0000-000000000003)",
    );
    expect(body).toContain('If-Match: W/"300"');
    expect(body).toContain('"sidebar_default":false');
  });

  it("reports a reload-required conflict on HTTP 412", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("HTTP/1.1 412 Precondition Failed\r\n", { status: 200 }),
    );
    const repository = new DataverseSidebarRepository(createXrm());

    await expect(repository.save(createSnapshot(), [], [])).rejects.toThrow(
      "changed in Dataverse after it was loaded",
    );
  });
});
