{
  "system": {
    "name": "Generic.Sidebar",
    "version": "2.2.0",
    "versionKind": "repository architecture manifest",
    "status": "ACTIVE",
    "type": "core-with-optional-add-ins"
  },
  "purpose": {
    "summary": "Generic Sidebar Core is an independently installable, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps. Android Phone Simulator and Genesys Softphone Simulator are optional add-ins with separate deployment and validation lifecycles; they are not included in or required by the Core solution package."
  },
  "deploymentLayers": {
    "core": {
      "name": "Generic Sidebar Core",
      "solutionPackage": "GenericSidebar_1_0_0_5.zip",
      "solutionVersion": "1.0.0.5",
      "publisherPrefix": "sidebar",
      "sourceRuntimeVersions": {
        "web resources/sidebar_sidebar.html": "2.14.0 title marker; component header 1.0.0",
        "web resources/sidebar_sidebar.js": "2.5.0 runtime marker; component header 1.0.0"
      },
      "packagedRuntimeVersions": {
        "WebResources/sidebar_sidebarhtmlD3801FFD-F584-F011-B4CC-001DD8099980": "No embedded runtime version marker",
        "WebResources/sidebar_sidebarjsD2CAC84A-F484-F011-B4CC-001DD8099980": "2.3.0 runtime marker"
      },
      "runtimeAlignment": "BLOCKED: packaged and source HTML/JavaScript differ functionally; the ZIP is authoritative for installed behavior and no unified Core runtime version is established",
      "requiredDataversePrefix": "sidebar_",
      "excludedComponents": [
        "Android Phone Simulator",
        "Genesys Softphone Simulator",
        "GenericSoftphone solution",
        "gensoft_* Dataverse components"
      ],
      "packageBoundaryVerified": "2026-08-27"
    },
    "androidPhoneAddIn": {
      "name": "Android Phone Simulator",
      "optional": true,
      "version": "2.6.0",
      "file": "Generic.AndroidCellPhone/AndroidCellPhone.html",
      "deployment": "Standalone HTML or separately deployed Dynamics web resource",
      "corePackageMember": false,
      "dataverse": "Standalone mode has no Dataverse dependency; optional Dynamics configuration mode uses separately deployed gensoft_* components."
    },
    "genesysSoftphoneAddIn": {
      "name": "Genesys Softphone Simulator",
      "optional": true,
      "version": "Unresolved metadata: component header 1.0.0; embedded UI marker 1.7.1",
      "file": "SidecarItems/Genesys Softphone/Genesys Softphone.html",
      "deployment": "Separately deployed demo web resource",
      "corePackageMember": false,
      "interoperability": "Optionally interoperates with Android Phone Simulator through localStorage.genericSimCall."
    }
  },
  "compatibility": {
    "coreSolution": "1.0.0.5; packaged HTML unversioned and packaged JavaScript 2.3.0; development source HTML 2.14.0 and JavaScript 2.5.0; package/source runtime reconciliation remains blocked",
    "androidPhone": "2.6.0 - compatible as standalone or externally configured Core content; validation remains add-in scoped",
    "genesysSoftphone": "Current checked-in file - compatible as externally configured Core content; version metadata must be reconciled before add-in certification",
    "androidGenesysInterop": "After about three seconds Android 2.6.0 enters its local in-call state, writes outgoing RINGING with null startTime, and starts scripted demo transcript playback locally; this is not transcript capture and does not indicate a confirmed connection. Genesys may independently accept RINGING and transition the shared call to CONNECTED when answered, but Android does not observe or wait for that update"
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
