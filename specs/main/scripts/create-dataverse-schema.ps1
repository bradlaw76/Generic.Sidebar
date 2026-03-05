<#
=============================================================================
COMPONENT:    Dataverse Schema – Create / Update Script
FILE:         specs\main\scripts\create-dataverse-schema.ps1
VERSION:      1.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-03-05
ENVIRONMENT:  PowerShell 7+ | PAC CLI authenticated

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Executes the dataverse-schema.md spec against a live Power Platform
environment.

  PHASE 1  PRE-FLIGHT REVIEW   — Reads live schema, reports what exists
                                  vs what's missing, and prompts to continue.
  PHASE 2  APPLY CHANGES       — Only creates/adds what the review found
                                  missing.
  PHASE 3  SAMPLE DATA         — Inserts demo profiles (skippable).

  Table 1  gensoft_genericsoftphone   — EXISTS.  Adds new columns if missing.
  Table 2  gensoft_demo_profile       — NEW.     Creates table + 7 columns.

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
  1. PAC CLI installed and on PATH
  2. Authenticated:  pac auth create --environment <url>
  3. Publisher prefix "gensoft" with option-value prefix already configured
     (the script uses the prefix but does NOT create the publisher)

-----------------------------------------------------------------------------
USAGE
-----------------------------------------------------------------------------
  .\create-dataverse-schema.ps1                       # interactive (review first)
  .\create-dataverse-schema.ps1 -EnvUrl <url>         # scripted
  .\create-dataverse-schema.ps1 -SkipSampleData       # schema only
  .\create-dataverse-schema.ps1 -ReviewOnly            # review, no changes
  .\create-dataverse-schema.ps1 -Force                 # skip confirmation prompt
  .\create-dataverse-schema.ps1 -SolutionName MyExistingSolution

=============================================================================
#>

[CmdletBinding()]
param(
    [string]$EnvUrl,
    [string]$SolutionName = 'GenericSoftphone',
    [string]$Token,
    [switch]$SkipSampleData,
    [switch]$ReviewOnly,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Resolve environment URL ────────────────────────────────────────────────
if (-not $EnvUrl) {
    $envJson = pac env who --json | ConvertFrom-Json
    $EnvUrl  = ($envJson.OrgUrl) -replace '/$', ''
    if (-not $EnvUrl) { throw "Could not resolve environment URL. Pass -EnvUrl or run pac auth create first." }
}
$EnvUrl = $EnvUrl.TrimEnd('/')
Write-Host "`n▸ Target environment: $EnvUrl" -ForegroundColor Cyan

# ── Auth token ─────────────────────────────────────────────────────────────
if (-not $Token) {
    Import-Module MSAL.PS -ErrorAction Stop
    $clientId = '51f81489-12ee-4a9e-aaae-a2591f45987d'
    Write-Host "  Acquiring token via MSAL (device code) …" -ForegroundColor DarkYellow
    Write-Host "  Open https://microsoft.com/devicelogin and enter the code shown below." -ForegroundColor DarkYellow
    $msalResult = Get-MsalToken -ClientId $clientId -TenantId 'organizations' -Scopes "$EnvUrl/.default" -DeviceCode
    $Token = $msalResult.AccessToken
}
if (-not $Token) { throw "Failed to acquire token. Pass -Token or sign in when prompted." }

$token = $Token
if (-not $token) { throw "Failed to acquire token. Pass -Token or sign in when prompted." }

$headers = @{
    Authorization  = "Bearer $token"
    'OData-MaxVersion' = '4.0'
    'OData-Version'    = '4.0'
    Accept             = 'application/json'
    'Content-Type'     = 'application/json; charset=utf-8'
    Prefer             = 'return=representation'
}

$api = "$EnvUrl/api/data/v9.2"

# ── Helper: Invoke-Dv ──────────────────────────────────────────────────────
function Invoke-Dv {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body
    )
    $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    try {
        Invoke-RestMethod @params
    } catch {
        $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        $msg = if ($err -and $err.error -and $err.error.message) { $err.error.message } else { $_.Exception.Message }
        Write-Warning "  ✗ $Method $Uri → $msg"
        return $null
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — PRE-FLIGHT REVIEW
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ PHASE 1: PRE-FLIGHT SCHEMA REVIEW ═══" -ForegroundColor Magenta

# ── Define expected schema ─────────────────────────────────────────────────
$expectedTable1Cols = @(
    # Columns we expect to ALREADY exist on gensoft_genericsoftphone
    'gensoft_name', 'gensoft_queuename', 'gensoft_defaultsoftphoneconfig',
    'gensoft_popmode', 'gensoft_defaultcasetitle', 'gensoft_transcriptenabled',
    'gensoft_transcripttext', 'gensoft_transcriptplaybackintervalseconds',
    'gensoft_ringtoneurl', 'gensoft_muteringtone'
)
$newTable1Cols = @(
    # Columns the spec says to ADD to gensoft_genericsoftphone
    'gensoft_outgoingringtoneurl', 'gensoft_phonewallpaperurl', 'gensoft_transcriptcompleted'
)
$allTable1Cols = $expectedTable1Cols + $newTable1Cols

$expectedTable2Cols = @(
    # All columns for the NEW gensoft_demo_profile table
    'gensoft_name', 'gensoft_contactname', 'gensoft_queuename',
    'gensoft_defaultcasetitle', 'gensoft_transcriptenabled',
    'gensoft_transcripttext', 'gensoft_transcriptplaybackintervalseconds'
)

# ── Helper: Get table column names ────────────────────────────────────────
function Get-TableColumns {
    param([string]$LogicalName)
    $uri = "$api/EntityDefinitions(LogicalName='$LogicalName')/Attributes?`$select=LogicalName&`$filter=IsCustomAttribute eq true"
    $result = Invoke-Dv -Method GET -Uri $uri
    if ($result -and $result.value) { return $result.value | ForEach-Object { $_.LogicalName } }
    return @()
}

# ── Check Table 1 ─────────────────────────────────────────────────────────
Write-Host "`n── Table 1: gensoft_genericsoftphone ──" -ForegroundColor Yellow
$t1Meta = Invoke-Dv -Method GET -Uri "$api/EntityDefinitions(LogicalName='gensoft_genericsoftphone')?`$select=LogicalName,DisplayName"
$t1Exists = $null -ne $t1Meta

if ($t1Exists) {
    Write-Host "  Table exists: ✓" -ForegroundColor Green
    $t1LiveCols = Get-TableColumns -LogicalName 'gensoft_genericsoftphone'

    # Report existing columns
    $t1Found    = @()
    $t1Missing  = @()
    foreach ($col in $allTable1Cols) {
        if ($t1LiveCols -contains $col) { $t1Found += $col } else { $t1Missing += $col }
    }

    Write-Host "  Columns found ($($t1Found.Count)):" -ForegroundColor Cyan
    foreach ($c in $t1Found) {
        $tag = if ($newTable1Cols -contains $c) { " (spec: NEW)" } else { "" }
        Write-Host "    ✓ $c$tag" -ForegroundColor Gray
    }

    if ($t1Missing.Count -gt 0) {
        Write-Host "  Columns to ADD ($($t1Missing.Count)):" -ForegroundColor Yellow
        foreach ($c in $t1Missing) { Write-Host "    ○ $c" -ForegroundColor Yellow }
    } else {
        Write-Host "  All expected columns present — nothing to add." -ForegroundColor Green
    }

    # Check for unexpected custom columns (informational)
    $t1Extra = $t1LiveCols | Where-Object { $allTable1Cols -notcontains $_ }
    if ($t1Extra.Count -gt 0) {
        Write-Host "  Extra columns not in spec ($($t1Extra.Count)):" -ForegroundColor DarkGray
        foreach ($c in $t1Extra) { Write-Host "    ? $c" -ForegroundColor DarkGray }
    }
} else {
    Write-Host "  Table NOT FOUND — expected to exist." -ForegroundColor Red
    Write-Host "  ✗ Cannot proceed. Create gensoft_genericsoftphone first." -ForegroundColor Red
    exit 1
}

# ── Check Table 2 ─────────────────────────────────────────────────────────
Write-Host "`n── Table 2: gensoft_demo_profile ──" -ForegroundColor Yellow
$t2Meta = Invoke-Dv -Method GET -Uri "$api/EntityDefinitions(LogicalName='gensoft_demo_profile')?`$select=LogicalName,DisplayName"
$t2Exists = $null -ne $t2Meta

if ($t2Exists) {
    Write-Host "  Table exists: ✓ (already created)" -ForegroundColor Green
    $t2LiveCols = Get-TableColumns -LogicalName 'gensoft_demo_profile'

    $t2Found   = @()
    $t2Missing = @()
    foreach ($col in $expectedTable2Cols) {
        if ($t2LiveCols -contains $col) { $t2Found += $col } else { $t2Missing += $col }
    }

    Write-Host "  Columns found ($($t2Found.Count)):" -ForegroundColor Cyan
    foreach ($c in $t2Found) { Write-Host "    ✓ $c" -ForegroundColor Gray }

    if ($t2Missing.Count -gt 0) {
        Write-Host "  Columns to ADD ($($t2Missing.Count)):" -ForegroundColor Yellow
        foreach ($c in $t2Missing) { Write-Host "    ○ $c" -ForegroundColor Yellow }
    } else {
        Write-Host "  All expected columns present." -ForegroundColor Green
    }
} else {
    Write-Host "  Table does NOT exist → will be CREATED" -ForegroundColor Yellow
    $t2Missing = $expectedTable2Cols   # all columns needed
}

# ── Check Solution ─────────────────────────────────────────────────────────
Write-Host "`n── Solution: $SolutionName ──" -ForegroundColor Yellow
$solCheck = Invoke-Dv -Method GET -Uri "$api/solutions?`$filter=uniquename eq '$SolutionName'&`$select=solutionid,version"
$solExists = ($solCheck -and $solCheck.value -and $solCheck.value.Count -gt 0)
if ($solExists) {
    Write-Host "  Solution exists: ✓  (v$($solCheck.value[0].version))" -ForegroundColor Green
} else {
    Write-Host "  Solution does NOT exist → will be CREATED" -ForegroundColor Yellow
}

# ── Check existing sample data ─────────────────────────────────────────────
if (-not $SkipSampleData -and $t2Exists) {
    Write-Host "`n── Sample Data: gensoft_demo_profile ──" -ForegroundColor Yellow
    $existingProfiles = Invoke-Dv -Method GET -Uri "$api/gensoft_demo_profiles?`$select=gensoft_name&`$top=50"
    if ($existingProfiles -and $existingProfiles.value.Count -gt 0) {
        Write-Host "  Existing profiles ($($existingProfiles.value.Count)):" -ForegroundColor Cyan
        foreach ($p in $existingProfiles.value) { Write-Host "    • $($p.gensoft_name)" -ForegroundColor Gray }
        Write-Host "  Note: Script will add profiles without deduplication." -ForegroundColor DarkYellow
    } else {
        Write-Host "  No existing profiles — 3 will be created." -ForegroundColor Yellow
    }
}

# ── Summary ────────────────────────────────────────────────────────────────
$changeCount = $t1Missing.Count + $(if ($t2Exists) { $t2Missing.Count } else { 1 + $expectedTable2Cols.Count }) + $(if (-not $solExists) { 1 } else { 0 })

Write-Host "`n─────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "  REVIEW SUMMARY" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "  Table 1 (gensoft_genericsoftphone): $($t1Missing.Count) column(s) to add"
Write-Host "  Table 2 (gensoft_demo_profile):     $(if ($t2Exists) { "$($t2Missing.Count) column(s) to add" } else { 'CREATE table + columns' })"
Write-Host "  Solution ($SolutionName):$(if ($solExists) { '  exists (v' + $solCheck.value[0].version + ')' } else { '  CREATE' })"
Write-Host "  Sample data:                        $(if ($SkipSampleData) { 'skip' } else { '3 demo profiles' })"
Write-Host "─────────────────────────────────────────" -ForegroundColor Cyan

if ($ReviewOnly) {
    Write-Host "`n▸ -ReviewOnly specified. No changes made.`n" -ForegroundColor Green
    exit 0
}

if ($changeCount -eq 0 -and $SkipSampleData) {
    Write-Host "`n▸ Nothing to change — schema is up to date.`n" -ForegroundColor Green
    exit 0
}

# ── Prompt to proceed ─────────────────────────────────────────────────────
if (-not $Force) {
    $answer = Read-Host "`nProceed with changes? (Y/n)"
    if ($answer -and $answer -notin @('y','Y','yes','Yes','YES','')) {
        Write-Host "Aborted.`n" -ForegroundColor Red
        exit 0
    }
}

Write-Host "`n═══ PHASE 2: APPLY SCHEMA CHANGES ═══" -ForegroundColor Magenta

# ═══════════════════════════════════════════════════════════════════════════
# TABLE 1 — gensoft_genericsoftphone  (EXISTS — add missing columns only)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n━━ Table 1: gensoft_genericsoftphone (add columns) ━━" -ForegroundColor Yellow

# Column: gensoft_outgoingringtoneurl  — Single line of text (500)
if ($t1Missing -contains 'gensoft_outgoingringtoneurl') {
Write-Host "  Adding gensoft_outgoingringtoneurl …" -NoNewline
$body = @{
    '@odata.type'          = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName             = 'gensoft_outgoingringtoneurl'
    DisplayName            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Outgoing Ringtone URL'; LanguageCode = 1033 }) }
    Description            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'URL to an audio file played on outgoing calls.'; LanguageCode = 1033 }) }
    RequiredLevel          = @{ Value = 'None' }
    MaxLength              = 500
    FormatName             = @{ Value = 'Url' }
}
$r = Invoke-Dv -Method POST -Uri "$api/EntityDefinitions(LogicalName='gensoft_genericsoftphone')/Attributes" -Body $body
Write-Host $(if ($r) { " ✓" } else { " (skipped or exists)" })
} else { Write-Host "  gensoft_outgoingringtoneurl — already exists, skipping." -ForegroundColor DarkGray }

# Column: gensoft_phonewallpaperurl  — Single line of text (500)
if ($t1Missing -contains 'gensoft_phonewallpaperurl') {
Write-Host "  Adding gensoft_phonewallpaperurl …" -NoNewline
$body = @{
    '@odata.type'          = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName             = 'gensoft_phonewallpaperurl'
    DisplayName            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Phone Wallpaper URL'; LanguageCode = 1033 }) }
    Description            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'URL to an image used as the phone home screen wallpaper.'; LanguageCode = 1033 }) }
    RequiredLevel          = @{ Value = 'None' }
    MaxLength              = 500
    FormatName             = @{ Value = 'Url' }
}
$r = Invoke-Dv -Method POST -Uri "$api/EntityDefinitions(LogicalName='gensoft_genericsoftphone')/Attributes" -Body $body
Write-Host $(if ($r) { " ✓" } else { " (skipped or exists)" })
} else { Write-Host "  gensoft_phonewallpaperurl — already exists, skipping." -ForegroundColor DarkGray }

# Column: gensoft_transcriptcompleted  — Yes/No (default No)
if ($t1Missing -contains 'gensoft_transcriptcompleted') {
Write-Host "  Adding gensoft_transcriptcompleted …" -NoNewline
$body = @{
    '@odata.type'          = 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata'
    SchemaName             = 'gensoft_transcriptcompleted'
    DisplayName            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Transcript Completed'; LanguageCode = 1033 }) }
    Description            = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Set to Yes by the softphone when transcript playback finishes.'; LanguageCode = 1033 }) }
    RequiredLevel          = @{ Value = 'None' }
    DefaultValue           = $false
    OptionSet              = @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata'
        TrueOption    = @{ Value = 1; Label = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Yes'; LanguageCode = 1033 }) } }
        FalseOption   = @{ Value = 0; Label = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'No'; LanguageCode = 1033 }) } }
    }
}
$r = Invoke-Dv -Method POST -Uri "$api/EntityDefinitions(LogicalName='gensoft_genericsoftphone')/Attributes" -Body $body
Write-Host $(if ($r) { " ✓" } else { " (skipped or exists)" })
} else { Write-Host "  gensoft_transcriptcompleted — already exists, skipping." -ForegroundColor DarkGray }

# Publish Table 1
Write-Host "  Publishing gensoft_genericsoftphone …" -NoNewline
Invoke-Dv -Method POST -Uri "$api/PublishXml" -Body @{
    ParameterXml = '<importexportxml><entities><entity>gensoft_genericsoftphone</entity></entities></importexportxml>'
} | Out-Null
Write-Host " ✓"

# ═══════════════════════════════════════════════════════════════════════════
# TABLE 2 — gensoft_demo_profile  (NEW — create table + columns)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n━━ Table 2: gensoft_demo_profile (create) ━━" -ForegroundColor Yellow

if (-not $t2Exists) {
Write-Host "  Creating table …" -NoNewline
$tableBody = @{
    '@odata.type'       = 'Microsoft.Dynamics.CRM.EntityMetadata'
    SchemaName          = 'gensoft_demo_profile'
    DisplayName         = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Generic Softphone Demo Profile'; LanguageCode = 1033 }) }
    DisplayCollectionName = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Generic Softphone Demo Profiles'; LanguageCode = 1033 }) }
    Description         = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Named demo scenario shown in the demo control panel (CTRL+SHIFT+D).'; LanguageCode = 1033 }) }
    OwnershipType       = 'UserOwned'
    IsActivity          = $false
    HasNotes            = $false
    HasActivities       = $false
    PrimaryNameAttribute = 'gensoft_name'
    Attributes          = @(
        @{
            '@odata.type'  = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
            SchemaName     = 'gensoft_name'
            DisplayName    = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Name'; LanguageCode = 1033 }) }
            Description    = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Human-readable name shown in the demo profile dropdown.'; LanguageCode = 1033 }) }
            IsPrimaryName  = $true
            RequiredLevel  = @{ Value = 'ApplicationRequired' }
            MaxLength      = 100
            FormatName     = @{ Value = 'Text' }
        }
    )
}
$r = Invoke-Dv -Method POST -Uri "$api/EntityDefinitions" -Body $tableBody
Write-Host $(if ($r) { " ✓" } else { " (may already exist)" })
} else {
    Write-Host "  Table already exists — skipping creation." -ForegroundColor DarkGray
}

# ── Additional columns for Table 2 (only add missing ones) ────────────────
$t2Cols = @(
    @{
        SchemaName  = 'gensoft_contactname'
        Label       = 'Contact Name'
        Desc        = 'Fuzzy-matched against Contact records.'
        Type        = 'String'; MaxLen = 100
    },
    @{
        SchemaName  = 'gensoft_queuename'
        Label       = 'Queue Name'
        Desc        = 'Overrides the config queue name for this scenario.'
        Type        = 'String'; MaxLen = 100
    },
    @{
        SchemaName  = 'gensoft_defaultcasetitle'
        Label       = 'Default Case Title'
        Desc        = 'Overrides the config case title for this scenario.'
        Type        = 'String'; MaxLen = 200
    },
    @{
        SchemaName  = 'gensoft_transcriptenabled'
        Label       = 'Transcript Enabled'
        Desc        = 'Whether transcript is shown for this scenario.'
        Type        = 'Boolean'; Default = $true
    },
    @{
        SchemaName  = 'gensoft_transcripttext'
        Label       = 'Transcript Text'
        Desc        = 'Scripted conversation for this demo scenario.'
        Type        = 'Memo'; MaxLen = 10000
    },
    @{
        SchemaName  = 'gensoft_transcriptplaybackintervalseconds'
        Label       = 'Transcript Interval (Seconds)'
        Desc        = 'Seconds between each line appearing.'
        Type        = 'Integer'; Default = 3
    }
)

foreach ($col in $t2Cols) {
    if ($t2Missing -notcontains $col.SchemaName) {
        Write-Host "  $($col.SchemaName) — already exists, skipping." -ForegroundColor DarkGray
        continue
    }
    Write-Host "  Adding $($col.SchemaName) …" -NoNewline
    $lblObj  = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $col.Label; LanguageCode = 1033 }) }
    $descObj = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $col.Desc;  LanguageCode = 1033 }) }

    switch ($col.Type) {
        'String' {
            $body = @{
                '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
                SchemaName    = $col.SchemaName
                DisplayName   = $lblObj
                Description   = $descObj
                RequiredLevel = @{ Value = 'None' }
                MaxLength     = $col.MaxLen
                FormatName    = @{ Value = 'Text' }
            }
        }
        'Memo' {
            $body = @{
                '@odata.type' = 'Microsoft.Dynamics.CRM.MemoAttributeMetadata'
                SchemaName    = $col.SchemaName
                DisplayName   = $lblObj
                Description   = $descObj
                RequiredLevel = @{ Value = 'None' }
                MaxLength     = $col.MaxLen
                Format        = 'Text'
            }
        }
        'Boolean' {
            $body = @{
                '@odata.type' = 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata'
                SchemaName    = $col.SchemaName
                DisplayName   = $lblObj
                Description   = $descObj
                RequiredLevel = @{ Value = 'None' }
                DefaultValue  = $col.Default
                OptionSet     = @{
                    '@odata.type' = 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata'
                    TrueOption    = @{ Value = 1; Label = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'Yes'; LanguageCode = 1033 }) } }
                    FalseOption   = @{ Value = 0; Label = @{ '@odata.type' = 'Microsoft.Dynamics.CRM.Label'; LocalizedLabels = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = 'No'; LanguageCode = 1033 }) } }
                }
            }
        }
        'Integer' {
            $body = @{
                '@odata.type' = 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata'
                SchemaName    = $col.SchemaName
                DisplayName   = $lblObj
                Description   = $descObj
                RequiredLevel = @{ Value = 'None' }
                MinValue      = 0
                MaxValue      = 300
                Format        = 'None'
            }
        }
    }

    $r = Invoke-Dv -Method POST -Uri "$api/EntityDefinitions(LogicalName='gensoft_demo_profile')/Attributes" -Body $body
    Write-Host $(if ($r) { " ✓" } else { " (skipped or exists)" })
}

# Publish Table 2
Write-Host "  Publishing gensoft_demo_profile …" -NoNewline
Invoke-Dv -Method POST -Uri "$api/PublishXml" -Body @{
    ParameterXml = '<importexportxml><entities><entity>gensoft_demo_profile</entity></entities></importexportxml>'
} | Out-Null
Write-Host " ✓"

# ═══════════════════════════════════════════════════════════════════════════
# ADD BOTH TABLES TO SOLUTION: GenericSoftphone
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n━━ Solution: $SolutionName ━━" -ForegroundColor Yellow

# Ensure solution exists (using review result)
if (-not $solExists) {
    Write-Host "  Creating solution …" -NoNewline
    # Look up default publisher
    $pub = Invoke-Dv -Method GET -Uri "$api/publishers?`$filter=customizationprefix eq 'gensoft'&`$select=publisherid"
    if ($pub.value.Count -eq 0) { throw "Publisher with prefix 'gensoft' not found. Create it first." }
    $pubId = $pub.value[0].publisherid

    Invoke-Dv -Method POST -Uri "$api/solutions" -Body @{
        uniquename     = $SolutionName
        friendlyname   = 'Generic Softphone'
        version        = '1.0.0.0'
        'publisherid@odata.bind' = "/publishers($pubId)"
    } | Out-Null
    Write-Host " ✓"
} else {
    Write-Host "  Solution exists — adding components to it." -ForegroundColor Green
}

foreach ($tbl in @('gensoft_genericsoftphone', 'gensoft_demo_profile')) {
    Write-Host "  Adding $tbl to $SolutionName …" -NoNewline
    $meta = Invoke-Dv -Method GET -Uri "$api/EntityDefinitions(LogicalName='$tbl')?`$select=MetadataId"
    if (-not $meta) { Write-Host " (table not found, skipping)"; continue }
    Invoke-Dv -Method POST -Uri "$api/AddSolutionComponent" -Body @{
        ComponentId       = $meta.MetadataId
        ComponentType     = 1   # Entity
        SolutionUniqueName = $SolutionName
        AddRequiredComponents = $false
    } | Out-Null
    Write-Host " ✓"
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — SAMPLE DATA
# ═══════════════════════════════════════════════════════════════════════════
if ($SkipSampleData) {
    Write-Host "`n▸ -SkipSampleData specified, done." -ForegroundColor Green
    exit 0
}

Write-Host "`n━━ Sample Data: Demo Profiles ━━" -ForegroundColor Yellow

$profiles = @(
    @{
        gensoft_name                              = 'FDA Safety Recall'
        gensoft_contactname                       = 'Sarah Johnson'
        gensoft_queuename                         = 'Safety Recall'
        gensoft_defaultcasetitle                   = 'Product Safety Recall'
        gensoft_transcriptenabled                  = $true
        gensoft_transcriptplaybackintervalseconds  = 3
        gensoft_transcripttext                     = @"
Customer: hi - i have this robitussin cough medicine. i saw something about a recall.

Agent: Active recalls have been issued for certain Robitussin Honey CF Max products due to microbial contamination.

Customer: mine is the childrens version.

Agent: A recall was issued for certain lots of Children's Robitussin Honey Cough and Chest Congestion DM due to incorrect dosing cups.

Customer: my dosing cup is missing the marks. can i still use the medicine?

Agent: If your dosing cup is missing the markings, do not use it to measure the medication. Please contact the manufacturer for a replacement or consult a pharmacist for safe dosing instructions.
"@
    },
    @{
        gensoft_name                              = 'Veteran Benefits'
        gensoft_contactname                       = 'Robert Martinez'
        gensoft_queuename                         = 'Benefits'
        gensoft_defaultcasetitle                   = 'Veterans Benefits Inquiry'
        gensoft_transcriptenabled                  = $true
        gensoft_transcriptplaybackintervalseconds  = 3
        gensoft_transcripttext                     = @"
Customer: hello i am checking the status of my disability claim.

Agent: I can help with that. May I confirm your name and date of birth?

Customer: yes it is robert martinez.

Agent: Thank you. I see your claim is currently in evidence review.

Customer: how long will that take?

Agent: Evidence review typically takes several weeks depending on documentation received.
"@
    },
    @{
        gensoft_name                              = 'Insurance Inquiry'
        gensoft_contactname                       = 'Jamie Carter'
        gensoft_queuename                         = 'Insurance'
        gensoft_defaultcasetitle                   = 'Insurance Coverage Question'
        gensoft_transcriptenabled                  = $true
        gensoft_transcriptplaybackintervalseconds  = 3
        gensoft_transcripttext                     = @"
Customer: hi i want to confirm if my medication is covered.

Agent: I can help with that. Can you provide the medication name?

Customer: it is robaxin.

Agent: Let me check your policy. Yes, that medication is covered under your plan.
"@
    }
)

foreach ($p in $profiles) {
    Write-Host "  Creating profile: $($p.gensoft_name) …" -NoNewline
    $r = Invoke-Dv -Method POST -Uri "$api/gensoft_demo_profiles" -Body $p
    Write-Host $(if ($r) { " ✓" } else { " (may already exist)" })
}

# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n✓ Schema deployment complete.`n" -ForegroundColor Green
