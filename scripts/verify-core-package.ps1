<#
=============================================================================
COMPONENT:    Generic Sidebar Core Package Verifier
FILE:         scripts/verify-core-package.ps1
VERSION:      1.2.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-04
ENVIRONMENT:  PowerShell | ZIP

OVERVIEW
-----------------------------------------------------------------------------
Extracts the generated package to a temporary directory, validates Core-only
inventory and solution metadata, proves byte-for-byte runtime identity, and emits hashes.

CHANGELOG
-----------------------------------------------------------------------------
v1.2.0  2026-09-04  Verify solution 1.0.0.7 and raw runtime bytes
v1.1.0  2026-08-30  Normalize runtime line endings before identity comparison
v1.0.0  2026-08-28  Added Core package identity and inventory verification
=============================================================================
#>
[CmdletBinding()]
param([string]$PackagePath = "GenericSidebar_1_0_0_7.zip")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$package = if ([IO.Path]::IsPathRooted($PackagePath)) { $PackagePath } else { Join-Path $root $PackagePath }
$sourceHtml = Join-Path $root "web resources/sidebar_sidebar.html"
$sourceJavaScript = Join-Path $root "web resources/sidebar_sidebar.js"
$extractRoot = Join-Path ([IO.Path]::GetTempPath()) ("GenericSidebar-verify-" + [guid]::NewGuid().ToString("N"))

if (-not (Test-Path -LiteralPath $package)) { throw "Package not found: $package" }

function Get-RawFileHash([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

try {
    Expand-Archive -LiteralPath $package -DestinationPath $extractRoot
    [xml]$solutionXml = Get-Content -Raw -LiteralPath (Join-Path $extractRoot "solution.xml")
    $manifest = $solutionXml.ImportExportXml.SolutionManifest
    if ($manifest.UniqueName -ne "GenericSidebar") { throw "Unexpected solution name: $($manifest.UniqueName)" }
    if ($manifest.Version -ne "1.0.0.7") { throw "Unexpected solution version: $($manifest.Version)" }
    if ($manifest.Managed -ne "0") { throw "Generated package must be unmanaged." }

    $entries = Get-ChildItem -LiteralPath $extractRoot -Recurse -File | ForEach-Object {
        $_.FullName.Substring($extractRoot.Length + 1).Replace('\', '/')
    } | Sort-Object
    $forbidden = 'Android|Genesys|ACS|SSO|GenericSoftphone|gensoft_'
    if (($entries -join "`n") -match $forbidden) { throw "Package inventory contains an excluded add-in component." }

    $packagedHtmlMatches = @(Get-ChildItem -LiteralPath (Join-Path $extractRoot "WebResources") -File |
        Where-Object Name -like 'sidebar_sidebarhtml*')
    $packagedJavaScriptMatches = @(Get-ChildItem -LiteralPath (Join-Path $extractRoot "WebResources") -File |
        Where-Object Name -like 'sidebar_sidebarjs*')
    if ($packagedHtmlMatches.Count -ne 1 -or $packagedJavaScriptMatches.Count -ne 1) {
        throw "Expected exactly one canonical HTML and JavaScript package member."
    }
    $packagedHtml = $packagedHtmlMatches[0]
    $packagedJavaScript = $packagedJavaScriptMatches[0]

    $sourceHtmlHash = Get-RawFileHash $sourceHtml
    $sourceJavaScriptHash = Get-RawFileHash $sourceJavaScript
    $packagedHtmlHash = Get-RawFileHash $packagedHtml.FullName
    $packagedJavaScriptHash = Get-RawFileHash $packagedJavaScript.FullName
    $packageHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $package).Hash
    if ($sourceHtmlHash -ne $packagedHtmlHash) { throw "Packaged HTML does not match canonical source." }
    if ($sourceJavaScriptHash -ne $packagedJavaScriptHash) { throw "Packaged JavaScript does not match canonical source." }

    [pscustomobject]@{
        SolutionName = $manifest.UniqueName
        SolutionVersion = $manifest.Version
        Managed = $manifest.Managed
        Inventory = $entries
        SourceHtmlSha256 = $sourceHtmlHash
        SourceJavaScriptSha256 = $sourceJavaScriptHash
        PackagedHtmlSha256 = $packagedHtmlHash
        PackagedJavaScriptSha256 = $packagedJavaScriptHash
        PackageSha256 = $packageHash
    } | ConvertTo-Json -Depth 4
}
finally {
    if (Test-Path -LiteralPath $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
}