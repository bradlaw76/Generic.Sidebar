<!--
=============================================================================
DOCUMENT:     Quick Start — SpeckKit Code Standards
FILE:         code-standards/QUICK_START_FOR_PROJECTS.md
VERSION:      1.0
AUTHOR:       bradlaw76
LAST UPDATED: 2026-02-16

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Fast-track setup guide for applying SpeckKit code standards to a consumer
VS Code project. Provides exact copy-paste content for two setup files.

-----------------------------------------------------------------------------
REGISTRY ROLE
-----------------------------------------------------------------------------
- Quick bootstrap for code standards only (not UI references).
- For unified setup covering both, use SETUP_FOR_PROJECTS.md at repo root.
- Provides the minimal copilot-instructions.md and manifest content.

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.0  2026-02-16  Initial version
=============================================================================
-->

# Quick Start: Apply SpeckKit Code Standards to Your Project

**For any VS Code repo that wants AI agents to auto-apply comment headers and documentation standards.**

---

## What You'll Get

Every new component file your AI agent creates will automatically include a structured comment header documenting identity, architecture, features, security, and changelog — without you asking for it.

---

## Setup (2 Files)

### File 1 — `.github/copilot-instructions.md`

Create the `.github/` folder if it doesn't exist:

```bash
mkdir .github
```

Create `.github/copilot-instructions.md`:

```markdown
# Copilot Instructions

## Project Context

This project is governed by the SpeckKit registry.

## Code Standards (Auto-Apply)

This project follows SpeckKit code standards. When creating or modifying
component files, ALWAYS apply the component header comment block.

**Default: YES — apply automatically. Do NOT skip unless user explicitly opts out.**

### Standards

| Standard | Default | Source |
|----------|---------|--------|
| Component Header Block | Auto-apply | [Template](https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/comments/component-header-block.md) |

### Rules
1. Apply the component header comment block to every new component file.
2. Update CHANGELOG, LAST UPDATED, and VERSION when modifying existing components.
3. Fill in all bracketed values based on project context.
4. Do NOT skip the header unless the user explicitly says to omit comments.

### Agent Behavior Defaults

| Standard Type | Default | Behavior |
|--------------|---------|----------|
| Code Standards (comments) | **YES** | Apply automatically |
| UI References (Dynamics layouts) | **ASK** | Confirm with user first |

### Resources
- Code Standards Catalog: https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/CODE_STANDARDS_CATALOG.json.md
- Component Header Template: https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/comments/component-header-block.md
- Full Guide: https://github.com/bradlaw76/SpeckKit-Project-Development/blob/main/code-standards/HOW_TO_USE_CODE_STANDARDS.md
- Registry: https://github.com/bradlaw76/SpeckKit-Project-Development
```

### File 2 — `SYSTEM_MANIFEST.json.md`

Create or update at repo root:

```jsonc
{
  "system": {
    "name": "Your Project Name",
    "version": "0.1.0",
    "status": "DEVELOPMENT",
    "type": "hybrid"
  },
  "purpose": {
    "summary": "What this project does"
  },
  "registry": {
    "indexUrl": "https://github.com/bradlaw76/SpeckKit-Project-Development/blob/main/system-manifests/MANIFEST_INDEX.json.md",
    "projectId": "your-project-id"
  },
  "review": {
    "speckitEnabled": true,
    "scope": ["spec", "code-standards"]
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
  }
}
```

---

## Commit and Push

```bash
git add .github/copilot-instructions.md SYSTEM_MANIFEST.json.md
git commit -m "[SPECKKIT] Add code standards integration"
git push
```

---

## That's It

Your agent will now:
1. **Automatically** include the component header comment in new files
2. **Update** the changelog when modifying existing components
3. **Never skip** comments unless you tell it to

---

## Want UI References Too?

If your project also needs Dynamics 365 UI context, add this to the same `.github/copilot-instructions.md`:

```markdown
## UI References (Ask Before Applying)

This project may reference UI patterns from the SpeckKit UI Reference Catalog.
Before loading UI reference context, confirm with the user.

- Catalog: https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/ui-references/UI_REFERENCE_CATALOG.json.md
- Guide: https://github.com/bradlaw76/SpeckKit-Project-Development/blob/main/ui-references/HOW_TO_USE_UI_REFERENCES.md
```

And add `uiReferences` to your manifest (see `ui-references/QUICK_START_FOR_PROJECTS.md`).

---

## Finding Standards

```
code-standards/
├── CODE_STANDARDS_CATALOG.json.md    ← Browse all standards
├── HOW_TO_USE_CODE_STANDARDS.md      ← Full integration guide
└── comments/                         ← Comment standards
    └── component-header-block.md     ← The template
```
