# Copilot Instructions

## SpeckKit Integration

This project is governed by the SpeckKit registry.

**Registry:** https://github.com/bradlaw76/SpeckKit-Project-Development
**Agent Defaults:** https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/AGENT_BEHAVIOR_DEFAULTS.jsonc

---

## Code Standards (Auto-Apply — DEFAULT YES)

When creating or modifying component files, ALWAYS apply the component header
comment block. Do NOT skip unless the user explicitly says to omit comments.

**Template:** https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/comments/component-header-block.md
**Catalog:** https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/code-standards/CODE_STANDARDS_CATALOG.json.md

### Rules
1. Apply the component header comment block to every new component file.
2. Update CHANGELOG, LAST UPDATED, and VERSION when modifying existing components.
3. Fill in all bracketed values based on project context.
4. Only skip if user explicitly says "no comments" or "skip header."

---

## UI References (Ask First — DEFAULT ASK)

UI references are available for platform-specific context. Confirm with the
user before loading.

**Catalog:** https://raw.githubusercontent.com/bradlaw76/SpeckKit-Project-Development/main/ui-references/UI_REFERENCE_CATALOG.json.md

### Available References

| ID | Platform | Path |
|----|----------|------|
| dynamics365-contact-center-cases-grid | Dynamics 365 | ui-references/dynamics365/ui/contact-center-cases-grid.jsonc |

### Rules
1. Ask: "Should I load UI reference context for [platform]?"
2. Only load if user confirms or the task clearly involves that platform's UI.
3. Use `reusablePatterns` for component conventions.
4. Use `visualIndicators` for color/badge mappings.

---

## Agent Behavior Summary

| Resource | Default | Action |
|----------|---------|--------|
| Code Standards (comment headers) | **YES** | Apply automatically |
| UI References (platform layouts) | **ASK** | Confirm with user |
