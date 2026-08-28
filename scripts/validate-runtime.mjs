/*
=============================================================================
COMPONENT:    Core Runtime Static Validator
FILE:         scripts/validate-runtime.mjs
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-08-28
ENVIRONMENT:  Node.js

OVERVIEW
-----------------------------------------------------------------------------
Validates runtime versions, matrix coverage, and required canonical symbols.

CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-08-28  Added canonical Core runtime static validation
=============================================================================
*/
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "web resources/sidebar_sidebar.html"), "utf8");
const javascript = readFileSync(resolve(root, "web resources/sidebar_sidebar.js"), "utf8");
const matrix = readFileSync(resolve(root, "docs/CORE_RUNTIME_RECONCILIATION.md"), "utf8");

const required = {
  html: [
    "VERSION:      2.15.0",
    "buildPanels",
    "renderRuntime",
    "applyIframeOptions",
    "applyDocumentColors",
    "applyCopilotTheme",
    "popOutPanel",
    "focusPopoutWindow",
    "restoreEmbeddedContent"
  ],
  javascript: ["VERSION:      2.6.0", "shouldNavigate", "__GenericSidebarPaneRuntime"],
  matrix: Array.from({ length: 14 }, (_, index) => `CORE-${String(index + 1).padStart(3, "0")}`)
};

const failures = [];
for (const [name, tokens] of Object.entries(required)) {
  const content = { html, javascript, matrix }[name];
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${name} is missing ${token}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Static runtime validation passed: HTML 2.15.0, JavaScript 2.6.0, 14 matrix tests.");