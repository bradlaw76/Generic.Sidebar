/*
=============================================================================
COMPONENT:    Core Runtime Acceptance Tests
FILE:         tests/core/runtime.test.js
VERSION:      1.5.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-04
ENVIRONMENT:  Node.js | Vitest | jsdom

OVERVIEW
-----------------------------------------------------------------------------
Executes the canonical HTML and pane-controller production scripts against the
capabilities defined in docs/CORE_RUNTIME_RECONCILIATION.md.

CHANGELOG
-----------------------------------------------------------------------------
v1.5.0  2026-09-05  Verify fallback and configured automatic zoom widths
v1.4.0  2026-09-04  Verify committed package contains every runtime query field
v1.3.0  2026-08-30  Verify four-panel capacity and portable module paths
v1.2.0  2026-08-30  Verify configured height disables iframe flex growth
v1.1.0  2026-08-30  Added legacy title and packaged schema regression coverage
v1.0.0  2026-08-28  Added CORE-001 through CORE-014 acceptance coverage
=============================================================================
*/
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const htmlSource = readFileSync(resolve(root, "web resources/sidebar_sidebar.html"), "utf8");
const paneSource = readFileSync(resolve(root, "web resources/sidebar_sidebar.js"), "utf8");

function getRuntimeQueryFields(...sources) {
  const fields = new Set();
  for (const source of sources) {
    const clauses = [
      ...Array.from(source.matchAll(/const select\s*=\s*([\s\S]*?);/g), (match) => match[1]),
      ...Array.from(source.matchAll(/\$filter=([^&`"']+)/g), (match) => match[1])
    ];
    for (const clause of clauses) {
      for (const match of clause.matchAll(/\bsidebar_[a-z0-9_]+\b/gi)) {
        fields.add(match[0].toLowerCase());
      }
    }
  }
  return fields;
}

function createHtmlRuntime() {
  const dom = new JSDOM(htmlSource, {
    runScripts: "dangerously",
    url: "https://contoso.example/WebResources/sidebar_sidebar.html",
    beforeParse(window) {
      Object.defineProperty(window, "parent", {
        value: {
          Xrm: {
            Utility: { getGlobalContext: () => ({ getClientUrl: () => "https://contoso.crm.dynamics.com" }) },
            WebApi: { retrieveRecord: vi.fn() }
          }
        }
      });
    }
  });
  return { dom, window: dom.window, runtime: dom.window.__GenericSidebarHtmlRuntime };
}

function createPaneRuntime() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "dangerously",
    url: "https://contoso.example/form"
  });
  dom.window.Xrm = { WebApi: {} };
  dom.window.eval(paneSource);
  return { dom, runtime: dom.window.__GenericSidebarPaneRuntime };
}

function panelRecord(count = 1, overrides = {}) {
  const record = {
    sidebar_title1: "Primary",
    sidebar_instructions: "<p>Primary instructions</p>",
    sidebar_embedcode: "https://example.com/one",
    sidebar_filetype: 0
  };
  for (let index = 2; index <= count; index += 1) {
    record[`sidebar_title${index}`] = `Panel ${index}`;
    record[`sidebar_instructions${index}`] = `<p>Instructions ${index}</p>`;
    record[`sidebar_embedcode${index}`] = `https://example.com/${index}`;
  }
  return { ...record, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Generic Sidebar Core runtime reconciliation", () => {
  it("CORE-015 committed package contains every runtime-selected or filtered field", () => {
    const archive = new AdmZip(resolve(root, "GenericSidebar_1_0_0_7.zip"));
    const customizations = archive.readAsText("customizations.xml");
    const packagedFields = new Set(
      Array.from(customizations.matchAll(/<attribute\s+PhysicalName="([^"]+)"/g), (match) => match[1].toLowerCase())
    );
    const runtimeFields = getRuntimeQueryFields(htmlSource, paneSource);
    const missingFields = [...runtimeFields].filter((field) => !packagedFields.has(field)).sort();

    expect(runtimeFields.size).toBe(23);
    expect(packagedFields.size).toBe(47);
    expect(missingFields).toEqual([]);
  });

  it("CORE-001 single panel renders without tabs", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    runtime.renderRuntime(panelRecord(1), "config-one");
    expect(window.document.querySelectorAll(".panel-frame")).toHaveLength(1);
    expect(window.document.getElementById("tabRow").style.display).toBe("none");
    dom.window.close();
  });

  it("CORE-001 preserves the legacy primary title", () => {
    const { dom, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(1, {
      sidebar_title: "Legacy title",
      sidebar_title1: null
    }), "config-legacy-title");
    expect(result.panels[0].title).toBe("Legacy title");
    dom.window.close();
  });

  it("CORE-002 four configured panels render in order", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(4), "config-four");
    expect(result.panels.map((panel) => panel.title)).toEqual(["Primary", "Panel 2", "Panel 3", "Panel 4"]);
    expect(window.document.querySelectorAll(".tab")).toHaveLength(4);
    expect(window.document.querySelectorAll(".panel-frame")).toHaveLength(4);
    dom.window.close();
  });

  it("CORE-003 tab switching changes visible panel", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(3), "config-tabs");
    result.setActivePanel(2);
    expect(result.iframes.map((frame) => frame.style.display)).toEqual(["none", "none", "block"]);
    expect(window.document.querySelectorAll(".tab")[2].classList.contains("active")).toBe(true);
    expect(window.document.getElementById("instBody").textContent).toContain("Instructions 3");
    dom.window.close();
  });

  it("CORE-004 tab switching retains iframe instances", () => {
    const { dom, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(3), "config-retain");
    const originalFrames = [...result.iframes];
    result.setActivePanel(1);
    result.setActivePanel(0);
    expect(result.iframes.every((frame, index) => frame === originalFrames[index])).toBe(true);
    dom.window.close();
  });

  it("CORE-005 active panel persists per configuration", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    window.sessionStorage.setItem("sidebar_activePanel_config-saved", "2");
    const result = runtime.renderRuntime(panelRecord(3), "config-saved");
    expect(result.iframes[2].style.display).toBe("block");
    expect(runtime.getInitialPanel("config-saved", 2)).toBe(0);
    dom.window.close();
  });

  it("CORE-006 zoom toggles URL panels only", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(2, {
      sidebar_embedcode2: "<p>Inline content</p>"
    }), "config-zoom");
    runtime.toggleZoom();
    expect(result.iframes[0].classList.contains("force-zoom")).toBe(true);
    result.setActivePanel(1);
    expect(window.document.getElementById("zoomToggle").style.display).toBe("none");
    dom.window.close();
  });

  it("CORE-007 eligible panels pop out without affecting siblings", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(2), "config-popout");
    const popup = { closed: false, close: vi.fn(), focus: vi.fn() };
    window.open = vi.fn(() => popup);
    runtime.popOutPanel();
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("example.com/one"), "SidebarPopout", expect.any(String));
    expect(result.iframes[0].style.display).toBe("none");
    expect(result.iframes[1].isConnected).toBe(true);
    dom.window.close();
  });

  it("CORE-008 focus and restore preserve the embedded frame", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(1), "config-restore");
    const frame = result.iframes[0];
    const popup = { closed: false, close: vi.fn(), focus: vi.fn() };
    window.open = vi.fn(() => popup);
    runtime.popOutPanel();
    runtime.focusPopoutWindow();
    expect(popup.focus).toHaveBeenCalledOnce();
    runtime.restoreEmbeddedContent();
    expect(result.iframes[0]).toBe(frame);
    expect(frame.style.display).toBe("block");
    expect(popup.close).toHaveBeenCalledOnce();
    dom.window.close();
  });

  it("CORE-009 repeated open suppresses same-config navigation", () => {
    const { dom, runtime } = createPaneRuntime();
    expect(runtime.shouldNavigate({ __isNewPane: false }, "same", "same")).toBe(false);
    expect(runtime.shouldNavigate({ __isNewPane: false }, "new", "old")).toBe(true);
    expect(runtime.shouldNavigate({ __isNewPane: true }, "same", "same")).toBe(true);
    dom.window.close();
  });

  it("CORE-010 uses the documented 320px zoom fallback", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const frame = window.document.createElement("iframe");
    runtime.applyIframeOptions({}, frame);
    expect(frame.style.width).toBe("100%");
    expect(frame.style.getPropertyValue("--sidebar-zoom-width")).toBe("320px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-scale")).toBe("1.5625");
    dom.window.close();
  });

  it("CORE-010 configured iframe width controls zoom sizing", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const frame = window.document.createElement("iframe");
    runtime.applyIframeOptions({ sidebar_iframewidth: 400, sidebar_iframeheight: 720 }, frame);
    expect(frame.style.width).toBe("400px");
    expect(frame.style.height).toBe("720px");
    expect(frame.style.flexGrow).toBe("0");
    expect(frame.style.flexBasis).toBe("720px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-width")).toBe("400px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-scale")).toBe("1.25");
    dom.window.close();
  });

  it("CORE-010 configured width remains authoritative during automatic zoom", () => {
    const { dom, runtime } = createHtmlRuntime();
    const result = runtime.renderRuntime(panelRecord(1, {
      sidebar_title1: "Phone",
      sidebar_iframewidth: 400
    }), "config-auto-zoom-width");
    const frame = result.iframes[0];
    expect(frame.classList.contains("force-zoom")).toBe(true);
    expect(frame.style.width).toBe("400px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-width")).toBe("400px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-scale")).toBe("1.25");
    expect(htmlSource).toContain("width: var(--sidebar-zoom-width, 320px) !important");
    expect(htmlSource).toContain("min-width: var(--sidebar-zoom-width, 320px) !important");
    expect(htmlSource).toContain("max-width: var(--sidebar-zoom-width, 320px) !important");
    dom.window.close();
  });

  it("CORE-010 invalid iframe width falls back safely", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const frame = window.document.createElement("iframe");
    runtime.applyIframeOptions({ sidebar_iframewidth: -1 }, frame);
    expect(frame.style.width).toBe("100%");
    expect(frame.style.getPropertyValue("--sidebar-zoom-width")).toBe("320px");
    expect(frame.style.getPropertyValue("--sidebar-zoom-scale")).toBe("1.5625");
    dom.window.close();
  });

  it("CORE-011 iframe style and permissions merge with defaults", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const frame = window.document.createElement("iframe");
    runtime.applyIframeOptions({ sidebar_iframestyle: "border: 2px solid red;", sidebar_iframeallow: "microphone" }, frame);
    expect(frame.style.border).toBe("2px solid red");
    expect(frame.getAttribute("allow")).toBe("microphone");
    const fallbackFrame = window.document.createElement("iframe");
    runtime.applyIframeOptions({}, fallbackFrame);
    expect(fallbackFrame.getAttribute("allow")).toContain("camera");
    expect(fallbackFrame.referrerPolicy).toBe("strict-origin-when-cross-origin");
    dom.window.close();
  });

  it("CORE-012 configured colors reach host and inline content", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    const colors = runtime.normalizeColors({ sidebar_primarycolor: "#123456", sidebar_textcolor: "#abcdef", sidebar_linkcolor: "#fedcba" });
    const themed = runtime.applyDocumentColors("<html><head></head><body>Content</body></html>", colors);
    runtime.renderRuntime(panelRecord(1, {
      sidebar_primarycolor: colors.primary,
      sidebar_textcolor: colors.text,
      sidebar_linkcolor: colors.link
    }), "config-colors");
    expect(window.document.documentElement.style.getPropertyValue("--band-bg")).toBe("#123456");
    expect(themed).toContain("--sidebar-link: #fedcba");
    dom.window.close();
  });

  it("CORE-013 Copilot URL receives encoded theme", () => {
    const { dom, runtime } = createHtmlRuntime();
    const original = "https://copilotstudio.microsoft.com/environments/demo?foo=bar";
    const themed = new URL(runtime.applyCopilotTheme(original, { primary: "#123456", text: "#ffffff", link: "#654321" }));
    expect(themed.searchParams.get("foo")).toBe("bar");
    const decoded = JSON.parse(Buffer.from(themed.searchParams.get("b"), "base64").toString("utf8"));
    expect(decoded.styleOptions.bubbleBackground).toBe("#123456");
    expect(decoded.styleOptions.suggestedActionTextColor).toBe("#654321");
    dom.window.close();
  });

  it("CORE-014 invalid and missing configuration fail safely", () => {
    const { dom, window, runtime } = createHtmlRuntime();
    runtime.renderPlaceholder("No configuration selected.");
    expect(window.document.querySelector(".placeholder").textContent).toBe("No configuration selected.");
    expect(runtime.renderRuntime({}, "empty-config")).toBeNull();
    expect(window.document.querySelector(".placeholder").textContent).toBe("No panels configured.");
    runtime.renderError(new Error("Dataverse unavailable"));
    expect(window.document.querySelector(".error").textContent).toContain("Dataverse unavailable");
    dom.window.close();
  });
});