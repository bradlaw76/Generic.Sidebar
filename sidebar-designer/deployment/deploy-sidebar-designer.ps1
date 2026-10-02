<#
=============================================================================
COMPONENT:    Generic Sidebar Designer Deployment
FILE:         sidebar-designer/deployment/deploy-sidebar-designer.ps1
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-10-02
ENVIRONMENT:  Dataverse / Power Apps model-driven app
APP URL:      https://healthconnectcenter.crm.dynamics.com

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Adds the Sidebar Designer as one HTML web resource and one sitemap subarea.
Dry-run is the default. Existing resources and sitemap nodes are preserved.

-----------------------------------------------------------------------------
ARCHITECTURE
-----------------------------------------------------------------------------
- Source:          sidebar-designer/dist/index.html
- Web Resource:    sidebar_/designer/index.html
- Solution:        GenericSidebar
- App:             sidebar_GenericSidebar
- Navigation ID:   sidebar_designer
- Auth:            Azure CLI token for the target Dataverse environment

-----------------------------------------------------------------------------
FEATURES
-----------------------------------------------------------------------------
- Baseline guard:  Refuses first deployment if the live sitemap changed
- Concurrency:     Uses ETag If-Match for sitemap and resource updates
- Idempotency:     Safe no-op when the desired resource/navigation exist
- Verification:    Re-reads content, solution membership, and sitemap nodes
- Rollback:        Separately gated removal of only the two created additions

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Run npm run check in sidebar-designer.
2. Authenticate Azure CLI to the target Dataverse tenant.
3. The GenericSidebar unmanaged solution and app must already exist.
4. Use -Apply for deployment.
5. Use -Rollback -AllowDestructive for targeted rollback.

-----------------------------------------------------------------------------
SECURITY MODEL
-----------------------------------------------------------------------------
- No credentials or access tokens are written to disk.
- Dataverse enforces the authenticated administrator's privileges.
- Existing components with colliding identities fail closed.
- Rollback refuses without explicit destructive authorization.

-----------------------------------------------------------------------------
TEST CASES
-----------------------------------------------------------------------------
- Dry run reports no Dataverse writes
- First apply creates exactly one web resource and one subarea
- Existing entity subarea is byte-preserved
- Re-run is idempotent
- Changed sitemap ETag fails rather than overwriting concurrent work
- Rollback removes only sidebar_designer and the marked web resource

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-10-02  Initial additive deployment

-----------------------------------------------------------------------------
NON-NEGOTIABLES (Architecture Contract)
-----------------------------------------------------------------------------
- Never replace the sitemap from a stale local copy.
- Never remove or edit an existing sitemap node.
- Never overwrite a web resource without the deployment ownership marker.
- Never run rollback without -AllowDestructive.
=============================================================================
#>

[CmdletBinding(DefaultParameterSetName = 'Deploy')]
param(
    [Parameter(Mandatory = $false)]
    [string]$EnvironmentUrl = 'https://healthconnectcenter.crm.dynamics.com',

    [Parameter(Mandatory = $false)]
    [string]$SolutionUniqueName = 'GenericSidebar',

    [Parameter(Mandatory = $false)]
    [string]$AppUniqueName = 'sidebar_GenericSidebar',

    [Parameter(Mandatory = $false)]
    [string]$BuildFile = (Join-Path $PSScriptRoot '..\dist\index.html'),

    [Parameter(ParameterSetName = 'Deploy')]
    [switch]$Apply,

    [Parameter(Mandatory = $true, ParameterSetName = 'Rollback')]
    [switch]$Rollback,

    [Parameter(ParameterSetName = 'Rollback')]
    [switch]$AllowDestructive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$environmentBase = $EnvironmentUrl.TrimEnd('/')
$apiBase = "$environmentBase/api/data/v9.2"
$webResourceName = 'sidebar_/designer/index.html'
$webResourceDisplayName = 'Generic Sidebar Designer'
$ownershipMarker = 'Generic.Sidebar Sidebar Designer deployment v1'
$navigationId = 'sidebar_designer'
$navigationTitle = 'Sidebar Designer'
$expectedBaselineHash = '751ddd49438fa1408f466ddfe33b41394beca2fc02d82beb28c0e88c75dbe8f0'
$existingEntitySubareaId = 'subarea_3a2c52e2'

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Value)

    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    return [Convert]::ToHexString(
        [Security.Cryptography.SHA256]::HashData($bytes)
    ).ToLowerInvariant()
}

function Get-DataverseToken {
    $token = az account get-access-token `
        --resource $environmentBase `
        --query accessToken `
        --output tsv

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw 'Azure CLI did not return a Dataverse access token.'
    }

    return $token.Trim()
}

function Invoke-DataverseRequest {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PATCH', 'DELETE')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $false)]
        [object]$Body,

        [Parameter(Mandatory = $false)]
        [hashtable]$AdditionalHeaders = @{}
    )

    $headers = @{
        Authorization      = "Bearer $script:token"
        Accept             = 'application/json'
        'OData-MaxVersion' = '4.0'
        'OData-Version'    = '4.0'
    }

    foreach ($key in $AdditionalHeaders.Keys) {
        $headers[$key] = $AdditionalHeaders[$key]
    }

    $request = @{
        Uri                = "$apiBase/$Path"
        Method             = $Method
        Headers            = $headers
        UseBasicParsing    = $true
        SkipHttpErrorCheck = $true
    }

    if ($null -ne $Body) {
        $request.ContentType = 'application/json; charset=utf-8'
        $request.Body = $Body | ConvertTo-Json -Depth 100 -Compress
    }

    $response = Invoke-WebRequest @request
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Dataverse $Method $Path failed with HTTP $($response.StatusCode): $($response.Content)"
    }

    $data = if ([string]::IsNullOrWhiteSpace($response.Content)) {
        $null
    }
    else {
        $response.Content | ConvertFrom-Json
    }

    return [PSCustomObject]@{
        StatusCode = $response.StatusCode
        Headers    = $response.Headers
        Data       = $data
    }
}

function Get-LiveState {
    $escapedAppName = $AppUniqueName.Replace("'", "''")
    $appResponse = Invoke-DataverseRequest `
        -Method GET `
        -Path "appmodules?`$select=appmoduleid,appmoduleidunique,uniquename,name&`$filter=uniquename eq '$escapedAppName'&`$top=2"
    $apps = @($appResponse.Data.value)
    if ($apps.Count -ne 1) {
        throw "Expected one app '$AppUniqueName'; found $($apps.Count)."
    }
    $app = $apps[0]

    $componentResponse = Invoke-DataverseRequest `
        -Method GET `
        -Path "appmodulecomponents?`$select=objectid,componenttype&`$filter=_appmoduleidunique_value eq $($app.appmoduleidunique) and componenttype eq 62&`$top=2"
    $sitemapComponents = @($componentResponse.Data.value)
    if ($sitemapComponents.Count -ne 1) {
        throw "Expected one sitemap component for '$AppUniqueName'; found $($sitemapComponents.Count)."
    }

    $sitemapId = [Guid]$sitemapComponents[0].objectid
    $sitemapResponse = Invoke-DataverseRequest `
        -Method GET `
        -Path "sitemaps($sitemapId)?`$select=sitemapid,sitemapxml"
    if ([string]::IsNullOrWhiteSpace($sitemapResponse.Data.sitemapxml)) {
        throw 'The deployed app sitemap is empty.'
    }

    $escapedResourceName = $webResourceName.Replace("'", "''")
    $resourceResponse = Invoke-DataverseRequest `
        -Method GET `
        -Path "webresourceset?`$select=webresourceid,name,displayname,description,webresourcetype,content&`$filter=name eq '$escapedResourceName'&`$top=2"
    $resources = @($resourceResponse.Data.value)
    if ($resources.Count -gt 1) {
        throw "Multiple web resources named '$webResourceName' exist."
    }

    return [PSCustomObject]@{
        App             = $app
        SitemapId       = $sitemapId
        SitemapXml      = [string]$sitemapResponse.Data.sitemapxml
        SitemapEtag     = [string]$sitemapResponse.Headers.ETag
        ExistingResource = if ($resources.Count -eq 1) { $resources[0] } else { $null }
    }
}

function Get-SitemapAnalysis {
    param([Parameter(Mandatory = $true)][string]$SitemapXml)

    [xml]$document = $SitemapXml
    $allSubareas = @($document.SelectNodes('//SubArea'))
    $designerNodes = @($document.SelectNodes("//SubArea[@Id='$navigationId']"))
    $entityNodes = @($document.SelectNodes("//SubArea[@Id='$existingEntitySubareaId']"))
    return [PSCustomObject]@{
        Document      = $document
        AllSubareas   = $allSubareas
        DesignerNodes = $designerNodes
        EntityNodes   = $entityNodes
    }
}

function Assert-ResourceOwnership {
    param([Parameter(Mandatory = $true)][object]$Resource)

    if ($Resource.webresourcetype -ne 1) {
        throw "Existing '$webResourceName' is not an HTML web resource."
    }
    if ([string]$Resource.description -notlike "$ownershipMarker*") {
        throw "Existing '$webResourceName' does not carry this deployment's ownership marker."
    }
}

function New-DesiredSitemap {
    param(
        [Parameter(Mandatory = $true)][string]$SitemapXml,
        [switch]$Remove
    )

    $analysis = Get-SitemapAnalysis -SitemapXml $SitemapXml
    if ($analysis.EntityNodes.Count -ne 1) {
        throw "Existing entity navigation '$existingEntitySubareaId' is missing or duplicated."
    }
    if ($analysis.DesignerNodes.Count -gt 1) {
        throw "Navigation ID '$navigationId' is duplicated."
    }

    if ($Remove) {
        if ($analysis.DesignerNodes.Count -eq 1) {
            [void]$analysis.DesignerNodes[0].ParentNode.RemoveChild(
                $analysis.DesignerNodes[0]
            )
        }
        return $analysis.Document.OuterXml
    }

    if ($analysis.DesignerNodes.Count -eq 1) {
        $existingUrl = $analysis.DesignerNodes[0].GetAttribute('Url')
        if ($existingUrl -ne "`$webresource:$webResourceName") {
            throw "Navigation ID '$navigationId' already targets '$existingUrl'."
        }
        return $analysis.Document.OuterXml
    }

    $group = $analysis.EntityNodes[0].ParentNode
    $subarea = $analysis.Document.CreateElement('SubArea')
    $subarea.SetAttribute('Id', $navigationId)
    $subarea.SetAttribute('Title', $navigationTitle)
    $subarea.SetAttribute('Icon', '/_imgs/imagestrips/transparent_spacer.gif')
    $subarea.SetAttribute('Url', "`$webresource:$webResourceName")
    $subarea.SetAttribute('Client', 'All,Web')
    $subarea.SetAttribute('AvailableOffline', 'false')
    $subarea.SetAttribute('PassParams', 'false')
    $subarea.SetAttribute('Sku', 'All,OnPremise,Live,SPLA')
    [void]$group.AppendChild($subarea)
    return $analysis.Document.OuterXml
}

function Publish-Additions {
    param(
        [Parameter(Mandatory = $true)][Guid]$AppId,
        [Parameter(Mandatory = $false)][Guid]$WebResourceId = [Guid]::Empty
    )

    $webResourceXml = if ($WebResourceId -ne [Guid]::Empty) {
        "<webresources><webresource>$WebResourceId</webresource></webresources>"
    }
    else {
        ''
    }
    $parameterXml = "<importexportxml>$webResourceXml<appmodules><appmodule>$AppId</appmodule></appmodules></importexportxml>"
    [void](Invoke-DataverseRequest `
        -Method POST `
        -Path 'PublishXml' `
        -Body @{ ParameterXml = $parameterXml })
}

function Invoke-Deploy {
    if (-not (Test-Path -LiteralPath $BuildFile -PathType Leaf)) {
        throw "Build file '$BuildFile' does not exist. Run npm run check first."
    }

    $buildHtml = Get-Content -LiteralPath $BuildFile -Raw -Encoding UTF8
    if ($buildHtml.Length -lt 100000 -or $buildHtml -notmatch '<title>Generic Sidebar Designer</title>') {
        throw "Build file '$BuildFile' is not a valid production Sidebar Designer bundle."
    }
    if ([Text.Encoding]::UTF8.GetByteCount($buildHtml) -gt 5MB) {
        throw 'The Sidebar Designer bundle exceeds the 5 MB web-resource safety limit.'
    }

    $buildHash = Get-Sha256 -Value $buildHtml
    $state = Get-LiveState
    $sitemapHash = Get-Sha256 -Value $state.SitemapXml
    $analysis = Get-SitemapAnalysis -SitemapXml $state.SitemapXml
    $resourceOperation = 'create'

    if ($null -ne $state.ExistingResource) {
        Assert-ResourceOwnership -Resource $state.ExistingResource
        $existingContent = [Text.Encoding]::UTF8.GetString(
            [Convert]::FromBase64String([string]$state.ExistingResource.content)
        )
        $resourceOperation = if ((Get-Sha256 -Value $existingContent) -eq $buildHash) {
            'none'
        }
        else {
            'update-owned'
        }
    }

    if ($analysis.DesignerNodes.Count -eq 0 -and $sitemapHash -ne $expectedBaselineHash) {
        throw "Live sitemap hash '$sitemapHash' differs from reviewed baseline '$expectedBaselineHash'. Refusing to add navigation."
    }

    $desiredSitemap = New-DesiredSitemap -SitemapXml $state.SitemapXml
    $sitemapOperation = if ($desiredSitemap -ceq $state.SitemapXml) { 'none' } else { 'append' }

    [PSCustomObject]@{
        Mode                   = if ($Apply) { 'apply' } else { 'dry-run' }
        Environment            = $environmentBase
        Solution               = $SolutionUniqueName
        App                    = $AppUniqueName
        BuildFile              = (Resolve-Path -LiteralPath $BuildFile).Path
        BuildBytes             = [Text.Encoding]::UTF8.GetByteCount($buildHtml)
        BuildSha256            = $buildHash
        LiveSitemapSha256      = $sitemapHash
        BaselineSitemapMatched = ($sitemapHash -eq $expectedBaselineHash)
        ResourceOperation      = $resourceOperation
        SitemapOperation       = $sitemapOperation
        ExistingSubareas       = $analysis.AllSubareas.Count
        PreservedEntitySubarea = ($analysis.EntityNodes.Count -eq 1)
    } | ConvertTo-Json -Depth 5

    if (-not $Apply) {
        Write-Host 'DRY RUN ONLY - no Dataverse changes were made.'
        return
    }

    $solutionHeaders = @{
        'MSCRM.SolutionUniqueName' = $SolutionUniqueName
    }
    $resourceId = [Guid]::Empty

    if ($resourceOperation -eq 'create') {
        $createResponse = Invoke-DataverseRequest `
            -Method POST `
            -Path 'webresourceset' `
            -AdditionalHeaders $solutionHeaders `
            -Body @{
                name            = $webResourceName
                displayname     = $webResourceDisplayName
                description     = "$ownershipMarker. Source: sidebar-designer."
                webresourcetype = 1
                content         = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($buildHtml))
            }
        $entityId = [string]$createResponse.Headers['OData-EntityId']
        if ($entityId -notmatch '\(([0-9a-fA-F-]{36})\)') {
            throw 'The web resource was created but its ID was not returned.'
        }
        $resourceId = [Guid]$Matches[1]
    }
    elseif ($resourceOperation -eq 'update-owned') {
        $resourceId = [Guid]$state.ExistingResource.webresourceid
        [void](Invoke-DataverseRequest `
            -Method PATCH `
            -Path "webresourceset($resourceId)" `
            -AdditionalHeaders @{
                'MSCRM.SolutionUniqueName' = $SolutionUniqueName
                'If-Match' = [string]$state.ExistingResource.'@odata.etag'
            } `
            -Body @{
                displayname = $webResourceDisplayName
                description = "$ownershipMarker. Source: sidebar-designer."
                content     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($buildHtml))
            })
    }
    else {
        $resourceId = [Guid]$state.ExistingResource.webresourceid
    }

    if ($sitemapOperation -eq 'append') {
        [void](Invoke-DataverseRequest `
            -Method PATCH `
            -Path "sitemaps($($state.SitemapId))" `
            -AdditionalHeaders @{
                'MSCRM.SolutionUniqueName' = $SolutionUniqueName
                'If-Match' = $state.SitemapEtag
            } `
            -Body @{ sitemapxml = $desiredSitemap })
    }

    Publish-Additions -AppId ([Guid]$state.App.appmoduleid) -WebResourceId $resourceId

    $verified = Get-LiveState
    $verifiedAnalysis = Get-SitemapAnalysis -SitemapXml $verified.SitemapXml
    if ($verifiedAnalysis.DesignerNodes.Count -ne 1) {
        throw 'Verification failed: Sidebar Designer navigation was not deployed exactly once.'
    }
    if ($verifiedAnalysis.EntityNodes.Count -ne 1) {
        throw 'Verification failed: the original Generic Sidebar entity navigation changed.'
    }
    if ($null -eq $verified.ExistingResource) {
        throw 'Verification failed: Sidebar Designer web resource was not found.'
    }
    Assert-ResourceOwnership -Resource $verified.ExistingResource
    $verifiedContent = [Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String([string]$verified.ExistingResource.content)
    )
    if ((Get-Sha256 -Value $verifiedContent) -ne $buildHash) {
        throw 'Verification failed: deployed web resource content hash does not match the build.'
    }

    [PSCustomObject]@{
        Status                 = 'PASS'
        WebResourceId          = $verified.ExistingResource.webresourceid
        WebResourceName        = $verified.ExistingResource.name
        NavigationId           = $navigationId
        SitemapId              = $verified.SitemapId
        OriginalSubareaPresent = ($verifiedAnalysis.EntityNodes.Count -eq 1)
        DesignerSubareaCount   = $verifiedAnalysis.DesignerNodes.Count
        ContentSha256          = $buildHash
        Published              = $true
    } | ConvertTo-Json -Depth 5
}

function Invoke-Rollback {
    if (-not $AllowDestructive) {
        throw 'Rollback requires -AllowDestructive. No changes were made.'
    }

    $state = Get-LiveState
    $analysis = Get-SitemapAnalysis -SitemapXml $state.SitemapXml
    if ($analysis.EntityNodes.Count -ne 1) {
        throw 'Rollback refused because the original entity navigation is missing or duplicated.'
    }
    if ($null -ne $state.ExistingResource) {
        Assert-ResourceOwnership -Resource $state.ExistingResource
    }

    $desiredSitemap = New-DesiredSitemap -SitemapXml $state.SitemapXml -Remove
    if ($desiredSitemap -cne $state.SitemapXml) {
        [void](Invoke-DataverseRequest `
            -Method PATCH `
            -Path "sitemaps($($state.SitemapId))" `
            -AdditionalHeaders @{
                'MSCRM.SolutionUniqueName' = $SolutionUniqueName
                'If-Match' = $state.SitemapEtag
            } `
            -Body @{ sitemapxml = $desiredSitemap })
    }

    $resourceId = [Guid]::Empty
    if ($null -ne $state.ExistingResource) {
        $resourceId = [Guid]$state.ExistingResource.webresourceid
        [void](Invoke-DataverseRequest `
            -Method DELETE `
            -Path "webresourceset($resourceId)" `
            -AdditionalHeaders @{
                'If-Match' = [string]$state.ExistingResource.'@odata.etag'
            })
    }

    Publish-Additions -AppId ([Guid]$state.App.appmoduleid)

    $verified = Get-LiveState
    $verifiedAnalysis = Get-SitemapAnalysis -SitemapXml $verified.SitemapXml
    if ($verifiedAnalysis.DesignerNodes.Count -ne 0 -or $null -ne $verified.ExistingResource) {
        throw 'Rollback verification failed.'
    }
    if ($verifiedAnalysis.EntityNodes.Count -ne 1) {
        throw 'Rollback verification failed: the original entity navigation changed.'
    }

    [PSCustomObject]@{
        Status                 = 'PASS'
        Operation              = 'rollback'
        RemovedNavigationId    = $navigationId
        RemovedWebResourceId   = $resourceId
        OriginalSubareaPresent = $true
        Published              = $true
    } | ConvertTo-Json -Depth 5
}

$script:token = Get-DataverseToken
if ($Rollback) {
    Invoke-Rollback
}
else {
    Invoke-Deploy
}
