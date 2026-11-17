# Generic.Sidebar ChatGPT Handoff

## Current state - 2026-11-17

Owner: Brad. Runner: Copilot SDK in VS Code. Approved GitHub identity: `bradlaw76`.
Canonical H000 register: [issue #21](https://github.com/bradlaw76/Generic.Sidebar/issues/21).
Earlier local milestones remain in Git history; this file records current state.

The owner explicitly authorized GitHub-only read/fetch, pushing completed
H003/H007/H008 branches, main-targeted draft PRs with dependencies, and factual
H000 updates. These operations succeeded without a new tool denial. This does
not authorize merges, releases, deployments, tenant/account changes, or other
previously denied operations.

## Published review milestones

All three branches were pushed without force or history rewriting. All PRs
are drafts targeting `main`, depend on #18, and remain partial workstreams.

| H | Branch | Implementation commit | Draft PR / status |
| --- | --- | --- | --- |
| H003 | `docs/h003-package-source-evidence` | `ffaf510258dcaad9facf8dc0d7b506694def4a77` | [#22](https://github.com/bradlaw76/Generic.Sidebar/pull/22): local package/source manifest; published-resource parity open |
| H007 | `fix/h007-linked-agent-load-errors` | `f330ded5f53e366a96f52b478d1d46643333f4a7` | [#24](https://github.com/bradlaw76/Generic.Sidebar/pull/24): dependency-error/default-config fix; packaging and baseline reconciliation open |
| H008 | `test/h008-multipanel-regressions` | `5715d185788882cf9174b165bb771d455ae044bb` | [#23](https://github.com/bradlaw76/Generic.Sidebar/pull/23): regression matrix and Core CI; remaining artifact/dependency gates open |

H008 milestone `03d8f79` and all original implementation commits are preserved.
Subsequent H008 commits maintain this handoff only. The canonical H000 body was
updated with partial-review statuses, evidence, dependencies, and next actions;
no H-number was created/reassigned or marked Done merely for publication.

## Verification repeated before publication

Local Windows / Node 22.23.5 / PowerShell 7.7.0:

- H003: saved manifest equals a fresh existing-verifier result; ZIP SHA-256
  matches the actual file; four mapped resources verified.
- H008: `npm test` **40 passed** (36 runtime + 4 package-verifier cases);
  `npm run validate:runtime` passed (HTML 2.15.3, JavaScript 2.6.0,
  14 capabilities, 10 indexed columns/form controls); package verifier passed.
- H007: `npm --prefix tests run check` passed lint and **46 tests**.
  Five cases reproduced the defects before the fix. Picker 2.1.3 now distinguishes
  table/read/config failures from successful empty results, does not substitute
  bundled agents after hosted initialization failure, and retains valid default
  configuration rows. Existing standalone preview remains unchanged.
- Hosted checks: no run/check results reported for these drafts at initial
  publication. All three PRs report `mergeStateStatus=DIRTY`; do not claim hosted
  Windows/Ubuntu or Node 24 CI passed. The SSO test manifest requests Node 24.
- No Dataverse import, live linked-agent/SSO test, or production acceptance.

## Artifact identity - do not conflate versions

- Local #18 baseline: unmanaged GenericSidebar **1.0.0.7**, SHA-256
  `D2D63699C2A87350C322C6402ADB4662E80304CD6D47CD6534043D48957F447C`.
- Published `GenericSidebar_1_0_0_11.zip` metadata: tag commit
  `fd1ac1fbb775443f6f9a5a2d6ea04aa5ddcad936`; asset size 61,873 bytes; digest
  `sha256:482cd5b5860b8858a6525616856225ff3c5bebb3263b5f79f577caa6d1a78942`.
- The artifacts differ. Release metadata is not published ZIP content/source
  parity. The H003 JSON is a dated local-baseline snapshot, not RC certification.

## H004 dependencies and scope blockers

Authorized refresh confirmed `origin/main=fbea924`, #18 head `28daba3`, #17
head `72e9495`, and `integration/sso-v2=d229a51`.

- H003/H008 stack on #18's nine unmerged commits and inherit its README conflict.
- Core/SSO conflict paths: `.gitignore`, `README.md`, `SYSTEM_MANIFEST.json.md`,
  both package manifests, and both `web resources/sidebar_sidebar` runtimes.
- H007's three-file task increment is relative to committed SSO base `7e09de7`.
  Its full main diff inherits 118 paths of broader SSO/designer/simulator history.
  This inherited content is **not approved by H007**; do not merge the full stack.
  H004 must selectively reconcile/isolate required changes first.
- Diagnostic `git merge-tree` runs did not change branches, indexes, worktrees,
  or PRs. No PR was merged, rebased, marked ready, or given auto-merge.

## H001/H002 boundaries

The unavailable readiness-report search is closed. No H001 implementation was
recreated. The H000 authorization-diagnosis comment, encountered during the
authorized register read, records historical D1-D4: mixed branch/release plus
unrelated standards fetch, overlapping inspection, readiness commit, and an
unrelated changelog fetch. Those original mixed chains were not replayed.
Current scoped GitHub success is not a blanket override of the historical control.
Do not fetch unrelated standards/changelogs or switch identities/access paths.

## Preservation and next eligible work

The original `feature/sso-integration-v2` workspace at `7e09de7` retains its 13
pre-existing modified files and two untracked paths. Core/SSO baseline worktrees,
the original H008 session checkout, and all completed commits remain intact.
Task worktrees and this handoff persist beside the original Generic.Sidebar
workspace; no tests or SSO implementation were duplicated.

Next: H003 published artifact/source provenance within the explicit read scope,
then H004 selective reconciliation planning. Keep drafts blocked from merge.
H005 customer/hosted acceptance, H006 integration, H007 package completeness,
remaining H008 gates, and H009/H010 acceptance remain open; tenant operations,
merges, release publication, and deployment require separate explicit approval.
