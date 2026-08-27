/*
=============================================================================
COMPONENT:    Generic Sidebar Architecture PowerPoint Generator
FILE:         scripts/generate-generic-sidebar-architecture-pptx.js
VERSION:      1.0.4
AUTHOR:       Generic Sidebar Team
LAST UPDATED: 2026-08-27
ENVIRONMENT:  Node.js / PptxGenJS
APP URL:      Not applicable

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Generates an editable, single-slide PowerPoint reference architecture for
Generic Sidebar Core and its separately deployed optional add-ins. The slide
captures the reusable host, runtime, configuration, and add-in boundaries.

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Data Source:      Repository architecture specification and SVG reference
- Output:           docs/architecture/generic-sidebar-reference-architecture.pptx
- Auth Model:       Not applicable; local build-time generation only
- Rendering:        Native PowerPoint shapes, text, and connectors
- API Pattern:      PptxGenJS presentation API
- Data Format:      Office Open XML presentation package

-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Layout:           Widescreen 16:9 architecture review slide
- Editing:          Native PowerPoint elements remain editable
- Boundaries:       Host, runtime, administration/data, optional adapters
- Flow:             Required runtime and dashed optional/configuration paths
- Accessibility:    Descriptive alternative text on primary visual regions
- UX Notes:         Fluent-aligned colors and presentation-safe type sizes

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Node.js 18 or later
2. Dependency: pptxgenjs
3. Run from the repository root

-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- Auth Scope:       No authentication or network access
- Data Exposure:    Architecture labels from repository documentation only
- File Access:      Writes only the declared PowerPoint output
- Secret Handling:  No credentials or environment secrets are read

-----------------------------------------------------------------------------
STYLE ISOLATION
-----------------------------------------------------------------------------
- All layout and color values are local to this generator.
- No repository web resources or application styles are modified.

-----------------------------------------------------------------------------
KNOWN LIMITATIONS
-----------------------------------------------------------------------------
- Font substitution may occur when Segoe UI is unavailable.
- PowerPoint may slightly adjust connector endpoints when shapes are moved.

-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
- Script passes Node.js syntax validation
- Generated presentation opens as a valid Office Open XML package
- Slide renders without overlap, clipping, or unreadable labels
- Major architecture labels are present in extracted presentation text

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0.4  2026-08-27  Name Android and Genesys as separate optional add-ins outside Core
v1.0.3  2026-08-18  Reroute configuration read line around admin text
v1.0.2  2026-08-18  Normalize connector geometry for valid PowerPoint XML
v1.0.1  2026-08-18  Await package generation before the Node process exits
v1.0.0  2026-08-18  Initial editable reference architecture slide generator

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Keep the four architecture boundaries visually distinct.
- Keep optional adapters separate from required runtime dependencies.
- Preserve logical Dataverse names exactly as documented.
- Do not add secrets, tenant identifiers, or environment-specific endpoints.
=============================================================================
*/

const path = require("node:path");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Generic Sidebar Team";
pptx.company = "Microsoft";
pptx.subject = "Reusable reference architecture for Generic Sidebar";
pptx.title = "Generic Sidebar - Reusable Reference Architecture";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Segoe UI Semibold",
  bodyFontFace: "Segoe UI",
  lang: "en-US"
};

const slide = pptx.addSlide();
slide.background = { color: "FFFFFF" };

const C = {
  ink: "1E1E1E",
  muted: "605E5C",
  rule: "D2D0CE",
  blue: "0078D4",
  blueFill: "CFE4FA",
  green: "107C10",
  greenFill: "DFF6DD",
  orange: "F7630C",
  orangeFill: "FFF4CE",
  purple: "5C2D91",
  purpleFill: "E8DAEF",
  gray: "495057",
  grayFill: "F3F2F1"
};

const shape = pptx.ShapeType;
const baseText = {
  fontFace: "Segoe UI",
  color: C.ink,
  margin: 0,
  breakLine: false,
  fit: "shrink"
};

function addText(text, x, y, w, h, options = {}) {
  slide.addText(text, { x, y, w, h, ...baseText, ...options });
}

function addBoundary(title, x, y, w, h, color, altText) {
  slide.addShape(shape.roundRect, {
    x, y, w, h,
    rectRadius: 0.05,
    fill: { color: "FFFFFF", transparency: 100 },
    line: { color, width: 1.6 },
    altText
  });
  addText(title, x + 0.2, y + 0.12, w - 0.4, 0.25, {
    fontSize: 12.2,
    bold: true,
    color: C.ink
  });
}

function addBox(title, lines, x, y, w, h, stroke, fill, options = {}) {
  slide.addShape(shape.roundRect, {
    x, y, w, h,
    rectRadius: 0.05,
    fill: { color: fill },
    line: { color: stroke, width: 1.25 },
    shadow: options.shadow === false ? undefined : {
      type: "outer",
      color: "000000",
      blur: 1.5,
      offset: 0.7,
      angle: 45,
      opacity: 0.10
    },
    altText: options.altText || `${title}. ${lines.join(". ")}`
  });
  const titleHeight = options.compact ? 0.18 : 0.22;
  addText(title, x + 0.09, y + 0.10, w - 0.18, titleHeight, {
    fontSize: options.titleSize || 10.3,
    bold: true,
    align: "center",
    valign: "mid"
  });
  if (lines.length) {
    addText(lines.join("\n"), x + 0.09, y + 0.34, w - 0.18, h - 0.42, {
      fontSize: options.bodySize || 8.5,
      align: "center",
      valign: "mid",
      breakLine: true,
      paraSpaceAfterPt: 2
    });
  }
}

function addArrow(x, y, w, h, color, options = {}) {
  const normalizedX = w < 0 ? x + w : x;
  const normalizedY = h < 0 ? y + h : y;
  const normalizedWidth = Math.abs(w);
  const normalizedHeight = Math.abs(h);

  slide.addShape(shape.line, {
    x: normalizedX,
    y: normalizedY,
    w: normalizedWidth,
    h: normalizedHeight,
    flipH: w < 0,
    flipV: h < 0,
    line: {
      color,
      width: options.width || 1.5,
      dashType: options.dashed ? "dash" : "solid",
      beginArrowType: options.beginArrowType || "none",
      endArrowType: options.endArrowType || "triangle"
    }
  });
}

addText("Generic Sidebar", 0.48, 0.25, 3.2, 0.36, {
  fontSize: 24,
  bold: true
});
addText("Reusable Reference Architecture", 3.13, 0.29, 5.0, 0.3, {
  fontSize: 18,
  color: C.muted
});
addText("Independent Core solution with separately deployed optional add-ins", 0.5, 0.66, 8.2, 0.23, {
  fontSize: 10.5,
  color: C.muted
});

slide.addShape(shape.roundRect, {
  x: 0.5, y: 0.98, w: 12.33, h: 0.42,
  rectRadius: 0.04,
  fill: { color: C.blueFill },
  line: { color: C.blue, width: 1.2 },
  altText: "Reuse contract: stable host launcher, table-driven configuration, pluggable experiences, and optional identity and service adapters."
});
addText("REUSE CONTRACT", 0.72, 1.105, 1.1, 0.16, {
  fontSize: 9.4,
  bold: true,
  color: C.blue
});
addText("Stable host launcher  +  table-driven configuration  +  pluggable experiences  +  optional identity/service adapters", 1.82, 1.07, 10.7, 0.22, {
  fontSize: 10.4,
  bold: true,
  align: "center"
});

addBoundary("1  HOST APPLICATION", 1.78, 1.62, 2.95, 4.72, C.blue,
  "Host application boundary containing the model-driven form, launcher, and Dynamics side pane lifecycle.");
addBoundary("2  GENERIC SIDEBAR RUNTIME", 5.05, 1.62, 3.65, 4.72, C.green,
  "Generic Sidebar runtime boundary containing configuration loading, routing policy, and the experience host.");
addBoundary("3  CORE ADMINISTRATION AND DATA", 9.02, 1.62, 3.8, 2.48, C.orange,
  "Generic Sidebar Core administration and sidebar-prefixed Dataverse configuration boundary.");
addBoundary("4  OPTIONAL ADD-INS / ADAPTERS", 9.02, 4.34, 3.8, 2.0, C.purple,
  "Separately deployed Android and Genesys add-ins plus optional identity, Copilot Studio, Azure Function, and Azure Communication Services adapters.");

addBox("Agent / App user", [], 0.5, 2.48, 0.95, 0.68, C.gray, C.grayFill, {
  compact: true,
  titleSize: 8.9,
  shadow: false,
  altText: "Agent or model-driven app user."
});

addBox("Dynamics 365 / Model-driven app", ["Packaged or custom form"], 2.18, 2.16, 2.15, 0.78, C.blue, C.blueFill);
addBox("Form OnLoad launcher", ["Generic_OpenSidebar", "sidebar_sidebar.js"], 2.18, 3.45, 2.15, 0.86, C.blue, C.blueFill);
addBox("Xrm.App.sidePanes", ["Persistent pane lifecycle", "Open, reuse, focus"], 2.18, 4.94, 2.15, 0.92, C.blue, C.blueFill);

addBox("Configuration loader", ["Dataverse Web API", "Default config + active linked agents"], 5.48, 2.16, 2.78, 0.82, C.green, C.greenFill);
addBox("Route and policy decision", ["Standard canvas or SSO canvas", "Validation, errors, retry state"], 5.48, 3.48, 2.78, 0.88, C.green, C.greenFill);
addBox("Experience host (tabs 1-4)", ["Instructions + theme + icon", "URL / approved HTML embed", "Linked-agent picker", "Pop-out and restore controls"], 5.48, 4.9, 2.78, 1.0, C.green, C.greenFill, { bodySize: 8.2 });

addBox("Maker / Admin", ["Model-driven admin app"], 9.38, 2.16, 1.28, 0.78, C.orange, C.orangeFill, { titleSize: 9.2, bodySize: 8.0 });
addBox("Sidebar Configuration", ["sidebar_genericsidebar", "1 shared/default row"], 11.02, 2.16, 1.42, 0.9, C.orange, C.orangeFill, { titleSize: 8.8, bodySize: 7.8 });
addBox("Linked Agent rows", ["0..N active agents", "Metadata + endpoint"], 11.02, 3.19, 1.42, 0.7, C.orange, C.orangeFill, { titleSize: 8.7, bodySize: 7.7 });

addBox("Microsoft Entra ID", ["MSAL user token"], 9.37, 4.82, 1.32, 0.62, C.purple, C.purpleFill, { titleSize: 8.8, bodySize: 7.7 });
addBox("Copilot Studio", ["Token exchange + chat"], 11.03, 4.82, 1.4, 0.62, C.purple, C.purpleFill, { titleSize: 9.0, bodySize: 7.7 });
addBox("Android / Genesys add-ins", [], 9.37, 5.6, 1.32, 0.42, C.purple, C.purpleFill, { compact: true, titleSize: 7.4, shadow: false });
addBox("Azure Function + ACS", [], 11.03, 5.6, 1.4, 0.42, C.purple, C.purpleFill, { compact: true, titleSize: 8.0, shadow: false });

addArrow(1.45, 2.82, 0.73, -0.24, C.gray);
addArrow(3.25, 2.94, 0, 0.51, C.blue);
addArrow(3.25, 4.31, 0, 0.63, C.blue);
addArrow(4.33, 5.38, 0.52, 0, C.green);
addArrow(4.85, 5.38, 0, -2.8, C.green);
addArrow(4.85, 2.58, 0.63, 0, C.green);
addArrow(6.87, 2.98, 0, 0.5, C.green);
addArrow(6.87, 4.36, 0, 0.54, C.green);

addArrow(10.66, 2.55, 0.36, 0, C.orange);
addArrow(11.73, 3.06, 0, 0.13, C.orange);
addArrow(11.02, 2.58, 0, 0.52, C.orange, { dashed: true, endArrowType: "none" });
addArrow(11.02, 3.1, -2.12, 0, C.orange, { dashed: true, endArrowType: "none" });
addArrow(8.9, 3.1, 0, -0.52, C.orange, { dashed: true, endArrowType: "none" });
addArrow(8.9, 2.58, -0.64, 0, C.orange, { dashed: true });
addText("read at runtime", 9.3, 2.96, 1.15, 0.17, {
  fontSize: 7.5,
  color: C.orange,
  italic: true,
  align: "center"
});

addArrow(8.26, 3.91, 0.54, 0, C.purple, { dashed: true });
addArrow(8.8, 3.91, 0, 1.22, C.purple, { dashed: true });
addArrow(8.8, 5.13, 0.57, 0, C.purple, { dashed: true });
addArrow(10.69, 5.13, 0.34, 0, C.purple);
addArrow(8.26, 5.42, 0.54, 0, C.purple, { dashed: true });
addArrow(8.8, 5.42, 0, 0.39, C.purple, { dashed: true });
addArrow(8.8, 5.81, 0.57, 0, C.purple, { dashed: true });
addArrow(10.69, 5.81, 0.34, 0, C.purple);

slide.addShape(shape.line, {
  x: 0.5, y: 6.62, w: 12.33, h: 0,
  line: { color: C.rule, width: 0.8 }
});
addText([
  { text: "FLOW  ", options: { bold: true, color: C.green } },
  { text: "User opens record -> form launches pane -> runtime reads Dataverse -> policy selects route -> configured experience renders" }
], 0.5, 6.77, 12.33, 0.2, { fontSize: 8.5 });
addText([
  { text: "SECURITY BOUNDARY  ", options: { bold: true, color: "D13438" } },
  { text: "Validate configured URLs/HTML, grant least-privilege iframe capabilities, and fail closed when an enabled identity route fails" }
], 0.5, 7.04, 12.33, 0.2, { fontSize: 8.5 });

slide.addNotes(`
This slide presents the reusable Generic Sidebar architecture.

The required runtime path moves from a model-driven form through Generic_OpenSidebar and Xrm.App.sidePanes into the shared runtime. The runtime reads the default sidebar_genericsidebar row and active linked-agent rows, applies routing policy, and renders the configured experience.

Orange dashed lines represent Core runtime configuration reads. Purple dashed lines represent separately deployed optional adapters and add-ins, including Entra ID, Copilot Studio, Android Phone, Genesys Softphone, Azure Functions, and Azure Communication Services. Android, Genesys, GenericSoftphone, and gensoft_* components are not members or dependencies of the base Core solution package.

The reuse contract is to keep the launcher and runtime stable while changing experiences through governed Dataverse configuration and narrowly scoped adapters.
`);

const outputPath = path.resolve(__dirname, "..", "docs", "architecture", "generic-sidebar-reference-architecture.pptx");

async function writePresentation() {
  await pptx.writeFile({ fileName: outputPath });
}

writePresentation().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});