# Generic Sidebar Designer

The Generic Sidebar Designer is a React and Fluent UI administration page for
the existing `sidebar_genericsidebar` and `sidebar_genericsidebaragent`
Dataverse tables.

It is an additive component:

- It does not create or modify tables, columns, forms, views, or records during deployment.
- It deploys one HTML web resource: `sidebar_/designer/index.html`.
- It appends one app navigation node: `sidebar_designer`.
- The existing Generic Sidebar entity navigation remains unchanged.

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
