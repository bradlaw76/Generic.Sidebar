$ErrorActionPreference = 'Stop'
$envUrl = 'https://healthconnectcenter.crm.dynamics.com'
$api = "$envUrl/api/data/v9.2"
$token = az account get-access-token --resource $envUrl --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $token"; Accept = 'application/json'; 'Content-Type' = 'application/json' }
$table = 'sidebar_genericsidebaragent'

function Test-Attr([string]$logical) {
  try {
    Invoke-RestMethod -Method Get -Uri "$api/EntityDefinitions(LogicalName='$table')/Attributes(LogicalName='$logical')?`$select=LogicalName" -Headers $headers | Out-Null
    return $true
  } catch { return $false }
}

function Add-Attr([hashtable]$payload,[string]$logical) {
  if (Test-Attr $logical) { Write-Output "SKIP $logical"; return }
  Invoke-RestMethod -Method Post -Uri "$api/EntityDefinitions(LogicalName='$table')/Attributes" -Headers $headers -Body ($payload | ConvertTo-Json -Depth 30) | Out-Null
  Write-Output "ADD  $logical"
}

Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_displayname'; RequiredLevel=@{Value='ApplicationRequired'}; MaxLength=150; FormatName=@{Value='Text'}; DisplayName=@{LocalizedLabels=@(@{Label='Display Name';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Title shown to end users in the agent picker.';LanguageCode=1033})} } 'sidebar_displayname'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_tokenendpoint'; RequiredLevel=@{Value='ApplicationRequired'}; MaxLength=500; FormatName=@{Value='Text'}; DisplayName=@{LocalizedLabels=@(@{Label='Token Endpoint';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Copilot Studio Direct Line token endpoint for this agent.';LanguageCode=1033})} } 'sidebar_tokenendpoint'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.IntegerAttributeMetadata'; SchemaName='sidebar_sortorder'; RequiredLevel=@{Value='ApplicationRequired'}; MinValue=0; MaxValue=1000000; DisplayName=@{LocalizedLabels=@(@{Label='Sort Order';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Order used when rendering the agent list.';LanguageCode=1033})} } 'sidebar_sortorder'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.BooleanAttributeMetadata'; SchemaName='sidebar_isactive'; RequiredLevel=@{Value='ApplicationRequired'}; DefaultValue=$true; OptionSet=@{TrueOption=@{Value=1;Label=@{LocalizedLabels=@(@{Label='Yes';LanguageCode=1033})}};FalseOption=@{Value=0;Label=@{LocalizedLabels=@(@{Label='No';LanguageCode=1033})}}}; DisplayName=@{LocalizedLabels=@(@{Label='Is Active';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='If false, the agent is hidden from the picker.';LanguageCode=1033})} } 'sidebar_isactive'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_description'; RequiredLevel=@{Value='None'}; MaxLength=250; FormatName=@{Value='Text'}; DisplayName=@{LocalizedLabels=@(@{Label='Description';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Subtitle shown under the agent display name.';LanguageCode=1033})} } 'sidebar_description'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.BooleanAttributeMetadata'; SchemaName='sidebar_isdefaultagent'; RequiredLevel=@{Value='None'}; DefaultValue=$false; OptionSet=@{TrueOption=@{Value=1;Label=@{LocalizedLabels=@(@{Label='Yes';LanguageCode=1033})}};FalseOption=@{Value=0;Label=@{LocalizedLabels=@(@{Label='No';LanguageCode=1033})}}}; DisplayName=@{LocalizedLabels=@(@{Label='Default Agent';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Marks default agent for the parent sidebar config.';LanguageCode=1033})} } 'sidebar_isdefaultagent'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_authscopeoverride'; RequiredLevel=@{Value='None'}; MaxLength=300; FormatName=@{Value='Text'}; DisplayName=@{LocalizedLabels=@(@{Label='Auth Scope Override';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Optional per-agent OAuth scope override.';LanguageCode=1033})} } 'sidebar_authscopeoverride'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_agentkey'; RequiredLevel=@{Value='None'}; MaxLength=100; FormatName=@{Value='Text'}; DisplayName=@{LocalizedLabels=@(@{Label='Agent Key';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Stable programmatic key for routing and history.';LanguageCode=1033})} } 'sidebar_agentkey'
Add-Attr @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata'; SchemaName='sidebar_iconurl'; RequiredLevel=@{Value='None'}; MaxLength=500; FormatName=@{Value='Url'}; DisplayName=@{LocalizedLabels=@(@{Label='Icon URL';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Optional icon/avatar URL used in the picker UI.';LanguageCode=1033})} } 'sidebar_iconurl'

if (-not (Test-Attr 'sidebar_agenttype')) {
  $choice = @{ '@odata.type'='Microsoft.Dynamics.CRM.PicklistAttributeMetadata'; SchemaName='sidebar_agenttype'; RequiredLevel=@{Value='None'}; DisplayName=@{LocalizedLabels=@(@{Label='Agent Type';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Classifies the agent platform type.';LanguageCode=1033})}; OptionSet=@{ '@odata.type'='Microsoft.Dynamics.CRM.OptionSetMetadata'; IsGlobal=$false; Options=@( @{Value=100000000;Label=@{LocalizedLabels=@(@{Label='Copilot Studio';LanguageCode=1033})}}, @{Value=100000001;Label=@{LocalizedLabels=@(@{Label='PVA Legacy';LanguageCode=1033})}}, @{Value=100000002;Label=@{LocalizedLabels=@(@{Label='Other';LanguageCode=1033})}} ) } }
  Invoke-RestMethod -Method Post -Uri "$api/EntityDefinitions(LogicalName='$table')/Attributes" -Headers $headers -Body ($choice | ConvertTo-Json -Depth 30) | Out-Null
  Write-Output 'ADD  sidebar_agenttype'
} else { Write-Output 'SKIP sidebar_agenttype' }

if (-not (Test-Attr 'sidebar_genericsidebarid')) {
  $lookup = @{ '@odata.type'='Microsoft.Dynamics.CRM.LookupAttributeMetadata'; SchemaName='sidebar_genericsidebarid'; DisplayName=@{LocalizedLabels=@(@{Label='Generic Sidebar';LanguageCode=1033})}; Description=@{LocalizedLabels=@(@{Label='Parent Generic Sidebar configuration record.';LanguageCode=1033})}; RequiredLevel=@{Value='ApplicationRequired'}; Targets=@('sidebar_genericsidebar') }
  Invoke-RestMethod -Method Post -Uri "$api/EntityDefinitions(LogicalName='$table')/Attributes" -Headers $headers -Body ($lookup | ConvertTo-Json -Depth 25) | Out-Null
  Write-Output 'ADD  sidebar_genericsidebarid'
} else { Write-Output 'SKIP sidebar_genericsidebarid' }

$fields = 'sidebar_name','sidebar_displayname','sidebar_tokenendpoint','sidebar_sortorder','sidebar_isactive','sidebar_description','sidebar_isdefaultagent','sidebar_authscopeoverride','sidebar_agentkey','sidebar_iconurl','sidebar_agenttype','sidebar_genericsidebarid'
foreach($f in $fields){ if(Test-Attr $f){ Write-Output "OK   $f" } else { Write-Output "MISS $f" } }
