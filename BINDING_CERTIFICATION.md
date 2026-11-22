# Generic.Sidebar - Layered Binding Certification

**Overall Status:** NOT CERTIFIED
**Certification Document Version:** 0.4.0
**Core Spec:** `SPEC.md` 0.2.0 (checked-in draft; not approved)
**Updated:** 2026-11-22 (artifact provenance and host dependency clarification only; no new certification)
**Certification Date:** -

---

## Certification Rule

Generic Sidebar Core, Android Phone Simulator, and Genesys Softphone Simulator are separate deployment and certification scopes. Add-in implementation or validation MUST NOT be used to certify Core. Core certification MUST NOT imply that either add-in, the GenericSoftphone solution, or any `gensoft_*` component is installed or certified.

## Generic Sidebar Core Certification

**Status:** NOT CERTIFIED

- [ ] Core specification reviewed and approved
- [x] Historical repository Core archive boundary identified as `GenericSidebar_1_0_0_5.zip` (not the current release)
- [x] Package inspected without modification on 2026-08-27
- [x] Package contains no Android, AndroidCellPhone, Genesys, Softphone, GenericSoftphone, or `gensoft_*` names or textual payloads
- [x] Package publisher prefix is `sidebar`
- [ ] Exact Core ZIP `solution.xml` host-component dependencies inventoried, including Microsoft first-party Customer Service prerequisites, and compatible target-environment versions verified
- [ ] Required host components available in an approved nonproduction environment and import acceptance evidenced
- [ ] All Core acceptance criteria met, including hosted Dynamics and SSO checks
- [ ] Open release-blocking Core security findings resolved
- [ ] Core release reviewer approval recorded

The historically inspected repository archive is solution `GenericSidebar` version 1.0.0.5. It is **not** the currently published Core release. The separate published `GenericSidebar_1_0_0_11.zip` identifies solution `1.0.0.11` (tag commit `fd1ac1fbb775443f6f9a5a2d6ea04aa5ddcad936`, GitHub asset SHA-256 `482cd5b5860b8858a6525616856225ff3c5bebb3263b5f79f577caa6d1a78942`). H003 inventory and drift evidence do not certify published-byte/source parity. The **historical 1.0.0.5 archive** has a packaged HTML resource without an embedded runtime version marker and packaged JavaScript marked 2.3.0. At the historical comparison point, the separate development sources were marked HTML 2.14.0 and JavaScript 2.5.0; that source/package drift was not certified. **Separately**, H004's **unpublished local 1.0.0.12** candidate was built from Core development sources marked HTML 2.16.0 and JavaScript 2.7.0 at `integration/h004-core-sso` (`32a2681207a8eb4491fe802059fc26bd1ec1fb42`). H004 reports four source-to-package resource matches and successful hosted mock CI, but neither is evidence of published 1.0.0.11 byte/source parity or authorized live Dynamics/Entra acceptance. Core certification remains blocked on those separate acceptance gates. No solution package was rebuilt, overwritten, imported, deployed, or published during this verification.

**Host-dependency boundary:** Core's exclusion of Android, Genesys, GenericSoftphone, and `gensoft_*` add-ins does **not** establish that the Core ZIP imports into an otherwise empty model-driven environment. The historical `GenericSidebar_1_0_0_5.zip` `solution.xml` contains Microsoft Customer Service host dependencies, including components associated with `msdynce_Service`, `msdyn_ModernCaseManagement`, and `msdyn_CSIntelligence`. This is an illustrative, not exhaustive, set: inspect the exact ZIP's dependency declarations and verify all required components/versions against the proposed environment before any separately authorized import. This prerequisite verification and any real-environment import remain **unchecked**, independently of the package/source drift blocker.

## Android Phone Simulator Add-in Certification

**Status:** NOT CERTIFIED
**Observed component version:** 2.6.0

- [x] Add-in is documented as optional and separately deployable
- [x] Outgoing contract documented as `state: "RINGING"` with `startTime: null`
- [ ] Standalone acceptance criteria met and evidence recorded
- [ ] Optional Dynamics/GenericSoftphone mode acceptance criteria met and evidence recorded
- [ ] Compatibility with the intended Core release validated
- [ ] Add-in release reviewer approval recorded

Android and GenericSoftphone implementation evidence is add-in evidence only. Neither is a Core package member or Core certification prerequisite.

## Genesys Softphone Simulator Add-in Certification

**Status:** NOT CERTIFIED
**Observed version metadata:** component header 1.0.0; embedded UI marker 1.7.1

- [x] Add-in is documented as optional and separately deployable
- [ ] Version metadata reconciled
- [ ] Standalone component checks completed
- [ ] Hosted Dynamics, transcript, and screen-pop checks completed
- [ ] Optional Android interoperability checks completed
- [ ] Add-in release reviewer approval recorded

## Historical Add-in Notes

These entries record prior implementation work; they are not Generic Sidebar Core certification evidence.

### 2026-03-05 - Add-in Components Deployed

- AndroidCellPhone.html 2.3.0: browser, fallback wallpaper/ringtone/transcript, Demo Panel URL config
- GenericSoftphone add-in schema: 13 columns on Table 1, 7 columns on Table 2, 3 demo profiles inserted
- Deployment script: `specs/main/scripts/create-dataverse-schema.ps1` tested and verified

### 2026-03-06 - Android 2.4.0 Lock Screen, Camera, and Documentation

- AndroidCellPhone.html upgraded to 2.4.0
- Lock screen with swipe-to-unlock gesture, power button lock/unlock, configurable wallpaper
- Camera screen with live webcam viewfinder, shutter flash, front/rear flip, and graceful fallback
- Comprehensive documentation created at `Generic.AndroidCellPhone/DOCUMENTATION.md`

### 2026-03-06 - Android 2.5.0 Settings and Standalone Profile Editing

- AndroidCellPhone.html upgraded to 2.5.0; later active file revisions are tracked by the component header
- Settings screen available through the gear icon or Ctrl+Shift+D
- Standalone profile and transcript editing persisted through localStorage
- Dynamics mode profile list remained read-only and managed in Dataverse
