# Generic Sidebar Designer

The Generic Sidebar Designer is a React and Fluent UI administration page for
the existing `sidebar_genericsidebar` and `sidebar_genericsidebaragent`
Dataverse tables.

It is an additive component:

- It does not create or modify tables, columns, forms, views, or records during deployment.
- It deploys one HTML web resource: `sidebar_/designer/index.html`.
- It appends one app navigation node: `sidebar_designer`.
- The existing Generic Sidebar entity navigation remains unchanged.

## Production deployment

The current deployment is in the Contact Center environment:

| Component | Value |
| --- | --- |
| Environment | `https://healthconnectcenter.crm.dynamics.com` |
| App | `Generic.Sidebar` |
| App unique name | `sidebar_GenericSidebar` |
| App ID | `a632a03f-146e-49c2-aa74-2a886566c6bd` |
| Web resource | `sidebar_/designer/index.html` |
| Web resource ID | `6f4ef48b-66be-f111-aaaf-0022482a0ee7` |
| Navigation ID | `sidebar_designer` |
| Sitemap ID | `ac529465-90d0-f011-bbd2-000d3a16efb6` |

Open the designer from the **Sidebar Designer** app navigation item or use the
[Dynamics-hosted designer route](https://healthconnectcenter.crm.dynamics.com/main.aspx?appid=a632a03f-146e-49c2-aa74-2a886566c6bd&pagetype=webresource&webresourceName=sidebar_%2fdesigner%2findex.html).

The production page:

- Loads the existing configuration and linked-agent rows through `Xrm.WebApi`.
- Uses the signed-in user's Dataverse table and row privileges.
- Saves configuration and agent changes in one atomic Dataverse `$batch`
  changeset.
- Uses loaded row ETags and reports a reload-required conflict instead of
  overwriting a concurrent update.
- Prevents the active default configuration from being directly unset and
  clears a previous default atomically when another configuration is promoted.
- Provides Overview, Tab 1-4, Linked Agents, Appearance, Validation, and an
  isolated sidebar preview.

## Live page versus demo data

Demo mode is intentionally selected only when the URL contains `?demo=1`. It
uses in-memory sample records, displays a yellow **Demo data** badge, and shows
zero-based sample GUIDs. It is for local visual validation only.

The live Dynamics page does not display the badge. It shows real configuration
IDs and persists authorized changes to Dataverse. An attached screenshot is
also static and cannot be clicked; use the app navigation item or the
Dynamics-hosted route above for the interactive page.

## Local development

```powershell
Set-Location .\sidebar-designer
npm install
npm run dev
```

Local development opens explicit demo mode with `?demo=1`. When that parameter
is absent, the application requires a model-driven app host and does not fall
back to sample data.

## Validate and build

```powershell
Set-Location .\sidebar-designer
npm run check
```

The command runs strict TypeScript checking, unit tests, and a production
single-file build. The output is `dist/index.html`.

The deployed build was validated with strict TypeScript, eight unit tests, and
the production single-file build. Deployment state and hashes are recorded in
`deployment/deployment-result.healthconnectcenter.json`.

## Review deployment without changing Dataverse

```powershell
.\deployment\deploy-sidebar-designer.ps1
```

Dry-run is the default. The deployment refuses if the live sitemap differs from
the reviewed baseline before the first installation.

## Deploy

```powershell
.\deployment\deploy-sidebar-designer.ps1 -Apply
```

The script uses the current Azure CLI identity, creates or idempotently updates
only the owned designer web resource, appends only the designer navigation
node, publishes those additions, and verifies their deployed hashes.

## Roll back

Rollback is intentionally gated:

```powershell
.\deployment\deploy-sidebar-designer.ps1 -Rollback -AllowDestructive
```

Rollback removes only `sidebar_designer` and the marked
`sidebar_/designer/index.html` resource. It does not restore a stale sitemap or
remove any other solution component.

## Operational troubleshooting

- **Demo data badge appears:** remove `?demo=1` and open the Dynamics-hosted
  route. Demo mode does not read or write Dataverse.
- **Attached image does not respond:** screenshots are documentation evidence,
  not an embedded application.
- **No configuration records are available:** verify the user can read
  `sidebar_genericsidebar` and that at least one row exists.
- **Linked agents are missing:** verify read access to
  `sidebar_genericsidebaragent`, the parent lookup, active state, and
  `sidebar_isactive`.
- **Save is disabled:** make a change and resolve blocking findings under
  **Validation**.
- **Save reports a concurrency conflict:** another user changed one of the
  loaded rows. Refresh, review the latest values, and reapply the edit.
