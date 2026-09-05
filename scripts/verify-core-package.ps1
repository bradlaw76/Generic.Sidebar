<#
=============================================================================
COMPONENT:    Generic Sidebar Core Package Verifier
FILE:         scripts/verify-core-package.ps1
VERSION:      1.4.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-09-05
ENVIRONMENT:  PowerShell | ZIP

OVERVIEW
-----------------------------------------------------------------------------
Extracts the generated package to a temporary directory, validates Core-only
inventory and solution metadata, and verifies every metadata-mapped resource.

CHANGELOG
-----------------------------------------------------------------------------
v1.4.0  2026-09-05  Verify every mapped text and binary web resource
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
$solutionWebResources = Join-Path $root "solution/GenericSidebar/WebResources"
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

function Compare-Resource([string]$SourcePath, [string]$TargetPath, [bool]$IsText, [string]$TargetLabel) {
    $textExtensions = @(".css", ".htm", ".html", ".js", ".json", ".md", ".markdown", ".mjs", ".cjs", ".txt", ".xml")
    $extension = [IO.Path]::GetExtension($SourcePath)
    if ($IsText -or $textExtensions -contains $extension.ToLowerInvariant()) {
        $source = Get-NormalizedText $SourcePath
        $target = Get-NormalizedText $TargetPath
        if ($source.Encoding -cne $target.Encoding) {
            throw "$TargetLabel resource encoding does not match source: $SourcePath"
        }
        if ($source.Content -cne $target.Content) {
            throw "$TargetLabel text does not match source after line-ending normalization: $SourcePath"
        }
        return [pscustomobject]@{
            Mode = "NormalizedText"
            SourceHash = Get-StringHash $source.Content
            TargetHash = Get-StringHash $target.Content
        }
    }

    $sourceHash = Get-RawFileHash $SourcePath
    $targetHash = Get-RawFileHash $TargetPath
    if ($sourceHash -cne $targetHash) {
        throw "$TargetLabel binary does not match source byte-for-byte: $SourcePath"
    }
    return [pscustomobject]@{
        Mode = "ExactBytes"
        SourceHash = $sourceHash
        TargetHash = $targetHash
    }
}

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($package)
    try {
        $archiveEntries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    }
    finally {
        $archive.Dispose()
    }
    $duplicateEntries = @($archiveEntries | Group-Object -CaseSensitive | Where-Object Count -gt 1)
    if ($duplicateEntries.Count) {
        throw "Package contains duplicate entries: $($duplicateEntries.Name -join ', ')"
    }

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

    $metadataFiles = @(Get-ChildItem -LiteralPath $solutionWebResources -File -Filter '*.data.xml')
    if (-not $metadataFiles.Count) { throw "No web-resource mappings found in $solutionWebResources" }
    $mappings = foreach ($metadataFile in $metadataFiles) {
        [xml]$metadata = Get-Content -Raw -LiteralPath $metadataFile.FullName
        $resource = $metadata.WebResource
        $sourceName = $metadataFile.Name -replace '\.data\.xml$', ''
        $sourcePath = Join-Path $solutionWebResources $sourceName
        $entryName = ([string]$resource.FileName).TrimStart('/').Replace('\', '/')
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "Mapped source resource is missing: $sourcePath"
        }
        if (-not $entryName.StartsWith('WebResources/', [StringComparison]::Ordinal)) {
            throw "Mapped package resource has an unexpected path: $entryName"
        }
        [pscustomobject]@{
            Name = [string]$resource.Name
            SourceName = $sourceName
            SourcePath = $sourcePath
            EntryName = $entryName
            IsText = [int]$resource.WebResourceType -in 1, 2, 3, 4
        }
    }
    $duplicateMappings = @(
        $mappings | Group-Object -Property EntryName -CaseSensitive | Where-Object Count -gt 1
    )
    if ($duplicateMappings.Count) {
        throw "Duplicate web-resource mappings found: $($duplicateMappings.Name -join ', ')"
    }
    $mappedSourceNames = @($mappings.SourceName | Sort-Object -CaseSensitive)
    $unpackedSourceNames = @(
        Get-ChildItem -LiteralPath $solutionWebResources -File |
            Where-Object Name -notlike '*.data.xml' |
            ForEach-Object Name |
            Sort-Object -CaseSensitive
    )
    if (($mappedSourceNames -join "`n") -cne ($unpackedSourceNames -join "`n")) {
        throw "Unpacked web-resource inventory does not match metadata mappings."
    }
    $mappedEntries = @($mappings.EntryName | Sort-Object -CaseSensitive)
    $packagedWebResourceEntries = @(
        $archiveEntries | Where-Object { $_.StartsWith('WebResources/', [StringComparison]::Ordinal) } |
            Sort-Object -CaseSensitive
    )
    if (($mappedEntries -join "`n") -cne ($packagedWebResourceEntries -join "`n")) {
        throw "Packaged web-resource inventory does not match metadata mappings."
    }

    $canonicalSources = @{
        'sidebar_sidebar.html' = $sourceHtml
        'sidebar_sidebar.js' = $sourceJavaScript
    }
    $resourceComparisons = foreach ($mapping in $mappings) {
        if ($canonicalSources.ContainsKey($mapping.Name)) {
            $null = Compare-Resource $canonicalSources[$mapping.Name] $mapping.SourcePath $mapping.IsText "Unpacked"
        }
        $packagedPath = Join-Path $extractRoot $mapping.EntryName.Replace('/', [IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $packagedPath -PathType Leaf)) {
            throw "Mapped package resource is missing: $($mapping.EntryName)"
        }
        $comparison = Compare-Resource $mapping.SourcePath $packagedPath $mapping.IsText "Packaged"
        [pscustomobject]@{
            Name = $mapping.Name
            EntryName = $mapping.EntryName
            Mode = $comparison.Mode
            SourceHash = $comparison.SourceHash
            PackagedHash = $comparison.TargetHash
        }
    }
    $htmlComparison = $resourceComparisons | Where-Object Name -ceq 'sidebar_sidebar.html'
    $javaScriptComparison = $resourceComparisons | Where-Object Name -ceq 'sidebar_sidebar.js'
    $packageHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $package).Hash

    [pscustomobject]@{
        SolutionName = $manifest.UniqueName
        SolutionVersion = $manifest.Version
        Managed = $manifest.Managed
        Inventory = $entries
        ResourceComparisons = $resourceComparisons
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