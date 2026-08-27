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
      "runtimeVersions": {
        "sidebar_sidebar.html": "2.15.5",
        "sidebar_sidebar.js": "2.6.0"
      },
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
      "version": "2.8.2",
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
    "coreSolution": "1.0.0.5",
    "androidPhone": "2.8.2 - compatible as standalone or externally configured Core content; validation remains add-in scoped",
    "genesysSoftphone": "Current checked-in file - compatible as externally configured Core content; version metadata must be reconciled before add-in certification",
    "androidGenesysInterop": "Android 2.8.2 writes outgoing RINGING with null startTime; the current Genesys file accepts RINGING and transitions to CONNECTED when answered"
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
