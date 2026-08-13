# Azure Resources Reference

## Required Resources (ACS Real Calling Mode)

### 1. Resource Group

```bash
az group create \
  --name rg-sidebar-acs \
  --location eastus
```

### 2. Azure Communication Services

```bash
az communication create \
  --name acs-sidebar-phone \
  --resource-group rg-sidebar-acs \
  --location global \
  --data-location unitedstates
```

After creation, retrieve the connection string:
```bash
az communication list-key \
  --name acs-sidebar-phone \
  --resource-group rg-sidebar-acs \
  --query "primaryConnectionString" -o tsv
```

### 3. Storage Account (required by Function App)

```bash
az storage account create \
  --name stsidebaracs$(openssl rand -hex 4) \
  --resource-group rg-sidebar-acs \
  --location eastus \
  --sku Standard_LRS
```

### 4. App Service Plan

```bash
az appservice plan create \
  --name plan-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --location eastus \
  --sku B1 \
  --is-linux
```

For free tier (cold starts):
```bash
az appservice plan create \
  --name plan-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --location eastus \
  --sku Y1 \
  --is-linux
```

### 5. Function App

```bash
az functionapp create \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --plan plan-sidebar-acs \
  --storage-account <storage-name> \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4
```

### 6. App Settings

```bash
az functionapp config appsettings set \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --settings "ACS_CONNECTION_STRING=<your-connection-string>"
```

### 7. CORS Configuration

```bash
# Remove wildcard (if present)
az functionapp cors remove \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --allowed-origins "*"

# Add your D365 domain
az functionapp cors add \
  --name fn-sidebar-acs \
  --resource-group rg-sidebar-acs \
  --allowed-origins "https://YOURORG.crm.dynamics.com"
```

## Phone Number

Phone numbers **cannot** be purchased via CLI — Azure Portal only.

Portal URL: `https://portal.azure.com/#view/Microsoft_Azure_Communication/PhoneNumbersManagement`

| Setting | Value |
|---------|-------|
| Country | United States |
| Number type | Geographic |
| Capabilities | Outbound calling |
| Cost | ~$1/month |

## Cost Breakdown

| Resource | SKU | Monthly Cost |
|----------|-----|-------------|
| ACS Resource | Pay-per-use | Free |
| Geographic Phone Number | — | ~$1 |
| Function App | B1 | ~$13 |
| Function App | Consumption (Y1) | Free (pay-per-execution) |
| Storage Account | Standard LRS | ~$1 |
| PSTN Usage | — | ~$0.013/min |
| **Total (B1)** | | **~$15/month + usage** |
| **Total (Consumption)** | | **~$2/month + usage** |

## Endpoints Deployed

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/getAcsToken` | GET | Anonymous | Creates ACS identity, issues 24h token |
| `/api/serveAcsBundle` | GET | Anonymous | Serves ACS SDK JavaScript bundle (cached 24h) |

## NPM Dependencies

### Azure Functions (`azure-functions/package.json`)
- `@azure/communication-identity` ^1.3.1

### ACS Bundle (`acs-bundle/package.json`)
- `@azure/communication-calling` ^1.42.1
- `@azure/communication-common` ^2.4.0
- `esbuild` ^0.27.3
