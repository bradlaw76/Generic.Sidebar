<#
=============================================================================
COMPONENT:    Generic Sidebar Core Solution Builder
FILE:         scripts/build-core-solution.ps1
VERSION:      1.3.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-04
ENVIRONMENT:  PowerShell | Power Platform CLI

OVERVIEW
-----------------------------------------------------------------------------
Synchronizes canonical Core runtime files into unpacked solution source and
uses Microsoft Power Platform CLI SolutionPackager to produce solution 1.0.0.7.

CHANGELOG
-----------------------------------------------------------------------------
v1.3.0  2026-09-04  Advance Core solution package to 1.0.0.7
v1.2.0  2026-08-30  Require fixed-height flex correction in HTML 2.15.2
v1.1.0  2026-08-30  Require schema-aligned HTML runtime 2.15.1
v1.0.0  2026-08-28  Added reproducible PAC CLI Core solution packaging
=============================================================================
#>
[CmdletBinding()]
param(
    [string]$OutputPath = "GenericSidebar_1_0_0_7.zip",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$solutionRoot = Join-Path $root "solution/GenericSidebar"
$solutionXmlPath = Join-Path $solutionRoot "Other/Solution.xml"
$sourceHtml = Join-Path $root "web resources/sidebar_sidebar.html"
$sourceJavaScript = Join-Path $root "web resources/sidebar_sidebar.js"
$solutionHtml = Join-Path $solutionRoot "WebResources/sidebar_sidebar.html"
$solutionJavaScript = Join-Path $solutionRoot "WebResources/sidebar_sidebar.js"
$output = if ([IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $root $OutputPath }

if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
    throw "Microsoft Power Platform CLI (pac) is required."
}

foreach ($path in @($solutionXmlPath, $sourceHtml, $sourceJavaScript, $solutionHtml, $solutionJavaScript)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required build input is missing: $path" }
}

if ((Get-Content -Raw -LiteralPath $sourceHtml) -notmatch 'VERSION:\s+2\.15\.2') {
    throw "Canonical HTML source must declare version 2.15.2."
}
if ((Get-Content -Raw -LiteralPath $sourceJavaScript) -notmatch 'VERSION:\s+2\.6\.0') {
    throw "Canonical JavaScript source must declare version 2.6.0."
}

if (-not $SkipTests) {
    Push-Location $root
    try {
        & npm test
        if ($LASTEXITCODE -ne 0) { throw "Core runtime tests failed." }
        & npm run validate:runtime
        if ($LASTEXITCODE -ne 0) { throw "Static runtime validation failed." }
    }
    finally {
        Pop-Location
    }
}

Copy-Item -LiteralPath $sourceHtml -Destination $solutionHtml -Force
Copy-Item -LiteralPath $sourceJavaScript -Destination $solutionJavaScript -Force

[xml]$solutionXml = Get-Content -Raw -LiteralPath $solutionXmlPath
$manifest = $solutionXml.ImportExportXml.SolutionManifest
if ($manifest.UniqueName -ne "GenericSidebar") { throw "Unexpected solution unique name: $($manifest.UniqueName)" }
if ($manifest.Managed -ne "0") { throw "Only the unmanaged Generic Sidebar Core solution is supported." }
$manifest.Version = "1.0.0.7"
$settings = [Xml.XmlWriterSettings]::new()
$settings.Encoding = [Text.UTF8Encoding]::new($false)
$settings.Indent = $true
$writer = [Xml.XmlWriter]::Create($solutionXmlPath, $settings)
try { $solutionXml.Save($writer) } finally { $writer.Dispose() }

$forbidden = 'Android|Genesys|ACS|SSO|GenericSoftphone|gensoft_'
$inventoryText = Get-ChildItem -LiteralPath $solutionRoot -Recurse -File | ForEach-Object {
    $_.FullName.Substring($solutionRoot.Length + 1)
}
if (($inventoryText -join "`n") -match $forbidden) {
    throw "The unpacked solution inventory contains an excluded add-in component."
}

if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
& pac solution pack --zipfile $output --folder $solutionRoot --packagetype Unmanaged --errorlevel Error
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output)) {
    throw "PAC solution pack failed."
}

Write-Output "Built $output with Microsoft Power Platform CLI."