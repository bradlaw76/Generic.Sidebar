# Generic Sidebar — Admin Validation Checklist

**Version:** 1.1.0
**Last Updated:** 2026-08-06
**Scope:** Generic Sidebar administration, packaged OOB forms, Dataverse configuration, linked-agent catalog, and SSO readiness.

## Validation boundary

This repository contains a functional non-SSO sidebar baseline. SSO source code is present but has **not** completed an end-to-end test in hosted Dynamics. Local `file://` previews cannot validate interactive Entra authentication, Dataverse permissions, or Copilot Direct Line token exchange.

The local `sidebar_sso_config_validator.html` resource checks supplied values only. It does not read Dataverse, authenticate a user, or call Copilot Studio.

## Restore baseline

The functional source checkpoint is tagged `admin-review-baseline-2026-08-05` on branch `feature/sso-integration-v2`.

```powershell
git restore --source admin-review-baseline-2026-08-05 -- .
```

## Required tracked artifacts

Verify these files are tracked before importing web resources:

- `web resources/sidebar_sidebar.html`
- `web resources/sidebar_sidebar.js`
- `web resources/sidebar_sso_bootstrap.js`
- `web resources/sidebar_sso_setup.js`
- `web resources/sidebar_sso_canvas.html`
- `web resources/sidebar_sso_config_validator.html`
- `web resources/sidebar_welcome.html`
- `web resources/sidebar_GenericSidebarAgent.html`
- `Add-SidebarSSOFields.ps1`
- `scripts/create-generic-sidebar-agent-table.ps1`
- `scripts/seed-generic-sidebar-agent-rows.ps1`

## Dataverse configuration

1. Confirm `sidebar_genericsidebar` has one intended `sidebar_default = Yes` row. If multiple default rows exist, correct the data; runtime selects the most recently modified row only as a deterministic safeguard.
2. Confirm users have read access to the active parent row and its active child agent rows.
3. Confirm only designated administrators have write access to configuration fields and `sidebar_acknowledged`.
4. Confirm `sidebar_genericsidebaragent` has a required lookup to its parent configuration.
5. Confirm agent rows that should render have both `sidebar_isactive = Yes` and active Dataverse state.
6. Confirm `sidebar_agentmenutab` targets the intended tab or is set to `None` to preserve legacy embeds.

## SSO local validation

1. Open `sidebar_sso_config_validator.html` as a deployed Dynamics web resource.
2. Enter Client ID, Tenant ID, API Scope, Token Endpoint, and Redirect URI.
3. Resolve every failed check before continuing.
4. Verify the redirect URI is registered as a SPA redirect URI in the same Entra app.
5. Do not put a client secret in browser-facing Dataverse configuration. Browser SSO uses public-client PKCE.

## Hosted Dynamics validation

1. Open a model-driven form in the target environment; do not use `file://` preview.
2. Test a non-SSO configuration first and confirm existing embeds still render.
3. Test the SSO configuration. First sign-in may require a popup; later sign-ins should be silent when the Entra session is available.
4. Confirm the Copilot Studio agent is published and Direct Line is enabled.
5. Confirm the selected linked agent routes to its expected token endpoint.
6. Confirm inactive child rows do not appear. If there are no active rows or the query fails, resolve the configuration issue rather than enabling a hardcoded fallback.
7. Test an account without configuration-write privileges and confirm it cannot acknowledge or edit configuration.
8. Record browser console errors without copying access tokens, Direct Line tokens, or full token endpoint query strings into tickets.

## Packaged OOB form validation

Validate that solution-packaged forms exist and run the sidebar automatically.

Expected packaged forms:

1. `Case Generic.Sidebar` (`incident`)
2. `Account Generic.Sidebar` (`account`)
3. `Contact Generic.Sidebar` (`contact`)
4. `Lead Generic.Sidebar` (`lead`)
5. `Opportunity Generic.Sidebar` (`opportunity`)

For each form:

1. Open a record on that specific `* Generic.Sidebar` form.
2. Confirm form OnLoad opens the sidebar without manual script registration.
3. Confirm sidebar renders expected panels from the active config row.
4. Confirm SSO and non-SSO routing still follows the configuration row.
5. Confirm linked-agent tab behavior still respects active child rows only.

Primary-form safety check:

1. Open the original OOB primary form for the same table.
2. Confirm OOB primary form remains available and unchanged unless admins intentionally changed form order.

## Publish and rollback

1. Import updated web resources and publish customizations.
2. Hard-refresh the model-driven app with `Ctrl+Shift+R`.
3. If a regression occurs, restore the Git checkpoint, re-import the known-good resources, and publish.

## Evidence to retain

- Git commit and tag used for the deployment.
- Dataverse schema and security-role screenshots or export.
- Screenshots proving the five packaged `* Generic.Sidebar` forms are present in the imported solution.
- Form-level validation evidence for each packaged OOB form.
- Validation date, environment, tester, and outcome.
- Sanitized console errors and screenshots; never retain bearer tokens.
