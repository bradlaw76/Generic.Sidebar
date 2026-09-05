/*
=============================================================================
COMPONENT:    Core Runtime Test Configuration
FILE:         vitest.config.js
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-08-28
ENVIRONMENT:  Node.js | Vitest

OVERVIEW
-----------------------------------------------------------------------------
Configures deterministic Core runtime acceptance tests in a Node environment.

CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-08-28  Added Core runtime reconciliation test configuration
=============================================================================
*/
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/core/**/*.test.js"],
    reporters: ["default"]
  }
});