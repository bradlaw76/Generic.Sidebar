import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { SYNTHETIC_CONFIG_ID, createSidebarConfig } from "../fixtures/sidebar-configs.js";
import { loadSidebarHtml } from "../helpers/load-web-resource.js";
import { createXrmMock } from "../setup/xrm-mock.js";

describe("sidebar accessibility baseline characterization", () => {
  let resource;

  afterEach(() => resource?.close());

  async function renderMultiplePanels() {
    const config = createSidebarConfig({
      sidebar_title2: "Secondary",
      sidebar_embedcode2: "https://secondary.example.test/app",
    });
    const { xrm } = createXrmMock({ retrieveRecord: async () => config });
    resource = await loadSidebarHtml({ xrm, query: `?data=configId%3D${SYNTHETIC_CONFIG_ID}` });
    await resource.render();
    return resource;
  }

  it("records current tabs as plain buttons without ARIA tab state", async () => {
    const result = await renderMultiplePanels();
    const tabRow = result.document.querySelector("#tabRow");
    const tabs = [...result.document.querySelectorAll(".tab")];
    expect(tabs).toHaveLength(2);
    expect(tabRow.getAttribute("role")).toBeNull();
    expect(tabs.every((tab) => tab.getAttribute("role") === null)).toBe(true);
    expect(tabs.every((tab) => tab.getAttribute("aria-selected") === null)).toBe(true);
    expect(tabs[0].classList.contains("active")).toBe(true);
  });

  it("records current iframe and icon-button accessible-name attributes", async () => {
    const result = await renderMultiplePanels();
    const frames = [...result.document.querySelectorAll("#panelContainer iframe")];
    expect(frames).toHaveLength(2);
    expect(frames.every((frame) => !frame.hasAttribute("title"))).toBe(true);
    expect(result.document.querySelector("#popoutBtn").getAttribute("aria-label")).toBeNull();
    expect(result.document.querySelector("#zoomToggle").getAttribute("aria-label")).toBeNull();
    expect(result.document.querySelector("#popoutBtn").getAttribute("title")).toBe("Open in new window");
    expect(result.document.querySelector("#zoomToggle").textContent).toContain("Fit");
  });

  it("runs axe-core reliably against the jsdom surface and records current violations", async () => {
    const result = await renderMultiplePanels();
    result.window.eval(axe.source);
    const report = await result.window.axe.run(result.document, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(report.violations.map((violation) => violation.id).sort()).toEqual(["frame-title"]);
  });
});