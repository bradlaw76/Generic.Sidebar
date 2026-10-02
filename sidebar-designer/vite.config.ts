/**
 * ============================================================================
 * COMPONENT:    Generic Sidebar Designer Build
 * FILE:         sidebar-designer/vite.config.ts
 * VERSION:      1.0.0
 * AUTHOR:       Generic.Sidebar Team
 * LAST UPDATED: 2026-10-02
 * ENVIRONMENT:  React / Vite / Dataverse HTML web resource
 *
 * OVERVIEW
 * Produces a single self-contained HTML web resource for additive deployment
 * into the GenericSidebar Dataverse solution.
 *
 * ARCHITECTURE
 * - Build: Vite with React and single-file inlining
 * - Output: dist/sidebar_designer.html
 * - Runtime: Model-driven app web resource
 *
 * FEATURES
 * - Single deployable component
 * - Relative-base-safe output
 * - Minified production bundle
 *
 * SECURITY MODEL
 * - No environment URLs, tokens, or credentials are embedded at build time.
 *
 * CHANGELOG
 * v1.0.0  2026-10-02  Initial build configuration
 * ============================================================================
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
