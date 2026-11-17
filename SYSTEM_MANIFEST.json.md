{
  "system": {
    "name": "Generic.Sidebar",
    "version": "2.3.0",
    "solutionVersion": "1.0.0.12",
    "releaseArtifact": null,
    "candidateArtifact": "GenericSidebar_1_0_0_12.zip",
    "publishedReleaseVersion": "1.0.0.11",
    "status": "PRE_RELEASE",
    "type": "core-with-optional-enterprise-and-simulator-add-ins",
    "runtimeVersions": {
      "sidebar_sidebar.html": "2.16.0",
      "sidebar_sidebar.js": "2.7.0"
    },
    "enterpriseResourceInventory": "config/enterprise-resources.json",
    "liveAcceptanceVerified": false
  },
  "purpose": {
    "summary": "Independently installable Generic Sidebar Core with one through four configurable panels. Enterprise SSO and linked-agent resources have a separate optional source inventory and pending solution/import acceptance. Android, Genesys, ACS, GenericSoftphone and gensoft_* remain external optional add-ins, excluded from the Core package."
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
