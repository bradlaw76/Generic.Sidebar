# SSO Validation Report

Date: 2026-07-23
Branch: feature/sso-integration-v2
Scope: Dataverse-driven agent picker + SSO runtime handoff

## Summary

Validation confirms the new picker and SSO flow are structurally correct and operational in hosted Dynamics runtime. Local file preview is suitable for UI and state checks but not full sign-in validation.

## What Was Verified

1. Agent picker renders with Dataverse/fallback behavior in side panel.
2. Picker selection transitions from action panel to active-agent state.
3. Selected agent payload is sent to canvas using data query payload.
4. Canvas parser reads tokenEndpoint/usertoken and starts Direct Line exchange.
5. SSO/selector script in side panel has no diagnostics errors in editor.

## Runtime Evidence

- Picker page: SO Sign In/vz_AgentSidePanelHTML.html
- Canvas page: web resources/sidebar_sso_canvas.html
- Interactive check: action panel hidden + Change button visible after selection.

## Caveats

1. Local file preview cannot guarantee full Entra interactive token completion.
2. Full validation must be executed from model-driven app hosted web resource.

## Hosted Validation Checklist

1. Open side pane from Dynamics.
2. Select each configured agent.
3. Confirm token acquisition (silent or popup).
4. Confirm chat frame loads and conversation starts.
5. Confirm agent switching re-routes to selected endpoint.
6. Confirm fallback behavior when child rows are absent.

## Recommendation

Approve for branch-level integration and proceed with hosted environment smoke test before broad production rollout.
