<#
=============================================================================
SCRIPT:       create-generic-sidebar-agent-table
FILE:         scripts\create-generic-sidebar-agent-table.ps1
VERSION:      1.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-07-23
ENVIRONMENT:  PowerShell 7+

OVERVIEW
Creates the Dataverse child table sidebar_genericsidebaragent (if missing),
adds required/optional columns, provisions lookup to sidebar_genericsidebar,
and ensures parent tab-target field sidebar_agentmenutab exists.
=============================================================================
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$OrgUrl,

    [Parameter(Mandatory = $false)]
    [string]$SolutionUniqueName = "GenericSidebar"
)

$ErrorActionPreference = "Stop"
$api = "$OrgUrl/api/data/v9.2"
$table = "sidebar_genericsidebaragent"

function Get-AuthHeaders {
    $token = az account get-access-token --resource $OrgUrl --query accessToken -o tsv
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Failed to acquire Dataverse token from Azure CLI."
    }
    return @{
        Authorization = "Bearer $token"
        Accept = "application/json"
        "Content-Type" = "application/json"
    }
}

$headers = Get-AuthHeaders

function Test-TableExists {
    param([string]$LogicalName)
    try {
        Invoke-RestMethod -Method Get -Uri "$api/EntityDefinitions(LogicalName='$LogicalName')?`$select=LogicalName,MetadataId" -Headers $headers | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-AttributeExists {
    param(
        [string]$TableLogicalName,
        [string]$AttributeLogicalName
    )
    try {
        Invoke-RestMethod -Method Get -Uri "$api/EntityDefinitions(LogicalName='$TableLogicalName')/Attributes(LogicalName='$AttributeLogicalName')?`$select=LogicalName" -Headers $headers | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Add-Attribute {
    param(
        [string]$TableLogicalName,
        [string]$AttributeLogicalName,
        [hashtable]$Payload
    )

    if (Test-AttributeExists -TableLogicalName $TableLogicalName -AttributeLogicalName $AttributeLogicalName) {
        Write-Host "SKIP $AttributeLogicalName (exists)" -ForegroundColor Yellow
        return
    }

    Invoke-RestMethod -Method Post -Uri "$api/EntityDefinitions(LogicalName='$TableLogicalName')/Attributes" -Headers $headers -Body ($Payload | ConvertTo-Json -Depth 40) | Out-Null
    Write-Host "ADD  $AttributeLogicalName" -ForegroundColor Green
}

function New-AgentTable {
    if (Test-TableExists -LogicalName $table) {
        Write-Host "SKIP $table (table exists)" -ForegroundColor Yellow
        return
    }

    $entityPayload = @{
        "@odata.type" = "Microsoft.Dynamics.CRM.EntityMetadata"
        SchemaName = $table
        DisplayName = @{ LocalizedLabels = @(@{ Label = "Generic Sidebar Agent"; LanguageCode = 1033 }) }
        DisplayCollectionName = @{ LocalizedLabels = @(@{ Label = "Generic Sidebar Agents"; LanguageCode = 1033 }) }
        Description = @{ LocalizedLabels = @(@{ Label = "Child table for multi-agent configuration linked to Generic Sidebar records."; LanguageCode = 1033 }) }
        OwnershipType = "UserOwned"
        HasActivities = $false
        HasNotes = $false
        Attributes = @(
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName = "sidebar_name"
                IsPrimaryName = $true
                RequiredLevel = @{ Value = "ApplicationRequired" }
                MaxLength = 100
                FormatName = @{ Value = "Text" }
                DisplayName = @{ LocalizedLabels = @(@{ Label = "Agent Name"; LanguageCode = 1033 }) }
                Description = @{ LocalizedLabels = @(@{ Label = "Primary name for the agent row."; LanguageCode = 1033 }) }
            }
        )
    }

    Invoke-RestMethod -Method Post -Uri "$api/EntityDefinitions" -Headers $headers -Body ($entityPayload | ConvertTo-Json -Depth 40) | Out-Null
    Write-Host "ADD  $table (table created)" -ForegroundColor Green
}

function Add-TableToSolution {
    param(
        [string]$TableLogicalName,
        [string]$TargetSolution
    )

    $tableDef = Invoke-RestMethod -Method Get -Uri "$api/EntityDefinitions(LogicalName='$TableLogicalName')?`$select=MetadataId" -Headers $headers
    if (-not $tableDef.MetadataId) {
        throw "Could not resolve MetadataId for table $TableLogicalName"
    }

    $componentPayload = @{
        ComponentId = $tableDef.MetadataId
        ComponentType = 1
        SolutionUniqueName = $TargetSolution
        AddRequiredComponents = $true
        IncludedComponentSettingsValues = $null
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$api/AddSolutionComponent" -Headers $headers -Body ($componentPayload | ConvertTo-Json -Depth 10) | Out-Null
        Write-Host "ADD  $TableLogicalName to solution $TargetSolution" -ForegroundColor Green
    }
    catch {
        Write-Host "WARN Could not add table to solution automatically: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Add-ParentLookupRelationship {
    param(
        [string]$ChildTableLogicalName,
        [string]$ParentTableLogicalName,
        [string]$LookupSchemaName,
        [string]$TargetSolution
    )

    if (Test-AttributeExists -TableLogicalName $ChildTableLogicalName -AttributeLogicalName $LookupSchemaName) {
        Write-Host "SKIP $LookupSchemaName (exists)" -ForegroundColor Yellow
        return
    }

    $relationshipSchema = "sidebar_${ParentTableLogicalName}_${ChildTableLogicalName}"

    $payload = @{
        Lookup = @{
            EntityLogicalName = $ChildTableLogicalName
            SchemaName = $LookupSchemaName
            DisplayName = @{ LocalizedLabels = @(@{ Label = "Generic Sidebar"; LanguageCode = 1033 }) }
            Description = @{ LocalizedLabels = @(@{ Label = "Parent Generic Sidebar configuration record."; LanguageCode = 1033 }) }
            RequiredLevel = @{ Value = "ApplicationRequired" }
            Targets = @($ParentTableLogicalName)
        }
        OneToManyRelationships = @(
            @{
                SchemaName = $relationshipSchema
                ReferencedEntity = $ParentTableLogicalName
                ReferencedAttribute = "sidebar_genericsidebarid"
                ReferencingEntity = $ChildTableLogicalName
                IsCustomRelationship = $true
                IsValidForAdvancedFind = $true
            }
        )
        SolutionUniqueName = $TargetSolution
    }

    Invoke-RestMethod -Method Post -Uri "$api/CreatePolymorphicLookupAttribute" -Headers $headers -Body ($payload | ConvertTo-Json -Depth 40) | Out-Null
    Write-Host "ADD  $LookupSchemaName (lookup relationship)" -ForegroundColor Green
}

New-AgentTable

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_displayname" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_displayname"
    RequiredLevel = @{ Value = "ApplicationRequired" }
    MaxLength = 150
    FormatName = @{ Value = "Text" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Display Name"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Title shown to end users in the agent picker."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_tokenendpoint" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_tokenendpoint"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 500
    FormatName = @{ Value = "Text" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Token Endpoint"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Copilot Studio Direct Line token endpoint for this agent."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_sortorder" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"
    SchemaName = "sidebar_sortorder"
    RequiredLevel = @{ Value = "ApplicationRequired" }
    MinValue = 0
    MaxValue = 1000000
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Sort Order"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Order used when rendering the agent list."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_isactive" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"
    SchemaName = "sidebar_isactive"
    RequiredLevel = @{ Value = "ApplicationRequired" }
    DefaultValue = $true
    OptionSet = @{
        TrueOption = @{ Value = 1; Label = @{ LocalizedLabels = @(@{ Label = "Yes"; LanguageCode = 1033 }) } }
        FalseOption = @{ Value = 0; Label = @{ LocalizedLabels = @(@{ Label = "No"; LanguageCode = 1033 }) } }
    }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Is Active"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "If false, the agent is hidden from the picker."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_description" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_description"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 250
    FormatName = @{ Value = "Text" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Description"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Subtitle shown under the agent display name."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_embedcode" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"
    SchemaName = "sidebar_embedcode"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 1048576
    Format = "TextArea"
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Embed Code"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Optional raw HTML or iframe embed code for this agent. If populated, the picker renders this embed directly instead of using SSO token routing."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_isdefaultagent" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"
    SchemaName = "sidebar_isdefaultagent"
    RequiredLevel = @{ Value = "None" }
    DefaultValue = $false
    OptionSet = @{
        TrueOption = @{ Value = 1; Label = @{ LocalizedLabels = @(@{ Label = "Yes"; LanguageCode = 1033 }) } }
        FalseOption = @{ Value = 0; Label = @{ LocalizedLabels = @(@{ Label = "No"; LanguageCode = 1033 }) } }
    }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Default Agent"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Marks default agent for the parent sidebar config."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_authscopeoverride" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_authscopeoverride"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 300
    FormatName = @{ Value = "Text" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Auth Scope Override"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Optional per-agent OAuth scope override."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_agentkey" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_agentkey"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 100
    FormatName = @{ Value = "Text" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Agent Key"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Stable programmatic key for routing and history."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_iconurl" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
    SchemaName = "sidebar_iconurl"
    RequiredLevel = @{ Value = "None" }
    MaxLength = 500
    FormatName = @{ Value = "Url" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Icon URL"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Optional icon/avatar URL used in the picker UI."; LanguageCode = 1033 }) }
}

Add-Attribute -TableLogicalName $table -AttributeLogicalName "sidebar_agenttype" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
    SchemaName = "sidebar_agenttype"
    RequiredLevel = @{ Value = "None" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Agent Type"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Classifies the agent platform type."; LanguageCode = 1033 }) }
    OptionSet = @{
        "@odata.type" = "Microsoft.Dynamics.CRM.OptionSetMetadata"
        IsGlobal = $false
        Options = @(
            @{ Value = 100000000; Label = @{ LocalizedLabels = @(@{ Label = "Copilot Studio"; LanguageCode = 1033 }) } },
            @{ Value = 100000001; Label = @{ LocalizedLabels = @(@{ Label = "PVA Legacy"; LanguageCode = 1033 }) } },
            @{ Value = 100000002; Label = @{ LocalizedLabels = @(@{ Label = "Other"; LanguageCode = 1033 }) } }
        )
    }
}

# Parent config selector: choose which tab (1-4) should host linked-agent picker.
Add-Attribute -TableLogicalName "sidebar_genericsidebar" -AttributeLogicalName "sidebar_agentmenutab" -Payload @{
    "@odata.type" = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
    SchemaName = "sidebar_agentmenutab"
    RequiredLevel = @{ Value = "None" }
    DisplayName = @{ LocalizedLabels = @(@{ Label = "Agent Menu Tab"; LanguageCode = 1033 }) }
    Description = @{ LocalizedLabels = @(@{ Label = "Optional tab slot (1-4) where linked agents render in the sidebar."; LanguageCode = 1033 }) }
    OptionSet = @{
        "@odata.type" = "Microsoft.Dynamics.CRM.OptionSetMetadata"
        IsGlobal = $false
        Options = @(
            @{ Value = 100000000; Label = @{ LocalizedLabels = @(@{ Label = "None"; LanguageCode = 1033 }) } },
            @{ Value = 100000001; Label = @{ LocalizedLabels = @(@{ Label = "Tab 1"; LanguageCode = 1033 }) } },
            @{ Value = 100000002; Label = @{ LocalizedLabels = @(@{ Label = "Tab 2"; LanguageCode = 1033 }) } },
            @{ Value = 100000003; Label = @{ LocalizedLabels = @(@{ Label = "Tab 3"; LanguageCode = 1033 }) } },
            @{ Value = 100000004; Label = @{ LocalizedLabels = @(@{ Label = "Tab 4"; LanguageCode = 1033 }) } }
        )
    }
}

Add-ParentLookupRelationship -ChildTableLogicalName $table -ParentTableLogicalName "sidebar_genericsidebar" -LookupSchemaName "sidebar_genericsidebarid" -TargetSolution $SolutionUniqueName

Add-TableToSolution -TableLogicalName $table -TargetSolution $SolutionUniqueName

Write-Host "DONE - agent table provisioning complete." -ForegroundColor Cyan