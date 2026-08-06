# Generic.Sidebar.Admin Refresh Tasks

**Version:** 1.0.0  
**Created:** 2026-08-06  
**Scope:** Contact Center environment, Generic.Sidebar.Admin unmanaged solution

## Completed in this refresh

- [x] Create a repository-managed source file for `sidebar_copilot_hosted_AgentInstrutions`.
- [x] Replace the external GitHub Pages iframe shell with a self-contained left-navigation installation guide.
- [x] Create a repository-managed source file for `sidebar_git_hub_release_tracker_genericsidebar`.
- [x] Replace unpinned Tailwind/Chart.js dependencies with a lightweight native JavaScript release tracker.
- [x] Add visible version/build footers to the hosted instructions, release tracker, welcome page, and admin survey.
- [x] Align component headers and changelogs for modified existing source files.

## Deployment tasks

- [ ] Add `sidebar_copilot_hosted_AgentInstrutions` to Generic.Sidebar.Admin if it is not already solution-aware.
- [ ] Update `sidebar_copilot_hosted_AgentInstrutions` from its repository source and publish.
- [ ] Add `sidebar_git_hub_release_tracker_genericsidebar` to Generic.Sidebar.Admin if it is not already solution-aware.
- [ ] Update `sidebar_git_hub_release_tracker_genericsidebar` from its repository source and publish.
- [ ] Update and publish `sidebar_welcome` from `web resources/sidebar_welcome.html`.
- [ ] Update and publish `sidebar_GenericSidebar_AdminSurvey` from `web resources/sidebar_GenericSidebar_AdminSurvey.html`.
- [ ] Hard refresh the model-driven application and verify each footer/build marker.

## Validation tasks

- [ ] Open the hosted instructions resource and verify left navigation scrolls to each section.
- [ ] Confirm installation steps match the current table schema and SSO runbook.
- [ ] Test the release tracker with network access; verify release rows, assets, download totals, and GitHub rate-limit error handling.
- [ ] Confirm the survey continues rendering above its version footer.
- [ ] Confirm no browser console errors or policy violations are introduced by any admin web resource.
- [ ] Record environment, deployment time, tester, and outcome in release evidence.

## Follow-up hardening

- [ ] Add all four admin web-resource source files to the Generic.Sidebar.Admin solution through a repeatable solution export/import workflow.
- [ ] Add an automated Dataverse content-hash verification step after web-resource deployment.
- [ ] Replace ad hoc web-resource publish calls with a reusable, source-to-Dataverse deployment script.
- [ ] Run Solution Checker and resolve any actionable findings before production promotion.
- [ ] Review GitHub API rate-limit requirements; if the tracker needs higher traffic, place an authenticated proxy/API behind server-side controls rather than embedding a token in the browser.
