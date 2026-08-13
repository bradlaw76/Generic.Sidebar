import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { installWindowMocks } from "../setup/browser-mocks.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(testDirectory, "../..");

async function waitForInitialDocumentLoad(window) {
  if (window.document.readyState === "complete") return;
  await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
}

function inlineScripts(document) {
  return [...document.querySelectorAll("script:not([src])")];
}

export async function waitForCondition(predicate, description, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function createDom(html, options = {}) {
  const unexpectedErrors = [];
  const allowedConsoleErrors = options.allowedConsoleErrors || [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => unexpectedErrors.push(error));
  virtualConsole.on("error", (...args) => {
    const message = args.map(String).join(" ");
    if (!allowedConsoleErrors.some((pattern) => pattern.test(message))) {
      unexpectedErrors.push(new Error(`Unexpected console.error: ${message}`));
    }
  });

  const dom = new JSDOM(html, {
    url: options.url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  dom.window.addEventListener("error", (event) => {
    unexpectedErrors.push(event.error || new Error(event.message));
  });
  dom.window.addEventListener("unhandledrejection", (event) => {
    unexpectedErrors.push(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  });

  return {
    dom,
    close() {
      dom.window.close();
      if (unexpectedErrors.length) {
        throw new AggregateError(unexpectedErrors, "Unexpected jsdom or production-script errors");
      }
    },
  };
}

export async function loadSidebarHtml({ xrm, popup, query = "", allowedConsoleErrors } = {}) {
  const sourcePath = path.join(repositoryRoot, "web resources", "sidebar_sidebar.html");
  const html = await readFile(sourcePath, "utf8");
  const resource = createDom(html, {
    url: `https://contoso.crm.dynamics.com/WebResources/sidebar_sidebar.html${query}`,
    allowedConsoleErrors,
  });
  const { dom } = resource;

  await waitForInitialDocumentLoad(dom.window);
  const browser = installWindowMocks(dom.window, { xrm, popup });
  for (const script of inlineScripts(dom.window.document)) {
    dom.window.eval(script.textContent);
  }

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    browser,
    async render() {
      return dom.window.loadConfigAndRender();
    },
    async initializeFromLoad() {
      dom.window.dispatchEvent(new dom.window.Event("load"));
      await waitForCondition(
        () => {
          const document = dom.window.document;
          const hostText = document.querySelector("#host")?.textContent || "";
          return document.querySelector("#panelContainer iframe") !== null ||
            document.querySelector("#host .error") !== null ||
            hostText.includes("No configuration selected.") ||
            hostText.includes("No panels configured.");
        },
        "sidebar load lifecycle rendering",
      );
    },
    close: resource.close,
  };
}

export async function loadSidebarScript({ xrm, scriptLoad = "success", msal, allowedConsoleErrors } = {}) {
  const sourcePath = path.join(repositoryRoot, "web resources", "sidebar_sidebar.js");
  const bootstrapPath = path.join(repositoryRoot, "web resources", "sidebar_sso_bootstrap.js");
  const setupPath = path.join(repositoryRoot, "web resources", "sidebar_sso_setup.js");
  const [source, bootstrapSource, setupSource] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(bootstrapPath, "utf8"),
    readFile(setupPath, "utf8"),
  ]);
  const resource = createDom("<!doctype html><html><head></head><body></body></html>", {
    url: "https://contoso.crm.dynamics.com/main.aspx",
    allowedConsoleErrors,
  });
  const { dom } = resource;
  installWindowMocks(dom.window, { xrm });
  if (msal) dom.window.msal = msal;

  const originalAppendChild = dom.window.document.head.appendChild.bind(dom.window.document.head);
  dom.window.document.head.appendChild = function appendChild(node) {
    const result = originalAppendChild(node);
    if (node.tagName === "SCRIPT") {
      queueMicrotask(() => {
        const isBootstrap = node.src.includes("sidebar_sso_bootstrap");
        const isSetup = node.src.includes("sidebar_sso_setup");
        if (scriptLoad === "failure" ||
          (scriptLoad === "bootstrap-failure" && isBootstrap) ||
          (scriptLoad === "setup-failure" && isSetup)) {
          node.onerror?.(new dom.window.Event("error"));
          return;
        }
        if (isBootstrap) dom.window.eval(bootstrapSource);
        if (isSetup) dom.window.eval(setupSource);
        node.onload?.(new dom.window.Event("load"));
      });
    }
    return result;
  };

  dom.window.eval(source);
  return {
    dom,
    window: dom.window,
    close: resource.close,
  };
}

export async function loadSsoFallback({ retry } = {}) {
  const sourcePath = path.join(repositoryRoot, "web resources", "sidebar_sso_canvas_fallback.html");
  const html = await readFile(sourcePath, "utf8");
  const resource = createDom(html, {
    url: "https://contoso.crm.dynamics.com/WebResources/sidebar_sso_canvas_fallback.html",
  });
  const { dom } = resource;
  await waitForInitialDocumentLoad(dom.window);

  Object.defineProperty(dom.window, "parent", {
    configurable: true,
    value: { Generic_OpenSidebar: retry, console: { error() {} } },
  });
  for (const script of inlineScripts(dom.window.document)) {
    dom.window.eval(script.textContent);
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded", { bubbles: true }));

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    close: resource.close,
  };
}

export async function loadLinkedAgentPicker({ parentXrm, openerXrm, sessionData, allowedConsoleErrors } = {}) {
  const sourcePath = path.join(repositoryRoot, "SO Sign In", "vz_AgentSidePanelHTML.html");
  const html = await readFile(sourcePath, "utf8");
  const resource = createDom(html, {
    url: "https://contoso.crm.dynamics.com/WebResources/vz_AgentSidePanelHTML.html?configId=11111111-1111-4111-8111-111111111111",
    allowedConsoleErrors,
  });
  const { dom } = resource;
  await waitForInitialDocumentLoad(dom.window);

  Object.defineProperty(dom.window, "parent", {
    configurable: true,
    value: parentXrm ? { Xrm: parentXrm } : {},
  });
  Object.defineProperty(dom.window, "opener", {
    configurable: true,
    value: openerXrm ? { Xrm: openerXrm } : null,
  });
  if (sessionData) {
    dom.window.sessionStorage.setItem("ai_sessions", JSON.stringify(sessionData));
  }
  dom.window.msal = {
    PublicClientApplication: class PublicClientApplication {
      getAllAccounts() { return []; }
      ssoSilent() { return Promise.reject(new Error("Synthetic silent sign-in unavailable")); }
      loginPopup() { return Promise.reject(new Error("Synthetic popup sign-in unavailable")); }
    },
  };

  for (const script of inlineScripts(dom.window.document)) {
    dom.window.eval(script.textContent);
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded", { bubbles: true }));
  await waitForCondition(
    () => dom.window.document.querySelector("#quickActions")?.children.length > 0,
    "linked-agent initialization",
  );

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    async settle() {
      await waitForCondition(
        () => dom.window.document.querySelector("#quickActions")?.children.length > 0,
        "linked-agent rendering",
      );
    },
    close: resource.close,
  };
}