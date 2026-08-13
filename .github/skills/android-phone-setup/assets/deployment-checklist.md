# Deployment Checklist

Use this checklist to verify a complete installation of the Android Phone Simulator with ACS.

## Prerequisites

- [ ] Azure CLI installed (`az --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] PowerShell 7+ installed
- [ ] Azure subscription with create permissions
- [ ] D365 environment URL known

## Azure Resources

- [ ] Resource Group created
- [ ] Microsoft.Communication provider registered
- [ ] ACS Resource created
- [ ] ACS connection string retrieved
- [ ] Storage Account created
- [ ] App Service Plan created (B1 or Consumption)
- [ ] Function App created (Node.js 18, Functions v4)
- [ ] `ACS_CONNECTION_STRING` app setting configured
- [ ] CORS restricted to D365 domain (no wildcard `*`)

## Phone Number

- [ ] Geographic phone number purchased via Azure Portal
- [ ] Number has outbound calling capability
- [ ] Number noted: `+1__________`

## Function Deployment

- [ ] Azure Functions `npm install` completed
- [ ] ACS SDK bundle built via esbuild
- [ ] Bundle copied to `serveAcsBundle/` directory
- [ ] Functions zip-deployed to Function App
- [ ] `GET /api/getAcsToken` returns 200 with `{token, expiresOn, userId}`
- [ ] `GET /api/serveAcsBundle` returns 200 with JavaScript content

## Phone Configuration

- [ ] `ACS_TOKEN_URL` set to Function App URL
- [ ] `ACS_PHONE_NUMBER` set to purchased number
- [ ] Bundle URL accessible from browser

## D365 Deployment

- [ ] HTML uploaded as D365 web resource
- [ ] Web resource published
- [ ] Phone loads in D365 sidebar pane
- [ ] Settings screen accessible (gear icon)

## Verification

- [ ] Token endpoint accessible from D365 domain (no CORS error)
- [ ] ACS SDK bundle loads in browser
- [ ] Microphone permission granted
- [ ] Test call connects and has audio
- [ ] Genesys Softphone receives localStorage event
- [ ] Call card appears in sidebar on outgoing call
- [ ] Incoming call simulation works (via localStorage write)

## Security

- [ ] CORS is NOT set to wildcard `*`
- [ ] ACS connection string is server-side only (not in HTML)
- [ ] Function App auth level appropriate for environment
- [ ] Azure spending alert configured (optional but recommended)
