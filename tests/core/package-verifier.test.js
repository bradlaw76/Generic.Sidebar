/*
=============================================================================
COMPONENT:    Core Package Verifier Regression Tests
FILE:         tests/core/package-verifier.test.js
VERSION:      1.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-05
ENVIRONMENT:  Node.js | Vitest | PowerShell | ZIP

OVERVIEW
-----------------------------------------------------------------------------
Verifies normalized text comparison and exact binary package comparison.

CHANGELOG
-----------------------------------------------------------------------------
v1.1.0  2026-09-05  Added exact binary equivalence and corruption coverage
v1.0.0  2026-09-05  Added normalized line-ending and content-drift coverage
=============================================================================
*/
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
const unpackedResources = resolve(root, "solution/GenericSidebar/WebResources");

function getMappings() {
  return readdirSync(unpackedResources)
    .filter((name) => name.endsWith(".data.xml"))
    .map((metadataName) => {
      const metadata = readFileSync(resolve(unpackedResources, metadataName), "utf8");
      const entryName = metadata.match(/<FileName>\/?([^<]+)<\/FileName>/)?.[1];
      const resourceType = Number(metadata.match(/<WebResourceType>(\d+)<\/WebResourceType>/)?.[1]);
      if (!entryName || !resourceType) throw new Error(`Invalid web-resource metadata: ${metadataName}`);
      return {
        entryName,
        resourceType,
        sourcePath: resolve(unpackedResources, metadataName.replace(/\.data\.xml$/, ""))
      };
    });
}

const mappings = getMappings();

function createPackage(name, transformText = (content) => content, transformBinary = (content) => content) {
  const archive = new AdmZip(sourcePackage);
  for (const mapping of mappings) {
    const entry = archive.getEntry(mapping.entryName);
    if (!entry) throw new Error(`Package entry not found: ${mapping.entryName}`);
    const source = readFileSync(mapping.sourcePath);
    const content = [1, 2, 3, 4].includes(mapping.resourceType)
      ? Buffer.from(transformText(source.toString("utf8").replace(/\r\n?/g, "\n"), mapping), "utf8")
      : transformBinary(Buffer.from(source), mapping);
    archive.updateFile(entry.entryName, content);
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
    const changedPackage = createPackage("runtime-content-change.zip", (content, mapping) =>
      mapping.entryName.includes("sidebar_sidebarhtml") ? content.replace("Generic Sidebar", "Changed Sidebar") : content
    );
    const result = verifyPackage(changedPackage);

    expect(result.status).not.toBe(0);
    const diagnostic = `${result.stdout}\n${result.stderr}`;
    expect(diagnostic).toContain("Packaged text does not match source after line-ending");
    expect(diagnostic).toContain("normalization:");
  });

  it("exercises exact byte comparison for an equivalent binary resource", () => {
    const packagePath = createPackage("binary-equivalent.zip");
    const result = verifyPackage(packagePath);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    const logo = report.ResourceComparisons.find((resource) => resource.Name === "sidebar_genericsidebarlogo");
    expect(logo.Mode).toBe("ExactBytes");
    expect(logo.SourceHash).toBe(logo.PackagedHash);
  });

  it("rejects a one-byte change in a copied binary resource", () => {
    const changedPackage = createPackage(
      "binary-content-change.zip",
      (content) => content,
      (content, mapping) => {
        if (mapping.entryName.includes("sidebar_genericsidebarlogo")) content[0] ^= 0xff;
        return content;
      }
    );
    const result = verifyPackage(changedPackage);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("Packaged binary does not match source byte-for-byte");
  });
});