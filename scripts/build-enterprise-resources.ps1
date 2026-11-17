<#
=============================================================================
COMPONENT:    Optional Enterprise Resource Bundle Builder
FILE:         scripts/build-enterprise-resources.ps1
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-11-17
ENVIRONMENT:  PowerShell 7 | Local ZIP tooling

OVERVIEW
-----------------------------------------------------------------------------
Builds and verifies an optional web-resource delivery bundle from the explicit
source inventory. This is NOT a Dataverse solution ZIP and must not be imported
as one. No authentication, schema execution, upload or deployment is performed.

CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-11-17  H007/H008 package exact optional resources and schema sources
=============================================================================
#>
[CmdletBinding()]
param([string]$OutputPath = "GenericSidebarEnterpriseResources_1_0_0.zip")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$inventoryPath = Join-Path $root "config\enterprise-resources.json"
$inventory = Get-Content -Raw -LiteralPath $inventoryPath | ConvertFrom-Json
$output = if ([IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $root $OutputPath }
$files = @(
    foreach ($resource in $inventory.resources) {
        if ($resource.name -notmatch '^[a-zA-Z0-9_.-]+$' -or $resource.type -notin 1, 3) {
            throw "Invalid resource name or type: $($resource.name)"
        }
        [pscustomobject]@{ Entry = "WebResources/$($resource.name)"; Source = $resource.source; Type = $resource.type }
    }
    foreach ($source in $inventory.schemaProvisioningSources) {
        [pscustomobject]@{ Entry = "schema/$source"; Source = $source; Type = $null }
    }
)
if (($files | Group-Object Entry -CaseSensitive | Where-Object Count -gt 1)) {
    throw "Duplicate optional resource bundle entries."
}
foreach ($file in $files) {
    $path = [IO.Path]::GetFullPath((Join-Path $root $file.Source.Replace('/', [IO.Path]::DirectorySeparatorChar)))
    if (-not $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing or out-of-scope optional bundle source: $($file.Source)"
    }
    $text = [IO.File]::ReadAllText($path).Replace("`r`n", "`n").Replace("`r", "`n")
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($text)
    $file | Add-Member -NotePropertyName Content -NotePropertyValue $bytes
    $file | Add-Member -NotePropertyName Sha256 -NotePropertyValue ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)))
}
$deployment = [ordered]@{
    format = "GenericSidebar.OptionalResourceDelivery"
    version = $inventory.version
    isDataverseSolution = $false
    contentMode = "UTF8WithoutBomWithNormalizedLineEndings"
    requiresCoreVersion = $inventory.coreSolutionVersion
    files = @($files | Select-Object Entry, Source, Type, Sha256)
    instructions = @(
        "Do not import this delivery ZIP as a Dataverse solution.",
        "In an authorized test environment, install the separate GenericSidebar Core candidate first.",
        "Review the schema scripts before an authorized administrator executes them using the approved identity.",
        "Upload each WebResources entry with its exact logical name and Type from this inventory.",
        "Configure parent SSO and linked-agent rows from environment settings; never store browser client secrets.",
        "Keep SSO and Agent Menu Tab disabled until all optional dependencies are installed.",
        "H009 hosted import, permissions, two/four-panel, linked-agent and real SSO acceptance remain required."
    )
}

if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
$archive = [IO.Compression.ZipFile]::Open($output, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $entry = $archive.CreateEntry($file.Entry)
        $stream = $entry.Open()
        try { $stream.Write($file.Content, 0, $file.Content.Length) } finally { $stream.Dispose() }
    }
    $entry = $archive.CreateEntry("deployment-inventory.json")
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write(($deployment | ConvertTo-Json -Depth 6)) } finally { $writer.Dispose() }
}
finally { $archive.Dispose() }

$archive = [IO.Compression.ZipFile]::OpenRead($output)
try {
    $expected = @($files.Entry) + "deployment-inventory.json"
    if ((@($archive.Entries.FullName | Sort-Object -CaseSensitive) -join "`n") -cne
        (@($expected | Sort-Object -CaseSensitive) -join "`n")) {
        throw "Optional delivery bundle inventory mismatch."
    }
    foreach ($file in $files) {
        $stream = $archive.GetEntry($file.Entry).Open()
        try { $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
        finally { $stream.Dispose() }
        if ($hash -cne $file.Sha256) { throw "Optional delivery bundle content mismatch: $($file.Entry)" }
    }
}
finally { $archive.Dispose() }

[pscustomobject]@{
    Bundle = $output
    Sha256 = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
    Resources = $inventory.resources.Count
    SchemaSources = $inventory.schemaProvisioningSources.Count
    IsDataverseSolution = $false
    LiveAcceptanceVerified = $false
} | ConvertTo-Json
