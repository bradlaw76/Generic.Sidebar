# H009 - Nonproduction integration and acceptance

Date: 2026-11-17. **Status: In progress; live acceptance blocked.**
Owner: Brad. Runner: existing Copilot SDK in VS Code session.
Baseline: `integration/h004-core-sso` at
`32a2681207a8eb4491fe802059fc26bd1ec1fb42`, draft [#25](https://github.com/bradlaw76/Generic.Sidebar/pull/25).
H000 [#21](https://github.com/bradlaw76/Generic.Sidebar/issues/21) remains the assignment authority.

This is preparation and read-only discovery, not an import certificate.
No tenant resource was created, changed, imported, published, or deleted.
No PR was merged and no release was published.
Environment identifiers, identity details, and the complete environment inventory
are retained in session-local evidence, not this repository.

## Preserved baseline

- No applicable `AGENTS.md` was found in the initial workspace ancestor chain
  or tracked integrated source. Repository Copilot instructions, H000, and
  [the persistent handoff](CHATGPT_HANDOFF.md) were read.
- Original dirty SSO workspace, all existing worktrees, and H004 source were
  left untouched. Preparation uses `docs/h009-nonproduction-acceptance`, an
  isolated worktree based on the exact verified H004 head.
- Remote `backup/20261117-h004-verified/integration/h004-core-sso` still points
  at `32a2681`; H008 verified backup points at `63df4d2`. All seven
  `backup/20261117-monitor-start/*` refs and both earlier H004 backups remain.
- PR #25 remains OPEN/DRAFT targeting `main` at the baseline above.
  Hosted Node 24 checks pass:
  [Core Windows/Ubuntu](https://github.com/bradlaw76/Generic.Sidebar/actions/runs/44127551958),
  [SSO/agents Ubuntu](https://github.com/bradlaw76/Generic.Sidebar/actions/runs/44127551714).
  Existing monitor publication receipt was read; no competing writer dispatched.

## Read-only environment findings

The existing PAC user/tenant was retained. Discovery explicitly targeted a
sidebar-named environment without selecting it or changing the saved PAC
context. The saved context points at a different application and must never
be used implicitly for H009 commands.

| Check | Observed result | Acceptance consequence |
| --- | --- | --- |
| Environment type | Sidebar sandbox candidate confirmed `Sandbox`; similarly named v2 environment is `Production` | Owner must select the target; v2 is excluded from H009 |
| Identity privileges | Direct Basic User and System Administrator roles; import/export/publish customization, create/write web resource, entity and attribute, and parent-row CRUD grants observed | Capability evidence only, not owner authorization or an actual successful import |
| Dynamics apps | Customer Service Hub, Copilot Service workspace, and Generic.Sidebar app modules present | Required host application family is present; launch/form behavior untested |
| Existing solutions | Unmanaged `GenericSidebar` 1.0.0.0 and `GenericSidebarV2` 1.0.0.3 | Both share the parent table and all four Core resources; not isolated by solution name |
| Core resources | All four mapped resource names/types present, unmanaged | Current server bytes/version have not been compared or backed up |
| Enterprise resources | All six exact optional logical names absent from the queried inventory | Enterprise cannot be enabled |
| Parent schema | Table exists; three active form types found | Metadata compatibility is partial, not certified |
| Parent configuration | Aggregate query returned zero rows | No existing customer two-panel configuration is available for live acceptance |
| Linked-agent schema | Child table absent; parent menu selector absent | Linked-agent acceptance blocked |
| SSO schema/config | Seven SSO fields absent from generated parent metadata; zero parent rows | Sidebar SSO is not configured in this candidate |
| Copilot Studio | Bot table present, aggregate count 10 | Does not prove a suitable published agent, channel, authentication, licensing, or token-exchange configuration |
| Entra | No existing authorized Graph application-registration read context established | App registration, delegated scope, consent, SPA redirect and agent binding remain unverified |

PAC application inventory returned `The destination service is unavailable`.
Dataverse app-module and installed-solution reads independently established the
application-family evidence above; they do not prove marketplace installation
state. Some exploratory FetchXML metadata fields and a `top` query were rejected;
corrected queries and PAC modelbuilder metadata reads succeeded. No access denial
was bypassed, identity changed, or write probe used.

## Artifact identity and dependency readiness

| Artifact | Verified identity | Ready for |
| --- | --- | --- |
| [Core ZIP](../GenericSidebar_1_0_0_12.zip) | Unmanaged 1.0.0.12; HTML 2.16.0 / JS 2.7.0; SHA-256 `971062A5A8C9A8D5B78BB0B4CF801096C7B695DEEF29D7B385A46FE283237C06` | Local package/source validation only; import remains gated |
| [Optional delivery ZIP](../GenericSidebarEnterpriseResources_1_0_0.zip) | Six resources/two schema scripts; SHA-256 `B583B0654E91E79EE2575520EE99D36A0FD71B9C7BF1622FED59C5CD9D0E3B37` | Source delivery only; **not an importable Dataverse solution** |

The Core verifier passed against the actual committed ZIP and all four mapped
resources. Optional inventory is defined in
[enterprise-resources.json](../config/enterprise-resources.json); the existing
bundle-builder regression verifies canonical UTF-8/LF source payloads.

### Core dependency and schema findings

The solution declares **51 dependency entries**, including Case/Customer Service
integration. It is not merely four independent web-resource uploads.

- The required solution-provider names were found, including Service,
  Customer Service Hub, Modern Case Management, Product Management,
  CS Intelligence, Service Management Controls, SLA, base controls, rich text,
  Timeline, application framework, and setting definitions.
  Provider version presence alone does not certify component compatibility.
- Both required entities, all 21 required Case columns, four required view IDs,
  the referenced Case form ID, two Microsoft web resources, all 11 distinct
  required control names, and all six required setting-definition names were found.
- Of three required role IDs, only Customer service app access matched exactly.
  CSR Manager and Customer Service Representative exist by name with different
  IDs. Their source IDs/parent mapping have **not** been validated for import.
  This is an unresolved dependency, not proof either of portability or absence.
- Package parent metadata has 47 attributes; live generated metadata has 39
  including auxiliary image fields. Twelve package attributes are absent live:
  `sidebar_defaultstartdate`, `sidebar_title1` through `sidebar_title4`,
  `sidebar_instructions2` through `sidebar_instructions4`,
  `sidebar_embedcode2` through `sidebar_embedcode4`,
  and `sidebar_totaldayssincecreated`.
  The counts are not a simple subtraction because server-generated auxiliary
  attributes differ.
- Nineteen shared `sidebar_` attributes have compatible broad generated types.
  Existing file-type values 172520000-172520002 and theme values
  172520000-172520001 match; the package adds Canvas App value 172520003.
  Lengths, required levels, calculated definitions, field security, form
  layering and relationship constraints are not fully verified by generated
  early-bound types. Do not call schema compatibility complete.

### Optional packaging decision and authentication prerequisites

Recommend a **separate unmanaged enterprise solution for sandbox acceptance**,
dependent on Core 1.0.0.12; evaluate managed distribution only for H010 after
live acceptance. Do not add optional schema/resources to Core or attempt to
import the current delivery ZIP. Owner approval of this packaging scope is
outstanding; no new enterprise solution was generated or installed.

The SSO provisioning script starts a new device-code/service-principal flow;
the agent script obtains Azure CLI credentials and defaults to adding components
to `GenericSidebar`. Neither is an approved executable path under the current
existing-PAC-only grant. Do not run them verbatim, obtain alternate credentials,
or accidentally fold enterprise components into Core. An approved same-context
administrator provisioning/package path is required first.

Before enterprise writes, identify the exact existing app and published agent:

1. Single-tenant browser app, correct tenant and client ID, authorization-code
   flow with PKCE, no browser client secret or implicit-flow workaround.
2. Authority used by source: `https://login.microsoftonline.com/<tenant-id>`.
   Validate cloud compatibility rather than substituting a sovereign authority
   unsupported by this source.
3. Delegated primary scope `api://<resource>/<scope>` and any additional scopes
   on the **same** resource; verify scope exposure, assignment and consent.
4. Explicit SPA redirect `<approved-org-origin>/WebResources/sidebar_sso_canvas`
   (logical name has no `.html`); verify actual MSAL popup/redirect behavior.
5. Approved Copilot Studio manual-auth/token-exchange configuration bound to
   that resource, published channel, exact bot/schema and token endpoint.
   Source requires HTTPS on an allowlisted Copilot host ending in
   `/directline/token`; configuration is not permission to transmit a bearer.
6. Network/CSP/popup policies for MSAL 2.38.3 from jsDelivr and Bot Framework
   Web Chat CDN; validate the actual cloud Direct Line service endpoints.
7. Agent table read permissions, parent lookup/append access as appropriate,
   scoped fixture write permissions, and correct parent menu choice values.

## Conditional execution order - not an import proposal or authorization

Stop before every write unless its exact environment and operation are approved.
Dependencies/schema must be resolved **before** proposing an import.

1. Owner selects the sandbox and approves backup/export scope. Reconfirm tenant,
   identity, environment type and exact package hash at execution time.
2. Capture complete backup and exports described below. Resolve role mapping
   and full metadata/layer compatibility. Do not install Microsoft dependencies
   or change roles to make a preflight pass without a separate approved scope.
3. Only after dependency closure, present the exact Core import operation and
   Case-form/app impact for owner authorization. Import Core 1.0.0.12 only;
   retain import job ID/log, dependency warnings and resulting version.
4. Verify Core schema/resources and scoped publishing requirements. With explicit
   approval, create clearly marked synthetic Core fixtures; enterprise remains
   disabled. Run Core acceptance before any optional setup.
5. After a separate optional packaging/configuration approval and verified
   artifact, provision/import enterprise schema first (parent SSO/menu fields,
   child table, parent lookup and choices), then bootstrap/setup JavaScript,
   canvas/fallback/validator HTML, and finally picker HTML. If packaged together,
   this is the internal dependency order, not multiple imports of the delivery ZIP.
6. Verify all six names/types and schema; grant only approved test-role access.
   Configure only the selected app/agent and marked test rows, enable enterprise
   only after dependency checks, then run SSO/agent acceptance.
7. Record defects, source fixes and focused retests on H009 branches/draft PRs
   targeting `main`. No merge, production operation or release is implied.

## Backup, rollback, and impact gate

Before import, obtain owner-approved full sandbox backup with timestamp/ID and
retention/restore availability verified. An environment backup request is a
tenant operation and was **not** executed during discovery.

Also export unmanaged `GenericSidebar` and `GenericSidebarV2`, all affected
resource bytes/metadata, parent/child schema and rows (including an explicit
zero-row snapshot if still empty), relevant Case and Sidebar form/app definitions,
solution layering, role assignments, and selected Entra/Copilot settings.
Keep sensitive configuration in owner-controlled local storage; record hashes,
not tokens, secrets, HAR authorization headers or customer data in GitHub.
Exports/backup are not yet performed.

Verify backup IDs, export readability/hashes, and restore operator permissions
before writes. A successful backup is not a tested restore; an actual restore
drill needs separate authorization and an approved isolated destination.

Expected impact: shared unmanaged table and four resources can affect **both**
installed Sidebar solutions and existing Case form/app integration. Core adds
twelve currently missing fields and a file-type option; optional enterprise
would add schema/resources and configuration. No production impact is authorized.

On failure: stop, keep job/error evidence, disable only newly enabled test
features, and restore only the explicitly captured configuration/resource/form
values after approval. Reimporting an older unmanaged solution does **not** remove
new columns/components and is not full rollback. Do not uninstall either shared
solution or delete tables/columns to simulate rollback. A full rollback requires
owner-approved sandbox restore to the verified pre-change backup, with explicit
acceptance of loss of changes made since the backup. No restore is preauthorized.

## Acceptance matrix

All **live** rows below are NOT RUN, even where local simulations pass.
Use unique synthetic fixture IDs; record expected/actual, UTC time, browser,
identity role, environment, package hash, import job and redacted evidence link.
Use a representative non-admin identity only if separately approved; administrator
success does not certify end-user least-privilege access.

| ID | Scenario and measurable pass condition | Evidence now | Live gate |
| --- | --- | --- | --- |
| C01 | All 15 nonempty combinations of slots 1-4 show exactly the configured panels in order; one panel has no tab bar | Local pass | Approved synthetic rows |
| C02 | Owner-provided existing two-panel customer fixture retains titles, embeds, instructions, sizing and starting selection | Legacy synthetic local pass only | No customer rows here; owner-approved sanitized representative fixture required |
| C03 | Switch all tabs; correct instructions/visibility; iframe identity and conversation survive switches and record navigation | Local pass | Hosted app test |
| C04 | Configured width/height and zoom; saved selection isolated per config; four-to-two reduction recovers stale selection | Local pass | Hosted app/storage test |
| C05 | Legacy URL, HTML, Copilot configurations and missing config preserve intended behavior | Local pass | Hosted compatibility fixtures |
| S01 | Approved enterprise user authenticates; intended agent receives correct delegated identity and conversation | Simulated acquire/exchange pass, not live SSO | Verified app, scope, consent, agent and network |
| S02 | Authority, resource scopes, redirect and exact exchange endpoint match approved settings; mismatched resource/untrusted endpoint rejected | Local pass | Configuration review and hosted negative fixtures |
| S03 | Expired/replayed handoff, invalid state, cancellation and token failure show actionable error; never anonymous conversation | Local expired/failure pass | Controlled session expiry/cancel tests; do not revoke tenant credentials |
| S04 | No bearer in URL/history, pane navigation, console or application logs; exchange bearer only in authorized header | Local in-memory handoff/header checks pass | Redacted browser inspection; never attach raw tokens/HAR |
| A01 | Discover active parent-linked agents; inactive excluded; selection loads chosen approved agent | Local pass | Child schema, permissions, approved rows |
| A02 | Place picker in each of four slots without replacing siblings; switch away/back retains existing frames | Local pass | Hosted menu choices 100000001-100000004 |
| A03 | Missing schema/resource, read denial, empty result and failed load are distinguishable; no preview/anonymous substitution in Dynamics | Local pass | Approved isolated fixtures/fault simulation, no shared-resource deletion |
| D01 | Import completes with expected solution version and no unresolved dependency; preserve import log | Package checks only | Dependency closure, backup and explicit import approval |
| D02 | Four Core and six optional resource names/types; expected schema/choices/lookup and forms available in intended app | Read-only partial inventory | Authorized install and post-install comparison |
| D03 | Existing configurations and Case/Sidebar integration unaffected; app launch, form event and side pane work | Not run | Baseline exports, approved hosted app and representative data |
| R01 | Backup/export hashes and restore route verified; if drill approved, restore and recheck baseline | Plan only | Backup approval; restore drill separate |

Missing dependency/read failures should be exercised using approved isolated
fixtures or browser interception, not deleting shared tenant components or
removing the operator's privileges.

## Executed local verification

Repeated against the unmodified integrated H004 worktree on Windows,
Node 22.23.5 / PowerShell 7.7.0:

| Command | Result |
| --- | --- |
| `npm test` | 44 passed: 39 Core runtime and 5 package cases |
| `npm run validate:runtime` | HTML 2.16.0 / JS 2.7.0, runtime/schema and six-resource optional inventory pass |
| `npm --prefix tests run check` | ESLint passes; 67 characterization/SSO/agent cases pass |
| `scripts\verify-core-package.ps1` | Actual unmanaged Core 1.0.0.12, four mapped resources pass |

These are simulated/static/artifact checks, not live Dynamics or Entra acceptance.
No runtime defect was established that warrants changing the verified H004 code.
No dependency install, solution rebuild, schema script or test deployment was needed.

## Next executable task and H010 gate

Obtain one owner decision selecting the exact sandbox and authorizing only the
pre-change backup/export stage (or continued read-only work). Confirm the approved
enterprise app/agent and packaging route before asking for their configuration
writes. Import/live tests remain blocked on dependency/schema closure and their
own exact operation approval.

H009 is not Done. H010 release-candidate documentation/verification begins after
the required live scenarios pass; no release or production authorization is inferred.
