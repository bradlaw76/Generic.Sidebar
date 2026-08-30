/*
=============================================================================
COMPONENT:    Core Runtime Static Validator
FILE:         scripts/validate-runtime.mjs
VERSION:      1.2.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-08-30
ENVIRONMENT:  Node.js

OVERVIEW
-----------------------------------------------------------------------------
Validates runtime versions, matrix coverage, and required canonical symbols.

CHANGELOG
-----------------------------------------------------------------------------
v1.2.0  2026-08-30  Validate indexed controls on the main configuration form
v1.1.0  2026-08-30  Validate every runtime-selected Dataverse column
v1.0.0  2026-08-28  Added canonical Core runtime static validation
=============================================================================
*/
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "web resources/sidebar_sidebar.html"), "utf8");
const javascript = readFileSync(resolve(root, "web resources/sidebar_sidebar.js"), "utf8");
const matrix = readFileSync(resolve(root, "docs/CORE_RUNTIME_RECONCILIATION.md"), "utf8");
const entity = readFileSync(resolve(root, "solution/GenericSidebar/Entities/sidebar_GenericSidebar/Entity.xml"), "utf8");
const mainForm = readFileSync(resolve(root, "solution/GenericSidebar/Entities/sidebar_GenericSidebar/FormXml/main/{469a1c80-d3aa-4f7f-b44c-8be3827a3ae8}.xml"), "utf8");

const indexedColumns = [
  ...Array.from({ length: 4 }, (_, index) => `sidebar_title${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `sidebar_instructions${index + 2}`),
  ...Array.from({ length: 3 }, (_, index) => `sidebar_embedcode${index + 2}`)
];

const required = {
  html: [
    "VERSION:      2.15.2",
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
  matrix: Array.from({ length: 14 }, (_, index) => `CORE-${String(index + 1).padStart(3, "0")}`),
  entity: indexedColumns.map((column) => `<LogicalName>${column}</LogicalName>`),
  mainForm: indexedColumns.map((column) => `datafieldname="${column}"`)
};

const failures = [];
for (const [name, tokens] of Object.entries(required)) {
  const content = { html, javascript, matrix, entity, mainForm }[name];
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${name} is missing ${token}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Static runtime validation passed: HTML 2.15.2, JavaScript 2.6.0, 14 matrix capabilities, 10 indexed columns and form controls.");