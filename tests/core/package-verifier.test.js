/*
=============================================================================
COMPONENT:    Core Package Verifier Regression Tests
FILE:         tests/core/package-verifier.test.js
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-05
ENVIRONMENT:  Node.js | Vitest | PowerShell | ZIP

OVERVIEW
-----------------------------------------------------------------------------
Verifies that package text comparison ignores line-ending representation only
and continues to reject substantive content changes.

CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-09-05  Added normalized line-ending and content-drift coverage
=============================================================================
*/
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import AdmZip from "adm-zip";
import { afterAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePackage = resolve(root, "GenericSidebar_1_0_0_7.zip");
const verifier = resolve(root, "scripts/verify-core-package.ps1");
const temporaryRoot = mkdtempSync(join(tmpdir(), "generic-sidebar-package-verifier-"));
const textEntries = ["sidebar_sidebarhtml", "sidebar_sidebarjs"];

function createPackage(name, transform) {
  const archive = new AdmZip(sourcePackage);
  for (const marker of textEntries) {
    const entry = archive.getEntries().find((candidate) => candidate.entryName.includes(marker));
    if (!entry) {
      throw new Error(`Package entry not found: ${marker}`);
    }
    const normalized = entry.getData().toString("utf8").replace(/\r\n?/g, "\n");
    archive.updateFile(entry.entryName, Buffer.from(transform(normalized, marker), "utf8"));
  }
  const output = join(temporaryRoot, name);
  archive.writeZip(output);
  return output;
}

function verifyPackage(packagePath) {
  return spawnSync("pwsh", ["-NoProfile", "-File", verifier, "-PackagePath", packagePath], {
    cwd: root,
    encoding: "utf8"
  });
}

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("Core package verifier", () => {
  it("accepts equivalent LF and CRLF text resources", () => {
    const variants = [
      createPackage("runtime-lf.zip", (content) => content),
      createPackage("runtime-crlf.zip", (content) => content.replace(/\n/g, "\r\n"))
    ];

    for (const packagePath of variants) {
      const result = verifyPackage(packagePath);
      expect(result.status, `${basename(packagePath)}: ${result.stderr}`).toBe(0);
    }
  });

  it("rejects a substantive text content change", () => {
    const changedPackage = createPackage("runtime-content-change.zip", (content, marker) =>
      marker === "sidebar_sidebarhtml" ? content.replace("Generic Sidebar", "Changed Sidebar") : content
    );
    const result = verifyPackage(changedPackage);

    expect(result.status).not.toBe(0);
    const diagnostic = `${result.stdout}\n${result.stderr}`;
    expect(diagnostic).toContain("Packaged text does not match canonical source after line-ending");
    expect(diagnostic).toContain("normalization:");
  });
});