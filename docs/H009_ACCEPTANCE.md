# H009 - Nonproduction integration and acceptance

Date: 2026-11-17. **Deployment readiness: BLOCKED; H009 remains in progress.**
Owner: Brad. Runner: existing Copilot SDK in VS Code session.
Baseline: `integration/h004-core-sso` at
`32a2681207a8eb4491fe802059fc26bd1ec1fb42`, draft [#25](https://github.com/bradlaw76/Generic.Sidebar/pull/25).
H000 [#21](https://github.com/bradlaw76/Generic.Sidebar/issues/21) remains the assignment authority.

This is a read-only deployment-readiness assessment and backup/export receipt,
not an import certificate or evidence of live acceptance.
The owner subsequently selected the exact Sandbox and authorized one pre-change
backup, read-only exports to owner-controlled storage, and evidence verification.
That stage completed; no application/schema/configuration resource was changed,
imported, published or deleted. No restore was performed.
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
| Environment type | Owner confirmed exact Sidebar `Sandbox`; similarly named v2 environment is `Production` | Only backup/export approved; v2 remains excluded |
| Identity privileges | Direct Basic User and System Administrator roles; import/export/publish customization, create/write web resource, entity and attribute, and parent-row CRUD grants observed | Capability evidence only, not owner authorization or an actual successful import |
| Dynamics apps | Customer Service Hub, Copilot Service workspace, and Generic.Sidebar app modules present | Required host application family is present; launch/form behavior untested |
| Existing solutions | Unmanaged `GenericSidebar` 1.0.0.0 and `GenericSidebarV2` 1.0.0.3 | Both share the parent table and all four Core resources; not isolated by solution name |
| Core resources | All four mapped resource names/types present, unmanaged | Current bytes exported and hashed in both pre-change ZIPs; shared payloads identical, not candidate parity |
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
  IDs. Both required parent/template identities also exist exactly. Importer
  resolution of those source role references remains unverified; do not describe
  the target roles as missing or create duplicate roles.
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
  A subsequent export-XML comparison checked type, required level, length,
  format, customization/security/source flags and default values. The only
  shared-field facet difference found was `sidebar_daysactive`: installed
  format `none`, candidate format omitted. Its calculation also gains a
  dependency on `sidebar_defaultstartdate`; the total-days formula is new.
  Calculated results and effective runtime metadata remain live-test gates.
  All six packaged relationship definitions match the exported definitions
  exactly. This does not certify complete effective layer compatibility.

### Classified component closure and compatibility

The actual ZIP has ten entries: solution/customization/content-type XML, two
formula XAML files, one flow JSON and four web-resource payloads. All are readable;
referenced flow/resource files are present. All four mapped resource comparisons
and recorded H004 artifact hashes pass. This establishes structural validity,
not successful importability in this Sandbox.

| Classification | Component or dependency | Finding and consequence |
| --- | --- | --- |
| PASS | Installed version/layer family | Core 1.0.0.12 is newer than unmanaged `GenericSidebar` 1.0.0.0. `GenericSidebarV2` 1.0.0.3 shares components; it is not an independent rollback layer. |
| PASS | Required Microsoft dependencies | Required provider families, tables, Case columns, four dependency views, Case form, Microsoft resources, controls and settings were found; presence is not behavior certification. |
| PASS | Sidebar form/view identities | All three existing Sidebar form IDs and all seven Sidebar view IDs are preserved. Six relationship definitions match the exports exactly. |
| PASS | App access role mapping | The two app role-map IDs are System Administrator/System Customizer **template** IDs, not missing target role IDs. Both templates exist; a live association query resolves the app to those two actual roles. No role change is indicated. |
| BLOCKED | CSR/CSR Manager dependency remapping | Names and required templates exist, but source-specific role-reference resolution by the importer has not been demonstrated. Do not infer either guaranteed failure or guaranteed remapping. |
| MISSING | Twelve Core parent fields | DateTime `sidebar_defaultstartdate`; text `sidebar_title1`-`sidebar_title4`; memo `sidebar_instructions2`-`sidebar_instructions4` and `sidebar_embedcode2`-`sidebar_embedcode4`; integer/calculated `sidebar_totaldayssincecreated`. These are supplied by Core, not a reason to run optional schema scripts. |
| BLOCKED | HTML/JS resource identities | Logical names/types match, but two GUIDs differ (below). Safe reconciliation must be established before import; no failed import has been claimed. |
| REQUIRES OWNER DECISION | Four resource payload updates | All four raw hashes differ from the installed exports, including logo/welcome. Raw byte differences alone do not prove semantic differences; text encoding/line endings can contribute. Updating shared resources affects both installed solutions. |
| MISSING | Core chart, flow and connection reference | The `Default Generic.Sidebar` chart, packaged default-record flow and its Dataverse connection reference are absent. They are included in Core; a working flow connection/owner is not. |
| BLOCKED | Effective managed/unmanaged layering | The active Case form is managed and customizable; Sidebar forms/app/resources are unmanaged. A read-only Case layer query returned no layer records, not proof of no layers. Full layer precedence/merge effects remain uncertified. |
| REQUIRES OWNER DECISION | Case/app collateral changes | Explicit CardFeed control removal, changed app component list and added app settings require remediation or explicit scope approval; see below. |
| MISSING | Enterprise schema/resources | All six resources, seven parent SSO fields, menu selector, child table and parent relationship are absent. The delivery ZIP cannot be imported. |
| BLOCKED | Enterprise identity/agent binding | Existing approved Entra registration/scopes/consent/redirect and published agent authentication/channel/token endpoint are unverified. Ten bot records do not close this gate. |
| BLOCKED | Browser origin isolation | Existing Core and linked-agent raw-HTML paths create unsandboxed `srcdoc` frames. C06 requires remediation and real browser/hosted proof; green characterization tests do not establish isolation. |

Private comparison JSON, generated query contracts and fresh read-only outputs
are kept separately from the immutable backup evidence. No tenant export,
identity inventory or raw configuration is included in this repository.

#### Web-resource identities

| Logical name | Installed GUID | Candidate GUID |
| --- | --- | --- |
| `sidebar_sidebar.html` | `4812e6a0-4c8f-f011-b4cc-001dd80db62a` | `d3801ffd-f584-f011-b4cc-001dd8099980` |
| `sidebar_sidebar.js` | `73c1e1b8-4c8f-f011-b4cc-001dd80db62a` | `d2cac84a-f484-f011-b4cc-001dd8099980` |

Logo `98c31835-328f-f011-b4cc-001dd809c7de` and welcome
`e0806af3-908d-f011-b4cc-001dd809c74f` identities match. Do not assume that
matching logical names make different HTML/JS GUIDs safe to import.

#### Case form and application impact

- Case form identity `cd0d48a0-10c6-ec11-a7b5-000d3a58b83a`
  (Enhanced full case form) is preserved. The candidate is a differential
  form payload, **not** a replacement full-form snapshot.
- It adds `sidebar_sidebar.js` and the `Generic_OpenSidebar` onload handler
  with execution context. The resource name is already present, but its
  candidate identity mismatch remains unresolved.
- It explicitly removes controlDescription
  `3ff9a528-dd50-4aca-8f10-2e5ed73513ad`. The captured effective form identifies
  this as `MscrmControls.CardFeedContainer.CardFeedContainer`, configured for
  form factors 0, 1 and 2. This is a confirmed collateral customization;
  resulting Case behavior has not been tested.
- Existing Modern Case Management onload/save and Copilot Case Summary onload
  handlers are in the snapshot. Their omission from a differential payload
  does **not** prove deletion; final handler merge/order remains untested.
- App unique name `sidebar_GenericSidebar` is preserved. The candidate lists
  only Sidebar table/sitemap components; the export additionally lists Case
  and two views. Import merge/removal semantics are unverified, so preservation
  of existing Case navigation cannot be certified.
- Candidate app settings additionally set `EnablePowerBIQuickReport`,
  `msdyn_TimelineCopilotForApps`, `msdyn_TimelineCopilotInteractions` and
  `NewLookOptOut` to false. Existing `AppChannel=1` and
  `msdyn_TimelineModernization=true` remain. Approve intended host/app scope,
  retained navigation, settings and event registration before configuration.

**Confirmed:** matching Case/Sidebar form and view identities, available resource
names, existing Customer Service applications. **Not confirmed:** safe resource
identity reconciliation, effective layer precedence, preservation of Case
controls/navigation/events, or unaffected existing Case functionality.

#### Packaged default-record automation

Core also includes `Generic.Sidebar - Manage Default Record`,
workflow `2c237473-988d-f011-b4cc-001dd809c7de`, category 5, with activated
metadata (`StateCode=1`, `StatusCode=2`). Its JSON is present and parses.
It references the included `new_sharedcommondataserviceforapps_5c9c4`
connection reference, connector `shared_commondataserviceforapps`; neither the
flow nor reference exists in the queried target.

The organization-scoped Dataverse trigger filters default Sidebar records with
no default-start date. Actions stamp that row's start date, list other default
Sidebar rows, and set their default flag false and start date null. Thus this
package is not schema/resources-only: enabling/binding the flow introduces
automatic **data writes**. Actual activation during import is untested.
An authorized connection, flow owner, licensing/DLP suitability, organization-level
read/write access and explicit activation decision are missing. Do not create a
connection, bind/enable this flow, or assume an import will leave it inert.
Prefer a separately reviewed, disabled automation scope until approved.

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

The required optional schema is:

- Parent: Boolean `sidebar_sso_enabled`; text `sidebar_auth_client_id` (100),
  `sidebar_auth_tenant_id` (100), `sidebar_auth_api_scope` (200),
  `sidebar_auth_token_endpoint` (500), `sidebar_auth_redirect_uri` (300),
  `sidebar_auth_scopes` (500); picklist `sidebar_agentmenutab` with None
  100000000 and slots 100000001-100000004.
- User-owned child `sidebar_genericsidebaragent`: primary `sidebar_name` (100),
  `sidebar_displayname` (150), `sidebar_tokenendpoint` (500),
  `sidebar_sortorder` (integer), `sidebar_isactive` (Boolean),
  `sidebar_description` (250), `sidebar_embedcode` (memo, 1048576),
  `sidebar_isdefaultagent` (Boolean), `sidebar_authscopeoverride` (300),
  `sidebar_agentkey` (100), `sidebar_iconurl` (500),
  `sidebar_agenttype` (choices 100000000-100000002), and lookup
  `sidebar_genericsidebarid`.
- Relationship:
  `sidebar_sidebar_genericsidebar_sidebar_genericsidebaragent`,
  referencing the parent primary ID.
- Resources: `sidebar_sso_bootstrap` and `sidebar_sso_setup` (JavaScript);
  `sidebar_sso_canvas`, `sidebar_sso_canvas_fallback.html`,
  `sidebar_sso_config_validator.html`, `vz_AgentSidePanelHTML.html` (HTML).

Core may operate with enterprise disabled. Linked-agent discovery/selection needs
its schema, picker, configured rows and permissions; authenticated agents also
need the SSO resources and approved identity binding. A non-SSO raw-embed agent
does not bypass the origin-isolation gate. No optional schema/resource can be
silently treated as a Core requirement or provisioned by importing the delivery ZIP.

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

## Proposed deployment sequence A-H - NOT EXECUTED

Every tenant write below requires a **new exact owner authorization**. The unchanged
1.0.0.12 package is not recommended for import while the gates above remain open.
Any remediation creates a new reviewed artifact/hash; never overwrite the
recorded H004 package or imply that its original hash covers changed content.

| Step | Exact scope and dependencies | Required permissions | Expected changes and validation | Rollback / decision point | Separate authorization |
| --- | --- | --- | --- | --- | --- |
| A. Prerequisites | Exact confirmed Sandbox/identity; four resource IDs; CSR references; effective Case/app layers; flow/reference/owner; approved artifact; backup and exports | Existing metadata/export access; authorized restore operator identified separately | Read-only recheck of drift, expiry/hashes, dependency closure and approved Case/app/flow/isolation decisions. Verify recovery coverage, not just backup existence | STOP if any identity/dependency/backup gate is open. Refreshing an expired backup is a separate write | Existing read-only scope only; new backup or archive destination needs approval |
| B. Schema preparation | Core owns the twelve parent fields, Canvas App choice and two formulas. Optional package owns seven SSO fields, menu selector, child table/fields/lookup/relationship | Offline authoring now; later customization/entity/attribute/relationship privileges for approved installation | Review definitions and package boundaries before import. Do not precreate duplicate Core fields or run either alternate-auth provisioning script. No enterprise schema is required for Core-only use | STOP on type/choice/relationship collision. Destructive schema removal is not rollback | Local implementation/package remediation and all tenant schema writes require separately approved scope |
| C. Core import | Only the reviewed Core artifact after A/B; four resources, parent schema/forms/views/chart, Case delta, app/sitemap/settings, flow/reference only if retained and approved | Import/customization privileges; connection/flow ownership and approved connector access if automation retained; publish permission is not publish authorization | Approved unmanaged upgrade only; preserve import job/log and compare exact schema, versions, identities and warnings. Do not auto-enable/bind automation. Publishing is separately scoped | STOP on unresolved dependency, unexpected flow activation, collateral Case/app change or resource mismatch; no automatic retry/uninstall | Explicit artifact hash, component/automation scope, import and any publish/connection operation |
| D. Optional enterprise | A-C plus separate reviewed enterprise solution; parent optional fields and child relationship before consumers; JS bootstrap/setup, canvas/fallback/validator, then picker | Approved solution/customization privileges; end-user table read plus lookup/append and fixture write rights as scoped | Install only approved enterprise solution; verify all six names/types and schema/choice values. Current delivery ZIP is never imported. Keep SSO disabled | STOP on incomplete schema/resource inventory. Removing a solution does not safely remove shared unmanaged components | Separate package choice/import/schema/resource scope; role changes never implicit |
| E. App/form configuration | Resolved Case identity/resource GUIDs; retained CardFeed and existing event/navigation policy; selected host app and synthetic configuration rows | Form/app customization and explicitly approved publish; scoped parent/child row writes | Apply only approved handler/app/menu settings, preserving existing identities and customer configuration. Compare effective XML/app membership and exercise existing Case onload/save/navigation | STOP at first unexpected control/event/app change. Restore captured values only after approval; Case XML alone is not an import package | Exact form/app/settings/publish and fixture operations |
| F. SSO configuration | Verified existing Entra app/resource scope/consent, SPA redirect, published agent/channel/token exchange, optional schema/resources, cloud/network compatibility | Authorized app/agent configuration owner and consent administrator where needed; scoped config write; no role escalation | Apply only separately approved settings, then validate authority, scopes, redirect and endpoint before enabling SSO. PKCE, no client secret or anonymous downgrade | STOP on mismatch/auth failure; disable only newly enabled test configuration after approval. Revert configuration from approved snapshots; consent/token issuance cannot simply be undone by solution rollback | Separate Entra/agent/auth changes and sign-in/test transmission; none authorized now |
| G. Functional validation | A-F as applicable; marked two-/four-tab and linked-agent fixtures, approved test identities; isolated origin tests | Scoped config/Case CRUD and agent/channel use; representative non-admin identity only if approved | Run C01-C06, S01-S04, A01-A04 and D01-D04; retain redacted expected/actual/browser/time/hash/job evidence. Core-only tests precede optional enablement | STOP on token exposure, origin access, Case regression or unintended automation writes. Capture evidence and seek source-fix/retest approval | Exact live tests, fixture data writes, sign-in/conversations and cleanup |
| H. Recovery decisions | Verified pre-change evidence, complete changed-component inventory and restore operator; before import, after Core, before SSO and on any failed gate | Export/read for diagnosis; separately approved customization/data/flow/restore privileges for recovery | Compare changed components; choose narrowly approved value/resource restoration or full Sandbox restore. Revalidate baseline and record residual components/data | Old unmanaged ZIPs do not delete added components. Whole-Sandbox restore loses post-backup changes and expires with the backup; never auto-restore | Every rollback write, flow disable, cleanup or full restore needs explicit approval |

The current administrator has broad customization capability, but least-privilege
end-user access, flow connection permissions, Entra/agent administration and
restore permissions are not certified by that role assignment. Do not change
roles or identities to close these gates. Any later source repair stays with
existing H004/H007 ownership, with focused tests and draft PRs targeting `main`.

## Authorized backup/export receipt - 2026-11-17

The owner approved only the exact Sandbox's pre-change backup, read-only local
exports and verification. Existing PAC identity and tenant were retained; every
environment-specific command targeted the confirmed Sandbox explicitly, without
changing the saved active environment.

- One labeled manual backup was created and independently listed. PAC reports
  a seven-day interval, expiring **2026-11-24 18:36:22** as printed, without a
  timezone. No asynchronous operations were reported afterward. Backup ID and
  exact target/identity evidence remain in local owner-controlled storage.
- Exported unmanaged `GenericSidebar` **1.0.0.0**, 25,570 bytes, SHA-256
  `EA861B278E970E3F3081694C05B6463ACDA81878D054CE6D4B269E3DEB5CB403`.
- Exported unmanaged `GenericSidebarV2` **1.0.0.3**, 27,557 bytes, SHA-256
  `6E79270503A89D7D71F303FFA89D44A4AC4741C476B88B8D15E95D3451542800`.
- Read all archive entries, parsed XML/XAML, checked solution identity and all
  four mapped resources per ZIP, and verified identical shared payloads.
  Three Sidebar forms and parent schema are present in each; V2 includes the
  Sidebar application/sitemap/settings/role maps.
- Export coverage verification found that the affected Case form XML is absent
  from both solution ZIPs. Captured it separately via same-context read-only
  FetchXML, parsed and hashed it; no publishing or export retry was used.
  This separate XML is not an importable solution.
- Captured zero parent rows, absent child schema, component memberships,
  installed solution catalog, Sidebar forms and approved-user direct role
  assignments. Local manifest records verification and coverage limits.
- Backup storage was restricted to its existing owner, SYSTEM and Administrators.
  No raw tenant export/configuration/identity evidence was committed to GitHub.

Backup listing/export verification is not a restore drill or an import test.
Full component-layer history and restore operator permissions are not certified.
No approved Entra/agent settings were identified, exported or modified.

### Preservation recheck and durable storage

During this assessment all **32** original checksum records were reverified.
Both unmanaged exports and the standalone Case form remain available, unchanged.
The existing backup was independently listed again; its reported expiration is
still **November 24, 2026, 18:36:22**, with no timezone printed.
No replacement backup, export overwrite, cleanup, worktree pruning or tenant
change was performed. No Git locks were found; existing backup refs and dirty
SSO work were preserved.

No already configured and authorized durable archive destination was found in
the inspected repository configuration/handoffs. The access-restricted session
evidence remains the current copy, not a certified independent durable archive.
Propose the owner-local, non-shared directory
`%USERPROFILE%\Generic.Sidebar-Backups\H009\2026-11-17` for confirmation.
Do not create/copy there until approved; if approved, preserve original files,
restrict access to owner/SYSTEM/Administrators and verify all copied hashes.
A separate approved organizational archival destination may be preferable.

## Backup, rollback, and impact gate

Before any later import proposal, confirm the verified backup still exists and
has not expired, verify restore operator permissions/availability, close remaining
dependency/schema gaps, and obtain separate owner authorization for exact changes.
The initial discovery created no backup; the later explicitly approved stage did.

Also export unmanaged `GenericSidebar` and `GenericSidebarV2`, all affected
resource bytes/metadata, parent/child schema and rows (including an explicit
zero-row snapshot if still empty), relevant Case and Sidebar form/app definitions,
solution layering, role assignments, and selected Entra/Copilot settings.
Keep sensitive configuration in owner-controlled local storage; record hashes,
not tokens, secrets, HAR authorization headers or customer data in GitHub.
The approved backup and local exports above have now been performed. They are
snapshots, not proof of full layer-history coverage or recoverability; recheck
for environment drift and expiry before any future change.

Verify backup IDs, export readability/hashes, and restore operator permissions
before writes. A successful backup is not a tested restore; an actual restore
drill needs separate authorization and an approved isolated destination.

Expected impact: shared unmanaged table and four resources can affect **both**
installed Sidebar solutions and existing Case form/app integration. Core adds
twelve currently missing fields, two formula definitions and a file-type option,
and includes chart/app/Case/automation changes described above. Optional enterprise
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
| C06 | Raw-embed content cannot read/write `parent.document`, access `parent.Xrm`, or read host storage/cookies; an approved legacy embed still renders | NOT RUN / BLOCKED; known unsandboxed `srcdoc` paths | Source mitigation and actual browser/hosted isolation proof; jsdom alone is insufficient |
| S01 | Approved enterprise user authenticates; intended agent receives correct delegated identity and conversation | Simulated acquire/exchange pass, not live SSO | Verified app, scope, consent, agent and network |
| S02 | Authority, resource scopes, redirect and exact exchange endpoint match approved settings; mismatched resource/untrusted endpoint rejected | Local pass | Configuration review and hosted negative fixtures |
| S03 | Expired/replayed handoff, invalid state, cancellation and token failure show actionable error; never anonymous conversation | Local expired/failure pass | Controlled session expiry/cancel tests; do not revoke tenant credentials |
| S04 | No bearer in URL/history, pane navigation, console or application logs; exchange bearer only in authorized header | Local in-memory handoff/header checks pass | Redacted browser inspection; never attach raw tokens/HAR |
| A01 | Discover active parent-linked agents; inactive excluded; selection loads chosen approved agent | Local pass | Child schema, permissions, approved rows |
| A02 | Place picker in each of four slots without replacing siblings; switch away/back retains existing frames | Local pass | Hosted menu choices 100000001-100000004 |
| A03 | Missing schema/resource, read denial, empty result and failed load are distinguishable; no preview/anonymous substitution in Dynamics | Local pass | Approved isolated fixtures/fault simulation, no shared-resource deletion |
| A04 | Agent selection/default/order/menu configuration survives approved save, reload and navigation and remains isolated to the intended parent/user | Local retained-frame coverage only, not Dataverse write persistence | Approved parent/child fixture CRUD and least-privilege identity |
| D01 | Import completes with expected solution version and no unresolved dependency; preserve import log | Package checks only | Dependency closure, backup and explicit import approval |
| D02 | Four Core and six optional resource names/types; expected schema/choices/lookup and forms available in intended app | Read-only partial inventory | Authorized install and post-install comparison |
| D03 | Existing configurations and Case/Sidebar integration unaffected; app launch, form event and side pane work | Not run | Baseline exports, approved hosted app and representative data |
| D04 | If automation is retained: approved default-row change stamps start date, clears only other approved default fixtures and preserves unrelated rows; unapproved flow remains disabled | Static JSON review only; NOT RUN | Separate flow binding/activation and data-write approval; no unintended import activation |
| R01 | Backup/export hashes and restore route verified; if drill approved, restore and recheck baseline | Backup listed and export hashes/coverage verified; restore route/permission and drill not certified | Any restore requires separate approval |

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
The current assessment reran runtime/schema/inventory validation and the actual
four-resource ZIP verifier and compared source/package hashes, XML dependencies,
form/app payloads and private exports. The previously passing 111 automated cases
and exact-head hosted CI remain historical local/CI evidence, not new live results.
No dependency install, solution rebuild, schema script or test deployment was needed.

Assessment commit `895f5a653baf52e14b0fe59dcdaba8bf241a2ffe` is published in
draft #26. Hosted [Core Windows/Ubuntu](https://github.com/bradlaw76/Generic.Sidebar/actions/runs/44156223115)
and [SSO/agents Ubuntu](https://github.com/bradlaw76/Generic.Sidebar/actions/runs/44156223111)
all passed at that exact commit. Fifteen local documentation links and
`git diff --check` passed. This publication receipt does not change runtime
source, package hashes or live acceptance status.

The hourly monitor's [H004 finding](https://github.com/bradlaw76/Generic.Sidebar/pull/25#issuecomment-6955624945)
and [H009 request](https://github.com/bradlaw76/Generic.Sidebar/pull/26#issuecomment-6956920608)
are acknowledged: [Core HTML](../web%20resources/sidebar_sidebar.html) and
[linked-agent HTML](../SO%20Sign%20In/vz_AgentSidePanelHTML.html) construct
unsandboxed `srcdoc` frames; the linked normalizer adds styling, not sanitization.
This corrects the earlier statement that no runtime defect warranted attention.
No exploit or tenant compromise is asserted. The unresolved isolation gate is
separate from C05 legacy compatibility. Current scope permits documentation/tests,
not runtime mitigation; coordinate any later repair with the existing H004/H007
writer and preserve exact-SHA backups before edits.

## Next executable task and H010 gate

Read-only readiness analysis is complete; deployment readiness is **BLOCKED**.
The next operation is not importing the unchanged package. Request owner approval
for bounded **local-only source/package remediation**, coordinated with existing
H004/H007 ownership: reconcile HTML/JS identities; remove or explicitly separate
the collateral CardFeed/app/settings and activated automation changes; address
raw-HTML origin isolation with focused regressions; and prepare the separate
optional solution only if that packaging scope is selected. No tenant impact is
expected from local repair. Preserve H004 and the original evidence; rollback
of local repair uses a new branch/exact-SHA checkpoint, never destructive reset
of shared or dirty worktrees.

Also request confirmation of the proposed durable archive destination/ACL/hash
copy scope above. These approvals would still **not** authorize import, deploy,
publish, restore, schema/data/role changes, flow connection/activation, Entra or
authentication changes. After remediation and remaining layer/role/identity/agent
evidence, present a new exact-hash, per-operation Sandbox authorization with
fresh backup validity and a certified recovery operator. Live acceptance is pending.

H009 is not Done. H010 release-candidate documentation/verification begins after
the required live scenarios pass; no release or production authorization is inferred.
