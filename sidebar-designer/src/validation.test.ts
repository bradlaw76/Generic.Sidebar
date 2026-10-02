/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Validation Tests
 * FILE:         sidebar-designer/src/validation.test.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  Vitest
 *
 * OVERVIEW
 * Verifies blocking and behavioral validation for configuration saves.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial validation tests
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_CONFIGURATION,
  createEmptyAgent,
  type DesignerSnapshot,
} from "./model";
import { hasBlockingFindings, validateSnapshot } from "./validation";

const validSnapshot = (): DesignerSnapshot => ({
  configuration: {
    ...structuredClone(EMPTY_CONFIGURATION),
    sidebar_genericsidebarid: "00000000-0000-0000-0000-000000000001",
    sidebar_title: "SSA Agent Support",
  },
  agents: [],
});

describe("validateSnapshot", () => {
  it("accepts a minimal valid configuration", () => {
    const findings = validateSnapshot(validSnapshot());
    expect(hasBlockingFindings(findings)).toBe(false);
    expect(findings).toContainEqual(
      expect.objectContaining({ id: "validation-clean" }),
    );
  });

  it("blocks an empty header title", () => {
    const snapshot = validSnapshot();
    snapshot.configuration.sidebar_title = " ";
    const findings = validateSnapshot(snapshot);
    expect(hasBlockingFindings(findings)).toBe(true);
    expect(findings).toContainEqual(
      expect.objectContaining({ id: "configuration-title", severity: "error" }),
    );
  });

  it("blocks duplicate linked-agent keys", () => {
    const snapshot = validSnapshot();
    const first = {
      ...createEmptyAgent(10),
      sidebar_name: "Agent One",
      sidebar_displayname: "Agent One",
      sidebar_agentkey: "shared-key",
    };
    snapshot.agents = [
      first,
      {
        ...first,
        sidebar_name: "Agent Two",
        sidebar_displayname: "Agent Two",
        sidebar_agentkey: "SHARED-KEY",
      },
    ];
    const findings = validateSnapshot(snapshot);
    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "duplicate-agent-shared-key",
        severity: "error",
      }),
    );
  });

  it("warns when linked agents conflict with configured tab content", () => {
    const snapshot = validSnapshot();
    snapshot.configuration.sidebar_agentmenutab = 100000001;
    snapshot.configuration.sidebar_embedcode = "<p>Existing content</p>";
    snapshot.agents = [
      {
        ...createEmptyAgent(10),
        sidebar_name: "Agent One",
        sidebar_displayname: "Agent One",
        sidebar_agentkey: "agent-one",
      },
    ];
    const findings = validateSnapshot(snapshot);
    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "agent-menu-content-conflict",
        severity: "warning",
        section: "tab-1",
      }),
    );
  });

  it("blocks non-HTTPS agent endpoints", () => {
    const snapshot = validSnapshot();
    snapshot.agents = [
      {
        ...createEmptyAgent(10),
        sidebar_name: "Agent One",
        sidebar_displayname: "Agent One",
        sidebar_agentkey: "agent-one",
        sidebar_tokenendpoint: "http://example.test/token",
      },
    ];
    const findings = validateSnapshot(snapshot);
    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "agent-0-token",
        severity: "error",
      }),
    );
  });
});
