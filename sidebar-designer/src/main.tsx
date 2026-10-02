/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Entry Point
 * FILE:         sidebar-designer/src/main.tsx
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  React / Dataverse HTML web resource
 *
 * OVERVIEW
 * Starts the designer with Dataverse or explicit local demo data.
 *
 * ARCHITECTURE
 * - Production: DataverseSidebarRepository
 * - Local demo: MockSidebarRepository only with ?demo=1
 * - Theme: Fluent UI web light theme
 *
 * SECURITY MODEL
 * - Never falls back to mock data when the model-driven host is unavailable.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial entry point
 * ============================================================================
 */

import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DataverseSidebarRepository } from "./dataverse";
import { MockSidebarRepository } from "./mockData";
import "./styles.css";

const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
const repository = demoMode
  ? new MockSidebarRepository()
  : new DataverseSidebarRepository();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Generic Sidebar Designer root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <FluentProvider theme={webLightTheme}>
      <App repository={repository} demoMode={demoMode} />
    </FluentProvider>
  </StrictMode>,
);
