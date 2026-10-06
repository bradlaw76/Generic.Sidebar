{
  "system": {
    "name": "Generic.Sidebar",
    "version": "2.1.0",
    "status": "ACTIVE",
    "type": "hybrid"
  },
  "purpose": {
    "summary": "A flexible, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps. Configure a single Dataverse table row to control instructions, embeds, icons, and theming — no custom HTML/JS per form. Includes sidecar components: Android Cell Phone Simulator (Samsung S25 Ultra, v2.5.0 — settings screen, standalone profile editing, lock screen, camera, browser, call flows) and Genesys Softphone for contact center demos. See Generic.AndroidCellPhone/DOCUMENTATION.md for full phone simulator technical docs."
  },
  "copilotChatHost": {
    "sourceVersion": "0.2.0",
    "documentationReviewed": "2026-10-06",
    "status": "OPT_IN_SOURCE_INTEGRATION_NOT_LIVE_CERTIFIED",
    "packagedInNewSolutionZip": false,
    "panelFormat": "copilot: followed by public JSON in an existing embed field",
    "resources": [
      "web resources/sidebar_sidebar.html",
      "web resources/sidebar_CopilotChatHost.html",
      "web resources/sidebar_CopilotChatHost.js",
      "web resources/sidebar_CopilotAuthRedirect.html"
    ],
    "security": {
      "authenticationAuthority": "Copilot Studio agent policy; no anonymous downgrade on SSO failure",
      "identityFlow": "Agent-requested Entra silent SSO, explicit popup for login/MFA/consent, original OAuth-card fallback",
      "exchangeBoundary": "Configured delegated scopes and exact bot OAuth-card resource URI match",
      "configuration": "Public metadata only; HTTPS and known sensitive-key validation; no client secrets or tokens",
      "identityEndpoints": "Allowlisted Entra cloud authorities and exact same-origin registered SPA redirect",
      "cache": "MSAL sessionStorage; no guarantee of per-panel identity-cache isolation",
      "sdkIntegrity": "Pinned Web Chat 4.19.1 and MSAL Browser 4.30.0 with SHA-384 integrity",
      "jsonFetch": "Omit credentials, no-store, reject redirects, 20-second timeout",
      "privacy": "Browser-visible URL-fragment metadata; integrated active-panel URL log redaction; generic host errors",
      "trustBoundary": "Trusted Dataverse configuration writers; general HTML embeds are not universally sanitized or sandboxed",
      "deploymentResponsibilities": "Tenant consent/redirect setup, CSP/CORS/cloud approval, secure token endpoint or separately operated broker"
    },
    "validation": {
      "recordedOfflineTests": 25,
      "liveTenantCertified": false,
      "acceptanceDocument": "TEST_ACCEPTANCE.md",
      "deploymentDocument": "COPILOT_SSO_IMPLEMENTATION_NOTES.md"
    }
  },
  "registry": {
    "indexUrl": "https://github.com/bradlaw76/SpeckKit-Project-Development/blob/main/system-manifests/MANIFEST_INDEX.json.md",
    "projectId": "generic-sidebar"
  },
  "review": {
    "speckitEnabled": true,
    "scope": ["spec", "ux", "acceptance"]
  },
  "codeStandards": {
    "source": "SpeckKit-Project-Development",
    "catalogUrl": "https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/CODE_STANDARDS_CATALOG.json.md",
    "standards": [
      {
        "id": "component-header-block",
        "url": "https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/comments/component-header-block.md",
        "defaultApply": true
      }
    ]
  },
  "uiReferences": {
    "source": "SpeckKit-Project-Development",
    "catalogUrl": "https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/ui-references/UI_REFERENCE_CATALOG.json.md",
    "references": [
      {
        "id": "dynamics365-contact-center-cases-grid",
        "url": "https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/ui-references/dynamics365/ui/contact-center-cases-grid.jsonc",
        "defaultLoad": false
      }
    ]
  }
}
