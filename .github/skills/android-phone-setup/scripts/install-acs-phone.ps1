<#
=============================================================================
COMPONENT:    Android Phone Simulator — ACS Installer
FILE:         .github/skills/android-phone-setup/scripts/install-acs-phone.ps1
VERSION:      1.0.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-03-08
ENVIRONMENT:  PowerShell 7+ | Azure CLI | Node.js 18+

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Wizard-based installer that provisions all Azure resources needed for the
Android Cell Phone Simulator with ACS real PSTN calling. Handles resource
creation, SDK bundle build, function deployment, and optional D365 upload.

-----------------------------------------------------------------------------
PREREQUISITES
-----------------------------------------------------------------------------
1. Azure CLI installed and on PATH
2. Node.js 18+ installed
3. PowerShell 7+
4. Azure subscription with ability to create resources
5. (Optional) MSAL.PS module for D365 web resource upload

-----------------------------------------------------------------------------
USAGE
-----------------------------------------------------------------------------
  .\install-acs-phone.ps1 -D365Url "https://yourorg.crm.dynamics.com"
  .\install-acs-phone.ps1 -D365Url "https://yourorg.crm.dynamics.com" -Location westus2
  .\install-acs-phone.ps1 -SkipAzureResources          # Skip Azure, just build/deploy
  .\install-acs-phone.ps1 -SkipD365Upload               # Skip D365 upload
  .\install-acs-phone.ps1 -UploadWebResource             # Include D365 upload step
  .\install-acs-phone.ps1 -UseFreetier                   # Consumption plan instead of B1

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0.0  2026-03-08  Initial version — full wizard installer

-----------------------------------------------------------------------------
NON-NEGOTIABLES
-----------------------------------------------------------------------------
- NEVER expose ACS_CONNECTION_STRING to the browser or logs.
- ALWAYS restrict CORS to the specific D365 domain.
- NEVER skip the token endpoint verification step.
=============================================================================
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$D365Url,

    [string]$Location = "eastus",
    [string]$ResourcePrefix = "sidebar-acs",
    [string]$ResourceGroup,
    [string]$FunctionAppName,
    [string]$AcsPhoneNumber,

    [switch]$SkipAzureResources,
    [switch]$SkipD365Upload,
    [switch]$UploadWebResource,
    [switch]$UseFreetier,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Resolve paths ──────────────────────────────────────────────────────────
$scriptRoot   = $PSScriptRoot
$repoRoot     = (Resolve-Path (Join-Path $scriptRoot '..\..\..\..')).Path
$azFuncDir    = Join-Path $repoRoot 'azure-functions'
$acsBundleDir = Join-Path $repoRoot 'acs-bundle'
$phoneHtml    = Join-Path $repoRoot 'Generic.AndroidCellPhone\AndroidCellPhone_ACS.html'

# ── Derived names ──────────────────────────────────────────────────────────
$suffix       = -join ((48..57) + (97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
if (-not $ResourceGroup)   { $ResourceGroup   = "rg-$ResourcePrefix" }
if (-not $FunctionAppName) { $FunctionAppName = "fn-$ResourcePrefix-$suffix" }
$storageName  = ("st" + ($ResourcePrefix -replace '[^a-z0-9]', '') + $suffix).Substring(0, [Math]::Min(24, ("st" + ($ResourcePrefix -replace '[^a-z0-9]', '') + $suffix).Length))
$planName     = "plan-$ResourcePrefix"
$acsName      = "acs-$ResourcePrefix"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: PREREQUISITES CHECK
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ STEP 1/8: CHECKING PREREQUISITES ═══" -ForegroundColor Magenta

$checks = @(
    @{ Name = "Azure CLI";      Cmd = "az --version";             Required = (-not $SkipAzureResources) }
    @{ Name = "Node.js 18+";    Cmd = "node --version";           Required = $true }
    @{ Name = "PowerShell 7+";  Cmd = '$PSVersionTable.PSVersion'; Required = $true }
)

$allPassed = $true
foreach ($check in $checks) {
    if (-not $check.Required) {
        Write-Host "  ○ $($check.Name) — skipped" -ForegroundColor DarkGray
        continue
    }
    try {
        $null = Invoke-Expression $check.Cmd 2>$null
        Write-Host "  ✓ $($check.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($check.Name) — NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
}

if (-not $allPassed) {
    Write-Host "`n  Missing prerequisites. Install them and re-run." -ForegroundColor Red
    Write-Host "    Azure CLI:  winget install Microsoft.AzureCLI" -ForegroundColor Yellow
    Write-Host "    Node.js:    winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: AZURE LOGIN
# ═══════════════════════════════════════════════════════════════════════════
if (-not $SkipAzureResources) {
    Write-Host "`n═══ STEP 2/8: AZURE LOGIN ═══" -ForegroundColor Magenta

    $acct = az account show 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($acct) {
        Write-Host "  Already logged in as: $($acct.user.name)" -ForegroundColor Green
        Write-Host "  Subscription: $($acct.name) ($($acct.id))" -ForegroundColor Cyan
        if (-not $Force) {
            $confirm = Read-Host "  Use this subscription? (Y/n)"
            if ($confirm -eq 'n') {
                Write-Host "  Run 'az account set --subscription <id>' to switch, then re-run." -ForegroundColor Yellow
                exit 0
            }
        }
    } else {
        Write-Host "  Logging in via device code..." -ForegroundColor Yellow
        az login --use-device-code
    }
} else {
    Write-Host "`n═══ STEP 2/8: AZURE LOGIN — SKIPPED ═══" -ForegroundColor DarkGray
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: CREATE AZURE RESOURCES
# ═══════════════════════════════════════════════════════════════════════════
if (-not $SkipAzureResources) {
    Write-Host "`n═══ STEP 3/8: CREATING AZURE RESOURCES ═══" -ForegroundColor Magenta

    # 3a. Resource Group
    Write-Host "  → Resource Group: $ResourceGroup" -ForegroundColor Cyan
    az group create --name $ResourceGroup --location $Location --output none
    Write-Host "    ✓ Created" -ForegroundColor Green

    # 3b. Register Communication provider (idempotent)
    Write-Host "  → Registering Microsoft.Communication provider..." -ForegroundColor Cyan
    az provider register --namespace Microsoft.Communication --wait --output none 2>$null
    Write-Host "    ✓ Registered" -ForegroundColor Green

    # 3c. ACS Resource
    Write-Host "  → ACS Resource: $acsName" -ForegroundColor Cyan
    az communication create --name $acsName --resource-group $ResourceGroup --location global --data-location unitedstates --output none
    Write-Host "    ✓ Created" -ForegroundColor Green

    # 3d. Get connection string
    $acsConnStr = az communication list-key --name $acsName --resource-group $ResourceGroup --query "primaryConnectionString" -o tsv
    if (-not $acsConnStr) { throw "Failed to retrieve ACS connection string." }
    Write-Host "    ✓ Connection string retrieved" -ForegroundColor Green

    # 3e. Storage Account
    Write-Host "  → Storage Account: $storageName" -ForegroundColor Cyan
    az storage account create --name $storageName --resource-group $ResourceGroup --location $Location --sku Standard_LRS --output none
    Write-Host "    ✓ Created" -ForegroundColor Green

    # 3f. App Service Plan
    $sku = if ($UseFreetier) { "Y1" } else { "B1" }
    Write-Host "  → App Service Plan: $planName (SKU: $sku)" -ForegroundColor Cyan
    if ($UseFreeiter) {
        az functionapp plan create --name $planName --resource-group $ResourceGroup --location $Location --sku $sku --is-linux --output none
    } else {
        az appservice plan create --name $planName --resource-group $ResourceGroup --location $Location --sku $sku --is-linux --output none
    }
    Write-Host "    ✓ Created" -ForegroundColor Green

    # 3g. Function App
    Write-Host "  → Function App: $FunctionAppName" -ForegroundColor Cyan
    az functionapp create `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --plan $planName `
        --storage-account $storageName `
        --runtime node `
        --runtime-version 18 `
        --functions-version 4 `
        --output none
    Write-Host "    ✓ Created" -ForegroundColor Green

    # 3h. Set ACS connection string
    Write-Host "  → Setting ACS_CONNECTION_STRING..." -ForegroundColor Cyan
    az functionapp config appsettings set `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --settings "ACS_CONNECTION_STRING=$acsConnStr" `
        --output none
    Write-Host "    ✓ App setting configured" -ForegroundColor Green

    # 3i. Configure CORS
    if ($D365Url) {
        Write-Host "  → Configuring CORS for $D365Url..." -ForegroundColor Cyan
        az functionapp cors remove --name $FunctionAppName --resource-group $ResourceGroup --allowed-origins "*" --output none 2>$null
        az functionapp cors add --name $FunctionAppName --resource-group $ResourceGroup --allowed-origins $D365Url --output none
        Write-Host "    ✓ CORS restricted to $D365Url" -ForegroundColor Green
    }
} else {
    Write-Host "`n═══ STEP 3/8: CREATE AZURE RESOURCES — SKIPPED ═══" -ForegroundColor DarkGray
    # Need Function App name for deployment
    if (-not $FunctionAppName) {
        $FunctionAppName = Read-Host "  Enter your existing Function App name"
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: PURCHASE PHONE NUMBER (manual)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ STEP 4/8: PURCHASE PHONE NUMBER ═══" -ForegroundColor Magenta

if (-not $AcsPhoneNumber) {
    Write-Host "  Phone numbers must be purchased in the Azure Portal." -ForegroundColor Yellow
    Write-Host "  Opening portal..." -ForegroundColor Cyan

    $portalUrl = "https://portal.azure.com/#view/Microsoft_Azure_Communication/PhoneNumbersManagement"
    Start-Process $portalUrl

    Write-Host ""
    Write-Host "  Steps:" -ForegroundColor White
    Write-Host "  1. Select your ACS resource ($acsName)" -ForegroundColor White
    Write-Host "  2. Click 'Get' → Country: United States" -ForegroundColor White
    Write-Host "  3. Number type: Geographic → Pick area code" -ForegroundColor White
    Write-Host "  4. Features: Outbound calling" -ForegroundColor White
    Write-Host "  5. Purchase the number" -ForegroundColor White
    Write-Host ""

    $AcsPhoneNumber = Read-Host "  Enter your new phone number (e.g. +14045551234)"
    if (-not $AcsPhoneNumber) {
        Write-Host "  ✗ No phone number entered. You can set this later in Settings." -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Phone number: $AcsPhoneNumber" -ForegroundColor Green
    }
} else {
    Write-Host "  Using provided number: $AcsPhoneNumber" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: BUILD & DEPLOY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ STEP 5/8: BUILD & DEPLOY FUNCTIONS ═══" -ForegroundColor Magenta

# 5a. Install Azure Function dependencies
Write-Host "  → Installing Azure Function dependencies..." -ForegroundColor Cyan
Push-Location $azFuncDir
npm install --production 2>$null
Write-Host "    ✓ npm install complete" -ForegroundColor Green
Pop-Location

# 5b. Build ACS SDK bundle
Write-Host "  → Building ACS SDK bundle..." -ForegroundColor Cyan
Push-Location $acsBundleDir
npm install 2>$null
$bundleOutput = Join-Path $azFuncDir 'serveAcsBundle\acs-sdk-bundle.js'
npx esbuild entry.js --bundle --outfile=$bundleOutput --format=iife 2>$null
$bundleSize = [Math]::Round((Get-Item $bundleOutput).Length / 1MB, 1)
Write-Host "    ✓ Bundle built: ${bundleSize}MB" -ForegroundColor Green
Pop-Location

# 5c. Zip deploy
Write-Host "  → Deploying to Function App: $FunctionAppName..." -ForegroundColor Cyan
$zipFile = Join-Path $env:TEMP "sidebar-acs-deploy.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }

Push-Location $azFuncDir
# Compress excluding node_modules from zip (they're installed on the server)
$filesToZip = Get-ChildItem -Path . -Recurse -Exclude 'node_modules' | Where-Object { $_.FullName -notmatch 'node_modules' }
Compress-Archive -Path $filesToZip -DestinationPath $zipFile -Force
Pop-Location

az functionapp deployment source config-zip `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --src $zipFile `
    --output none

Write-Host "    ✓ Deployed" -ForegroundColor Green

# 5d. Verify endpoints
$funcUrl = "https://$FunctionAppName.azurewebsites.net"
Write-Host "  → Verifying endpoints..." -ForegroundColor Cyan

Start-Sleep -Seconds 10  # Allow cold start

try {
    $tokenResp = Invoke-RestMethod -Uri "$funcUrl/api/getAcsToken" -Method GET -TimeoutSec 30
    if ($tokenResp.token) {
        Write-Host "    ✓ Token endpoint: 200 OK" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ Token endpoint responded but no token in body" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ✗ Token endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $bundleResp = Invoke-WebRequest -Uri "$funcUrl/api/serveAcsBundle" -Method GET -TimeoutSec 30
    if ($bundleResp.StatusCode -eq 200) {
        Write-Host "    ✓ Bundle endpoint: 200 OK ($([Math]::Round($bundleResp.Content.Length / 1KB))KB)" -ForegroundColor Green
    }
} catch {
    Write-Host "    ✗ Bundle endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: CONFIGURE PHONE HTML
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ STEP 6/8: CONFIGURE PHONE HTML ═══" -ForegroundColor Magenta

if (Test-Path $phoneHtml) {
    $html = Get-Content $phoneHtml -Raw

    $tokenUrl = "$funcUrl/api/getAcsToken"
    $html = $html -replace "var ACS_TOKEN_URL\s*=\s*'[^']*'", "var ACS_TOKEN_URL = '$tokenUrl'"

    if ($AcsPhoneNumber) {
        $html = $html -replace "var ACS_PHONE_NUMBER\s*=\s*'[^']*'", "var ACS_PHONE_NUMBER = '$AcsPhoneNumber'"
    }

    Set-Content -Path $phoneHtml -Value $html -Encoding UTF8
    Write-Host "  ✓ Updated AndroidCellPhone_ACS.html with:" -ForegroundColor Green
    Write-Host "    Token URL:    $tokenUrl" -ForegroundColor Cyan
    if ($AcsPhoneNumber) { Write-Host "    Phone Number: $AcsPhoneNumber" -ForegroundColor Cyan }
} else {
    Write-Host "  ⚠ Phone HTML not found at: $phoneHtml" -ForegroundColor Yellow
    Write-Host "    You can configure URLs later in the phone Settings screen." -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: D365 WEB RESOURCE UPLOAD (optional)
# ═══════════════════════════════════════════════════════════════════════════
if ($UploadWebResource -and $D365Url -and (-not $SkipD365Upload)) {
    Write-Host "`n═══ STEP 7/8: D365 WEB RESOURCE UPLOAD ═══" -ForegroundColor Magenta

    # Acquire Dataverse token
    try {
        Import-Module MSAL.PS -ErrorAction Stop
        $clientId = '51f81489-12ee-4a9e-aaae-a2591f45987d'
        Write-Host "  Acquiring Dataverse token via device code..." -ForegroundColor Yellow
        $msalResult = Get-MsalToken -ClientId $clientId -TenantId 'organizations' -Scopes "$D365Url/.default" -DeviceCode
        $dvToken = $msalResult.AccessToken
    } catch {
        Write-Host "  ✗ MSAL.PS not available. Install with: Install-Module MSAL.PS -Scope CurrentUser" -ForegroundColor Red
        Write-Host "  Skipping D365 upload. Upload manually via Settings → Web Resources." -ForegroundColor Yellow
        $dvToken = $null
    }

    if ($dvToken -and (Test-Path $phoneHtml)) {
        $api = "$D365Url/api/data/v9.2"
        $headers = @{
            Authorization    = "Bearer $dvToken"
            'OData-Version'  = '4.0'
            Accept           = 'application/json'
            'Content-Type'   = 'application/json; charset=utf-8'
        }

        $htmlContent = Get-Content $phoneHtml -Raw
        $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($htmlContent))

        $wrBody = @{
            name           = 'gensoft_AndroidCellPhone_ACS'
            displayname    = 'Android Cell Phone Simulator (ACS)'
            webresourcetype = 1  # HTML
            content        = $b64
        } | ConvertTo-Json -Compress

        try {
            Invoke-RestMethod -Uri "$api/webresourceset" -Method POST -Headers $headers -Body $wrBody | Out-Null
            Write-Host "  ✓ Web resource created" -ForegroundColor Green

            # Publish
            $publishBody = @{ ParameterXml = '<importexportxml><webresources><webresource>gensoft_AndroidCellPhone_ACS</webresource></webresources></importexportxml>' } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$api/PublishXml" -Method POST -Headers $headers -Body $publishBody | Out-Null
            Write-Host "  ✓ Web resource published" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n═══ STEP 7/8: D365 UPLOAD — SKIPPED ═══" -ForegroundColor DarkGray
    if (-not $UploadWebResource) {
        Write-Host "  Use -UploadWebResource flag to enable D365 upload." -ForegroundColor DarkGray
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8: VERIFICATION SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "`n═══ STEP 8/8: VERIFICATION SUMMARY ═══" -ForegroundColor Magenta

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor White
Write-Host "  │  ANDROID PHONE SIMULATOR — INSTALLATION COMPLETE    │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor White
Write-Host ""

if (-not $SkipAzureResources) {
    Write-Host "  Azure Resources:" -ForegroundColor Cyan
    Write-Host "    Resource Group:   $ResourceGroup" -ForegroundColor White
    Write-Host "    ACS Resource:     $acsName" -ForegroundColor White
    Write-Host "    Function App:     $FunctionAppName" -ForegroundColor White
    Write-Host "    Token URL:        $funcUrl/api/getAcsToken" -ForegroundColor White
    Write-Host "    Bundle URL:       $funcUrl/api/serveAcsBundle" -ForegroundColor White
    if ($AcsPhoneNumber) {
        Write-Host "    Phone Number:     $AcsPhoneNumber" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "    1. Open the phone in D365 or standalone HTML" -ForegroundColor White
Write-Host "    2. Grant microphone permission when prompted" -ForegroundColor White
Write-Host "    3. Place a test call to verify audio" -ForegroundColor White

if (-not $UploadWebResource -and $D365Url) {
    Write-Host ""
    Write-Host "  To upload to D365 later:" -ForegroundColor Yellow
    Write-Host "    .\install-acs-phone.ps1 -D365Url `"$D365Url`" -SkipAzureResources -UploadWebResource" -ForegroundColor White
}

Write-Host ""
Write-Host "  ═══════════════════════════════════════" -ForegroundColor Green
Write-Host "    READY!" -ForegroundColor Green
if ($D365Url) {
    Write-Host "    Open: $D365Url/WebResources/gensoft_AndroidCellPhone_ACS" -ForegroundColor Green
}
Write-Host "  ═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
