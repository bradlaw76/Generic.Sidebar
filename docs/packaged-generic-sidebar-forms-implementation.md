# Generic Sidebar Packaged OOB Forms Implementation

**Version:** 1.0.0
**Created:** 2026-08-06
**Scope:** Solution-packaged model-driven forms for Generic Sidebar (no post-install CLI required)

## Goal

Ship Generic Sidebar support for common out-of-box Customer Service and Sales tables as first-class solution components.

This implementation creates new main forms (not cloned forms) and wires the existing sidebar runtime entry point (`Generic_OpenSidebar`) directly in each form.

## Included tables and form labels

Create these forms in the solution:

1. Table `incident` -> form label `Case Generic.Sidebar`
2. Table `account` -> form label `Account Generic.Sidebar`
3. Table `contact` -> form label `Contact Generic.Sidebar`
4. Table `lead` -> form label `Lead Generic.Sidebar`
5. Table `opportunity` -> form label `Opportunity Generic.Sidebar`

## Form contract (required for each form)

1. Form type is Main form.
2. Form is a new standard form artifact (not a modified OOB primary form).
3. Add JavaScript library `sidebar_sidebar.js`.
4. Register `Generic_OpenSidebar` on form OnLoad.
5. Enable "Pass execution context as first parameter".
6. Publish form customizations after wiring.

## Runtime compatibility requirements

Do not change the core sidebar runtime behavior for this feature.

These runtime rules must remain true:

1. Sidebar configuration is still read from `sidebar_genericsidebar` default row fallback behavior.
2. Linked-agent rendering still depends on active child rows (`sidebar_isactive = true` and `statecode = 0`).
3. SSO and non-SSO routing behavior in `sidebar_sidebar.js` remains unchanged.
4. Existing OOB primary forms are not replaced or overwritten by this change.

## Dataverse maker steps (solution-native)

1. Open unmanaged solution used for packaging (`Generic.Sidebar` or `Generic.Sidebar.Admin`, based on your release flow).
2. Add the five OOB tables as existing components if not already present.
3. For each table, create a new Main form with the required label.
4. Build a baseline standard layout for usability (core fields + timeline/notes as appropriate).
5. Add form library `sidebar_sidebar.js`.
6. Add OnLoad handler `Generic_OpenSidebar` and pass execution context.
7. Save and publish each form.
8. Confirm each new form is listed as a solution component before export.

## Install-time behavior for admins

After solution import:

1. The five Generic.Sidebar forms are already present.
2. Admins can select these forms in app designer or table form order as desired.
3. No script is required to attach sidebar JS to these packaged forms.

## Configuration admin app behavior

The packaged forms do not contain their own panel or embed configuration. They all call `Generic_OpenSidebar`, which resolves the shared default record from `sidebar_genericsidebar`.

Administrators use the model-driven app that exposes the **Generic Sidebar Configuration** table to manage that shared experience:

1. Create or open a `sidebar_genericsidebar` record.
2. Mark exactly one intended record as default with `sidebar_default = Yes`.
3. Configure up to four shared panels through `sidebar_title1` through `sidebar_title4`, the matching instruction fields, and the matching embed-code fields.
4. Add active `sidebar_genericsidebaragent` child rows when an agent picker is needed.
5. Set `sidebar_agentmenutab` to select the panel slot used by the active linked-agent picker; use `None` or blank to retain legacy embeds.
6. Configure SSO fields only for SSO-enabled sidebar scenarios; browser client secrets must not be stored on the record.
7. Save the record and validate from any packaged Generic.Sidebar form.

Configuration changes affect every packaged form that uses the shared default record and normally do not require a form edit, web-resource deployment, or solution re-import.

For the optional `sidebar_agentmenutab` field, its exact local Choice values, and UI-only creation steps, see [agent-menu-tab-field-setup.md](agent-menu-tab-field-setup.md).

## Validation checklist summary

For each packaged form:

1. Open record on the `* Generic.Sidebar` form.
2. Confirm sidebar pane opens automatically from form OnLoad.
3. Confirm pane reads active sidebar configuration row.
4. Confirm SSO behavior matches config (SSO-enabled rows route through SSO path; others stay legacy).
5. Confirm switching to OOB primary form still works and remains unchanged.

## Release evidence

Capture and store:

1. Solution version and export artifact name.
2. Form IDs and labels for all five new forms.
3. Tester, environment, date/time, and pass/fail notes.
4. Any rollback actions taken.

Use [packaged-generic-sidebar-forms-release-signoff.md](packaged-generic-sidebar-forms-release-signoff.md) as the required release verification and approval record.

## Rollback

If regression occurs:

1. Re-import the previous managed solution version.
2. Publish customizations.
3. Re-validate sidebar open behavior on the previously supported form path.
