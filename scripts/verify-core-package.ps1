<#
=============================================================================
COMPONENT:    Generic Sidebar Core Package Verifier
FILE:         scripts/verify-core-package.ps1
VERSION:      1.3.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-05
ENVIRONMENT:  PowerShell | ZIP

OVERVIEW
-----------------------------------------------------------------------------
Extracts the generated package to a temporary directory, validates Core-only
inventory and solution metadata, compares text with normalized line endings,
compares binary resources byte-for-byte, and emits hashes.

CHANGELOG
-----------------------------------------------------------------------------
v1.3.0  2026-09-05  Normalize text line endings while preserving exact binary checks
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

function Test-BytePrefix([byte[]]$Bytes, [byte[]]$Prefix) {
    if ($Bytes.Length -lt $Prefix.Length) { return $false }
    for ($index = 0; $index -lt $Prefix.Length; $index++) {
        if ($Bytes[$index] -ne $Prefix[$index]) { return $false }
    }
    return $true
}

function Get-NormalizedText([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $offset = 0
    if (Test-BytePrefix $bytes ([byte[]](0xFF, 0xFE, 0x00, 0x00))) {
        $encodingName = "utf-32-le-bom"
        $encoding = [Text.UTF32Encoding]::new($false, $true, $true)
        $offset = 4
    }
    elseif (Test-BytePrefix $bytes ([byte[]](0x00, 0x00, 0xFE, 0xFF))) {
        $encodingName = "utf-32-be-bom"
        $encoding = [Text.UTF32Encoding]::new($true, $true, $true)
        $offset = 4
    }
    elseif (Test-BytePrefix $bytes ([byte[]](0xEF, 0xBB, 0xBF))) {
        $encodingName = "utf-8-bom"
        $encoding = [Text.UTF8Encoding]::new($false, $true)
        $offset = 3
    }
    elseif (Test-BytePrefix $bytes ([byte[]](0xFF, 0xFE))) {
        $encodingName = "utf-16-le-bom"
        $encoding = [Text.UnicodeEncoding]::new($false, $true, $true)
        $offset = 2
    }
    elseif (Test-BytePrefix $bytes ([byte[]](0xFE, 0xFF))) {
        $encodingName = "utf-16-be-bom"
        $encoding = [Text.UnicodeEncoding]::new($true, $true, $true)
        $offset = 2
    }
    else {
        $encodingName = "utf-8"
        $encoding = [Text.UTF8Encoding]::new($false, $true)
    }

    try {
        $content = $encoding.GetString($bytes, $offset, $bytes.Length - $offset)
    }
    catch {
        throw "Text resource is not valid $encodingName`: $Path"
    }

    [pscustomobject]@{
        Encoding = $encodingName
        Content = $content.Replace("`r`n", "`n").Replace("`r", "`n")
    }
}

function Get-StringHash([string]$Content) {
    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($Content)
        return [BitConverter]::ToString($sha256.ComputeHash($bytes)).Replace("-", "")
    }
    finally {
        $sha256.Dispose()
    }
}

function Compare-Resource([string]$SourcePath, [string]$PackagedPath) {
    $textExtensions = @(".css", ".htm", ".html", ".js", ".json", ".md", ".markdown", ".mjs", ".cjs", ".txt", ".xml")
    $extension = [IO.Path]::GetExtension($SourcePath)
    if ($textExtensions -contains $extension.ToLowerInvariant()) {
        $source = Get-NormalizedText $SourcePath
        $packaged = Get-NormalizedText $PackagedPath
        if ($source.Encoding -cne $packaged.Encoding) {
            throw "Packaged resource encoding does not match canonical source: $SourcePath"
        }
        if ($source.Content -cne $packaged.Content) {
            throw "Packaged text does not match canonical source after line-ending normalization: $SourcePath"
        }
        return [pscustomobject]@{
            Mode = "NormalizedText"
            SourceHash = Get-StringHash $source.Content
            PackagedHash = Get-StringHash $packaged.Content
        }
    }

    $sourceHash = Get-RawFileHash $SourcePath
    $packagedHash = Get-RawFileHash $PackagedPath
    if ($sourceHash -cne $packagedHash) {
        throw "Packaged binary does not match canonical source: $SourcePath"
    }
    return [pscustomobject]@{
        Mode = "ExactBytes"
        SourceHash = $sourceHash
        PackagedHash = $packagedHash
    }
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

    $htmlComparison = Compare-Resource $sourceHtml $packagedHtml.FullName
    $javaScriptComparison = Compare-Resource $sourceJavaScript $packagedJavaScript.FullName
    $packageHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $package).Hash

    [pscustomobject]@{
        SolutionName = $manifest.UniqueName
        SolutionVersion = $manifest.Version
        Managed = $manifest.Managed
        Inventory = $entries
        HtmlComparisonMode = $htmlComparison.Mode
        JavaScriptComparisonMode = $javaScriptComparison.Mode
        SourceHtmlSha256 = $htmlComparison.SourceHash
        SourceJavaScriptSha256 = $javaScriptComparison.SourceHash
        PackagedHtmlSha256 = $htmlComparison.PackagedHash
        PackagedJavaScriptSha256 = $javaScriptComparison.PackagedHash
        PackageSha256 = $packageHash
    } | ConvertTo-Json -Depth 4
}
finally {
    if (Test-Path -LiteralPath $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
}