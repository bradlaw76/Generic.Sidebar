# SSO v2 Integration Reconciliation

**Date:** 2026-08-13
**Branch:** `integration/sso-v2`
**Integration merge:** `a4203654fc4d8b0cd7b025c6ce7be8e2080ea552`
**Source recovery point:** `e1ff23ff08f2bc485a9e6d1e13d73cbd334e7575`

## Source Status

The integration branch preserves the complete `feature/sso-integration-v2` history and represents an integrated pre-release development state. Open findings GS-001, GS-003, GS-004, and GS-005 continue to block release and broad distribution; source integration does not close or waive them.

## Package Authority

`GenericSidebar_1_0_0_5.zip` is unchanged from the pre-integration `origin/main` baseline. It does not contain the integrated SSO, linked-agent, packaged-form, or Phase 3A source and is retained only as a historical package. It must not be deployed or presented as an authoritative build of this branch. Binary solution packaging is deferred until security remediation and release-candidate validation are complete.

## Artifact Decisions

- `web resources/# Code Citations.md` was removed from the integration tip. It was an unreferenced chat/transcript dump, declared its license as unknown, and had no project dependency, audit requirement, or documented provenance basis. Its historical content remains recoverable from commit `7bf8988` and the immutable feature branch.
- `SO Sign In/vz_reprosidebar.js` was removed from the integration tip. It was an unreferenced reproduction launcher targeting legacy `RWMCS` and `rwmcs_*` resource names rather than the current Generic.Sidebar runtime. Its historical content remains recoverable from commit `7bf8988` and the immutable feature branch.
- `Generic.AndroidCellPhone/AndroidCellPhone_v2.6.0.html` and `Generic.AndroidCellPhone/AndroidCellPhone_v2.8.2.html` remain as intentional phone archives documented by `Generic.AndroidCellPhone/ACS_SETUP_GUIDE.md`.

## Schema Reconciliation

Browser SSO uses MSAL public-client PKCE and seven browser-safe Dataverse fields. Documentation no longer instructs administrators to create or populate `sidebar_auth_client_secret`. Separate server-side integrations may use credentials in an appropriate server-side secret store; those credentials are not part of the browser sidebar schema.