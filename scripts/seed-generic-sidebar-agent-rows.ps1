<#
=============================================================================
SCRIPT:       seed-generic-sidebar-agent-rows
FILE:         scripts\seed-generic-sidebar-agent-rows.ps1
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-07-23
ENVIRONMENT:  PowerShell 7+

OVERVIEW
Creates or updates child picker rows in sidebar_genericsidebaragent and
relates them to a parent sidebar_genericsidebar record.

NOTES
- Requires Azure CLI login with access to Dataverse.
- Upserts by (parent + sidebar_agentkey).
=============================================================================
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$OrgUrl,

    [Parameter(Mandatory = $false)]
    [string]$ParentConfigId,

    [Parameter(Mandatory = $false)]
    [string]$ParentTitle,

    [Parameter(Mandatory = $true)]
    [string]$DefaultTokenEndpoint,

    [Parameter(Mandatory = $false)]
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$api = "$OrgUrl/api/data/v9.2"
$parentLogicalName = "sidebar_genericsidebar"
$childLogicalName = "sidebar_genericsidebaragent"
$parentSet = $null
$childSet = $null
$parentBindProperty = $null

function Get-AuthHeaders {
    $token = az account get-access-token --resource $OrgUrl --query accessToken -o tsv
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Failed to acquire Dataverse token from Azure CLI. Run: az login"
    }
    return @{
        Authorization = "Bearer $token"
        Accept = "application/json"
        "Content-Type" = "application/json"
        "OData-MaxVersion" = "4.0"
        "OData-Version" = "4.0"
    }
}

function Escape-ODataString {
    param([string]$Value)
    return [string]$Value -replace "'", "''"
}

function Resolve-EntitySetName {
    param(
        $Headers,
        [string]$LogicalName
    )

    $url = "$api/EntityDefinitions(LogicalName='$LogicalName')?`$select=LogicalName,EntitySetName"
    $result = Invoke-RestMethod -Method Get -Uri $url -Headers $Headers
    if (-not $result.EntitySetName) {
        throw "Could not resolve EntitySetName for table $LogicalName"
    }
    return $result.EntitySetName
}

function Resolve-ParentLookupBindProperty {
    param(
        $Headers,
        [string]$ChildLogicalName,
        [string]$LookupAttributeLogicalName
    )

    $url = "$api/EntityDefinitions(LogicalName='$ChildLogicalName')/ManyToOneRelationships?`$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName&`$filter=ReferencingAttribute eq '$LookupAttributeLogicalName'"
    $result = Invoke-RestMethod -Method Get -Uri $url -Headers $Headers
    if ($result.value.Count -eq 0 -or -not $result.value[0].ReferencingEntityNavigationPropertyName) {
        throw "Could not resolve navigation property for $LookupAttributeLogicalName on $ChildLogicalName"
    }
    return $result.value[0].ReferencingEntityNavigationPropertyName
}

function Resolve-ParentConfigId {
    param($Headers)

    if ($ParentConfigId) {
        return ($ParentConfigId -replace '[{}]', '')
    }

    if ($ParentTitle) {
        $safeTitle = Escape-ODataString -Value $ParentTitle
        $url = "$api/${parentSet}?`$select=sidebar_genericsidebarid,sidebar_title&`$filter=sidebar_title eq '$safeTitle'&`$top=1"
        $result = Invoke-RestMethod -Method Get -Uri $url -Headers $Headers
        if ($result.value.Count -gt 0) {
            return $result.value[0].sidebar_genericsidebarid
        }
        throw "Could not find parent config by title: $ParentTitle"
    }

    try {
        $defaultUrl = "$api/${parentSet}?`$select=sidebar_genericsidebarid,sidebar_title&`$filter=sidebar_default eq true&`$top=1"
        $defaultResult = Invoke-RestMethod -Method Get -Uri $defaultUrl -Headers $Headers
        if ($defaultResult.value.Count -gt 0) {
            return $defaultResult.value[0].sidebar_genericsidebarid
        }
    }
    catch {
        Write-Host "WARN Could not query sidebar_default; falling back to latest record." -ForegroundColor Yellow
    }

    $latestUrl = "$api/${parentSet}?`$top=1"
    Write-Host "DEBUG latest parent query: $latestUrl" -ForegroundColor DarkGray
    $latestResult = Invoke-RestMethod -Method Get -Uri $latestUrl -Headers $Headers
    if ($latestResult.value.Count -gt 0) {
        if ($latestResult.value[0].sidebar_genericsidebarid) {
            return $latestResult.value[0].sidebar_genericsidebarid
        }

        $first = $latestResult.value[0]
        foreach ($property in $first.PSObject.Properties.Name) {
            if ($property -match 'sidebar_genericsidebarid$') {
                return $first.$property
            }
        }
    }

    throw "No parent sidebar_genericsidebar record found."
}

function Find-ChildByKey {
    param(
        $Headers,
        [string]$ParentId,
        [string]$AgentKey
    )

    $safeKey = Escape-ODataString -Value $AgentKey
    $url = "$api/${childSet}?`$select=sidebar_genericsidebaragentid,sidebar_agentkey&`$filter=_sidebar_genericsidebarid_value eq $ParentId and sidebar_agentkey eq '$safeKey'&`$top=1"
    $result = Invoke-RestMethod -Method Get -Uri $url -Headers $Headers
    if ($result.value.Count -gt 0) {
        return $result.value[0].sidebar_genericsidebaragentid
    }
    return $null
}

$rows = @(
    @{
        sidebar_agentkey = "miami-intercept-arrest"
        sidebar_name = "Miami Intercept and Arrest"
        sidebar_displayname = "Miami Intercept and Arrest"
        sidebar_description = "Individuals were intercepted and arrested in Miami and are now set to be extradited."
        sidebar_tokenendpoint = $DefaultTokenEndpoint
        sidebar_sortorder = 10
        sidebar_isactive = $true
        sidebar_isdefaultagent = $true
    },
    @{
        sidebar_agentkey = "extradition-status"
        sidebar_name = "Extradition Status"
        sidebar_displayname = "Extradition Status"
        sidebar_description = "Track extradition status, deadlines, and transfer readiness."
        sidebar_tokenendpoint = $DefaultTokenEndpoint
        sidebar_sortorder = 20
        sidebar_isactive = $true
        sidebar_isdefaultagent = $false
    },
    @{
        sidebar_agentkey = "custody-transfer-summary"
        sidebar_name = "Custody Transfer Summary"
        sidebar_displayname = "Custody Transfer Summary"
        sidebar_description = "Summarize custody handoffs and destination jurisdiction details."
        sidebar_tokenendpoint = $DefaultTokenEndpoint
        sidebar_sortorder = 30
        sidebar_isactive = $true
        sidebar_isdefaultagent = $false
    }
)

$headers = Get-AuthHeaders
$parentSet = Resolve-EntitySetName -Headers $headers -LogicalName $parentLogicalName
$childSet = Resolve-EntitySetName -Headers $headers -LogicalName $childLogicalName
$parentBindProperty = Resolve-ParentLookupBindProperty -Headers $headers -ChildLogicalName $childLogicalName -LookupAttributeLogicalName "sidebar_genericsidebarid"
$resolvedParentId = Resolve-ParentConfigId -Headers $headers

Write-Host "Parent entity set: $parentSet" -ForegroundColor Cyan
Write-Host "Child entity set:  $childSet" -ForegroundColor Cyan
Write-Host "Parent bind prop: $parentBindProperty" -ForegroundColor Cyan
Write-Host "Parent config id: $resolvedParentId" -ForegroundColor Cyan
Write-Host "Rows to process: $($rows.Count)" -ForegroundColor Cyan

foreach ($row in $rows) {
    $existingId = Find-ChildByKey -Headers $headers -ParentId $resolvedParentId -AgentKey $row.sidebar_agentkey

    $payload = @{
        sidebar_agentkey = $row.sidebar_agentkey
        sidebar_name = $row.sidebar_name
        sidebar_displayname = $row.sidebar_displayname
        sidebar_description = $row.sidebar_description
        sidebar_tokenendpoint = $row.sidebar_tokenendpoint
        sidebar_sortorder = $row.sidebar_sortorder
        sidebar_isactive = $row.sidebar_isactive
        sidebar_isdefaultagent = $row.sidebar_isdefaultagent
    }
    $payload["$parentBindProperty@odata.bind"] = "/$parentSet($resolvedParentId)"

    if ($existingId) {
        Write-Host "UPDATE $($row.sidebar_agentkey)" -ForegroundColor Yellow
        if (-not $WhatIf) {
            $patchUrl = "$api/$childSet($existingId)"
            Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers $headers -Body ($payload | ConvertTo-Json -Depth 10) | Out-Null
        }
    }
    else {
        Write-Host "CREATE $($row.sidebar_agentkey)" -ForegroundColor Green
        if (-not $WhatIf) {
            $createUrl = "$api/$childSet"
            Invoke-RestMethod -Method Post -Uri $createUrl -Headers $headers -Body ($payload | ConvertTo-Json -Depth 10) | Out-Null
        }
    }
}

if ($WhatIf) {
    Write-Host "DONE (WhatIf) - no records were written." -ForegroundColor Cyan
}
else {
    Write-Host "DONE - child records seeded and related to parent sidebar config." -ForegroundColor Cyan
}
