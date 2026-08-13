import { afterEach, describe, expect, it } from "vitest";
import { SYNTHETIC_CONFIG_ID, createSidebarConfig } from "../fixtures/sidebar-configs.js";
import { loadSidebarHtml } from "../helpers/load-web-resource.js";
import { createPopupMock } from "../setup/browser-mocks.js";
import { createXrmMock } from "../setup/xrm-mock.js";

describe("sidebar rendering characterization", () => {
  let resource;

  afterEach(() => resource?.close());

  async function render(config, options = {}) {
    const { xrm, retrieveRecord } = createXrmMock({
      retrieveRecord: options.retrieveRecord || (async () => config),
      retrieveMultipleRecords: options.retrieveMultipleRecords,
    });
    resource = await loadSidebarHtml({
      xrm,
      popup: options.popup,
      query: options.query ?? `?data=configId%3D${SYNTHETIC_CONFIG_ID}`,
    });
    await resource.render();
    return { ...resource, retrieveRecord };
  }

  it("shows the current missing-config placeholder without retrieving a record", async () => {
    const result = await render(createSidebarConfig(), { query: "" });
    expect(result.document.querySelector("#host").textContent).toContain("No configuration selected.");
    expect(result.retrieveRecord).not.toHaveBeenCalled();
  });

  it("runs initialization through the production window load listener", async () => {
    const config = createSidebarConfig();
    const { xrm, retrieveRecord } = createXrmMock({ retrieveRecord: async () => config });
    resource = await loadSidebarHtml({ xrm, query: `?data=configId%3D${SYNTHETIC_CONFIG_ID}` });
    expect(resource.document.querySelectorAll("#panelContainer iframe")).toHaveLength(0);

    await resource.initializeFromLoad();

    expect(retrieveRecord).toHaveBeenCalledOnce();
    expect(resource.document.querySelectorAll("#panelContainer iframe")).toHaveLength(1);
    expect(resource.document.querySelector("#panelContainer iframe").src).toBe("https://example.test/app");
  });

  it("renders retrieval success and routes retrieval failures through current error HTML", async () => {
    let result = await render(createSidebarConfig());
    expect(result.document.querySelectorAll("#panelContainer iframe")).toHaveLength(1);
    resource.close();

    result = await render(createSidebarConfig(), {
      retrieveRecord: async () => { throw new Error("<strong>Synthetic failure</strong>"); },
    });
    expect(result.document.querySelector("#host .error strong")?.textContent).toBe("Synthetic failure");
  });

  it("shows no-panels state for an empty configuration", async () => {
    const result = await render(createSidebarConfig({ sidebar_embedcode: "" }));
    expect(result.document.querySelector("#host").textContent).toContain("No panels configured.");
  });

  it("renders one slot-1 panel without showing the tab row", async () => {
    const result = await render(createSidebarConfig());
    expect(result.document.querySelectorAll("#panelContainer iframe")).toHaveLength(1);
    expect(result.document.querySelector("#tabRow").style.display).toBe("none");
  });

  it.each([2, 3, 4])("renders a single configured panel in slot %s with the current visible tab row", async (slot) => {
    const config = createSidebarConfig({
      sidebar_embedcode: "",
      [`sidebar_title${slot}`]: `Slot ${slot}`,
      [`sidebar_embedcode${slot}`]: `https://slot-${slot}.example.test/app`,
    });
    const result = await render(config);
    expect(result.document.querySelectorAll("#panelContainer iframe")).toHaveLength(1);
    expect(result.document.querySelector("#tabRow").style.display).toBe("flex");
    expect(result.document.querySelector("#tabRow").textContent).toBe(`Slot ${slot}`);
  });

  it("creates titled tabs and all panel iframes up front", async () => {
    const result = await render(createSidebarConfig({
      sidebar_title2: "Secondary",
      sidebar_embedcode2: "https://secondary.example.test/app",
    }));
    const tabs = [...result.document.querySelectorAll(".tab")];
    const iframes = [...result.document.querySelectorAll("#panelContainer iframe")];
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Primary", "Secondary"]);
    expect(iframes).toHaveLength(2);
    expect(iframes.map((frame) => frame.style.display)).toEqual(["block", "none"]);
  });

  it("renders current rich instructions and preserves iframe identity during tab switching", async () => {
    const result = await render(createSidebarConfig({
      sidebar_instructions: "<strong>Current rich instructions</strong>",
      sidebar_title2: "Secondary",
      sidebar_embedcode2: "https://secondary.example.test/app",
    }));
    const originalFrames = [...result.document.querySelectorAll("#panelContainer iframe")];
    expect(result.document.querySelector("#instBody strong")?.textContent).toBe("Current rich instructions");

    result.document.querySelectorAll(".tab")[1].click();
    const switchedFrames = [...result.document.querySelectorAll("#panelContainer iframe")];
    expect(switchedFrames[0]).toBe(originalFrames[0]);
    expect(switchedFrames[1]).toBe(originalFrames[1]);
    expect(switchedFrames.map((frame) => frame.style.display)).toEqual(["none", "block"]);
    expect(result.window.sessionStorage.getItem(`sidebar_activePanel_${SYNTHETIC_CONFIG_ID}`)).toBe("1");
  });

  it("restores the saved active panel from sessionStorage", async () => {
    const config = createSidebarConfig({
      sidebar_title2: "Secondary",
      sidebar_embedcode2: "https://secondary.example.test/app",
    });
    const { xrm } = createXrmMock({ retrieveRecord: async () => config });
    resource = await loadSidebarHtml({ xrm, query: `?data=configId%3D${SYNTHETIC_CONFIG_ID}` });
    resource.window.sessionStorage.setItem(`sidebar_activePanel_${SYNTHETIC_CONFIG_ID}`, "1");
    await resource.render();
    expect([...resource.document.querySelectorAll("#panelContainer iframe")].map((frame) => frame.style.display))
      .toEqual(["none", "block"]);
  });

  it("characterizes direct URL, webresource, raw HTML, and iframe-snippet resolution", async () => {
    let result = await render(createSidebarConfig());
    expect(result.document.querySelector("iframe").src).toBe("https://example.test/app");
    resource.close();

    result = await render(createSidebarConfig({ sidebar_embedcode: "webresource:synthetic_resource.html" }));
    expect(result.document.querySelector("iframe").src).toBe("https://contoso.crm.dynamics.com/WebResources/synthetic_resource.html");
    resource.close();

    result = await render(createSidebarConfig({ sidebar_embedcode: "<main id='raw-marker'>Raw</main>" }));
    expect(result.document.querySelector("iframe").srcdoc).toContain("raw-marker");
    expect(result.document.querySelector("iframe").dataset.hasEmbeddedIframe).toBe("false");
    resource.close();

    result = await render(createSidebarConfig({
      sidebar_embedcode: "<iframe src='https://widget.example.test/embed'></iframe>",
    }));
    const snippetFrame = result.document.querySelector("iframe");
    expect(snippetFrame.srcdoc).toContain("widget.example.test/embed");
    expect(snippetFrame.dataset.hasEmbeddedIframe).toBe("true");
    expect(snippetFrame.dataset.popoutUrl).toBe("https://widget.example.test/embed");
  });

  it("records the current unconditional permission string and absent sandbox/title", async () => {
    const result = await render(createSidebarConfig());
    const iframe = result.document.querySelector("#panelContainer iframe");
    expect(iframe.getAttribute("allow")).toBe("clipboard-write; microphone; camera; autoplay; encrypted-media");
    expect(iframe.hasAttribute("sandbox")).toBe(false);
    expect(iframe.hasAttribute("title")).toBe(false);
  });

  it("accepts a synthetic HTTPS origin without a future environment-ceiling policy", async () => {
    const result = await render(createSidebarConfig({ sidebar_embedcode: "https://outside-ceiling.example.test/app" }));
    expect(result.document.querySelector("iframe").src).toBe("https://outside-ceiling.example.test/app");
  });

  it("applies and toggles current URL-only phone zoom behavior", async () => {
    const result = await render(createSidebarConfig({ sidebar_title1: "Synthetic Phone" }));
    const iframe = result.document.querySelector("iframe");
    expect(iframe.classList.contains("force-zoom")).toBe(true);
    result.window.toggleZoom();
    expect(iframe.classList.contains("force-zoom")).toBe(false);
  });

  it("keeps HTML embeds ineligible for zoom", async () => {
    const result = await render(createSidebarConfig({
      sidebar_title1: "Synthetic Phone",
      sidebar_embedcode: "<div>Phone HTML</div>",
    }));
    expect(result.document.querySelector("#zoomToggle").style.display).toBe("none");
  });

  it("characterizes pop-out eligibility, retained reference, and identity-preserving restore", async () => {
    const popup = createPopupMock();
    const result = await render(createSidebarConfig(), { popup });
    const iframe = result.document.querySelector("iframe");
    expect(result.document.querySelector("#popoutBtn").style.display).toBe("block");

    result.window.popOutPanel();
    expect(result.browser.open).toHaveBeenCalledWith(
      "https://example.test/app",
      "SidebarPopout",
      expect.stringContaining("width=450"),
    );
    result.window.focusPopoutWindow();
    expect(popup.focus).toHaveBeenCalled();
    expect(result.document.querySelector("#popoutPlaceholder").classList.contains("active")).toBe(true);
    result.window.restoreEmbeddedContent();
    expect(result.document.querySelector("iframe")).toBe(iframe);
    expect(popup.close).toHaveBeenCalled();
  });

  it("leaves embedded content visible when the popup is blocked", async () => {
    const result = await render(createSidebarConfig(), { popup: null });
    const iframe = result.document.querySelector("iframe");
    result.window.popOutPanel();
    expect(result.browser.open).toHaveBeenCalled();
    expect(result.document.querySelector("#popoutPlaceholder").classList.contains("active")).toBe(false);
    expect(iframe.style.display).toBe("block");
  });

  it("uses only Alt+number for current keyboard tab activation", async () => {
    const result = await render(createSidebarConfig({
      sidebar_title2: "Secondary",
      sidebar_embedcode2: "https://secondary.example.test/app",
    }));
    const tabs = result.document.querySelectorAll(".tab");
    tabs[0].focus();
    result.document.dispatchEvent(new result.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(tabs[0].classList.contains("active")).toBe(true);
    result.document.dispatchEvent(new result.window.KeyboardEvent("keydown", { key: "2", altKey: true, bubbles: true }));
    expect(tabs[1].classList.contains("active")).toBe(true);
  });
});