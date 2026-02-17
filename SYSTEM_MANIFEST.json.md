```jsonc
{
  "system": {
    "name": "Generic.Sidebar",
    "version": "1.0.5",
    "status": "ACTIVE",
    "type": "ux-demo"
  },
  "purpose": {
    "summary": "A flexible, table-driven side pane for Dynamics 365 Customer Service and other model-driven apps. Configure a single Dataverse table row to control instructions, embeds, icons, and theming — no custom HTML/JS per form."
  },
  "registry": {
    "indexUrl": "https://github.com/bradlaw76/SpeckKit-Project-Development/blob/main/system-manifests/MANIFEST_INDEX.json.md",
    "projectId": "generic-sidebar"
  },
  "review": {
    "speckitEnabled": true,
    "scope": ["code-standards"]
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
```
