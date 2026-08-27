# Generic.Sidebar - Layered Binding Certification

**Overall Status:** NOT CERTIFIED
**Certification Document Version:** 0.3.0
**Core Spec:** `SPEC.md` 2.1.0
**Updated:** 2026-08-27
**Certification Date:** -

---

## Certification Rule

Generic Sidebar Core, Android Phone Simulator, and Genesys Softphone Simulator are separate deployment and certification scopes. Add-in implementation or validation MUST NOT be used to certify Core. Core certification MUST NOT imply that either add-in, the GenericSoftphone solution, or any `gensoft_*` component is installed or certified.

## Generic Sidebar Core Certification

**Status:** NOT CERTIFIED

- [ ] Core specification reviewed and approved
- [x] Core solution boundary identified as `GenericSidebar_1_0_0_5.zip`
- [x] Package inspected without modification on 2026-08-27
- [x] Package contains no Android, AndroidCellPhone, Genesys, Softphone, GenericSoftphone, or `gensoft_*` names or textual payloads
- [x] Package publisher prefix is `sidebar`
- [ ] All Core acceptance criteria met, including hosted Dynamics and SSO checks
- [ ] Open release-blocking Core security findings resolved
- [ ] Core release reviewer approval recorded

The verified package is solution `GenericSidebar` version 1.0.0.5. Its observed active web-resource versions are tracked independently as `sidebar_sidebar.html` 2.15.5 and `sidebar_sidebar.js` 2.6.0. No solution package was rebuilt, overwritten, imported, deployed, or published during this verification.

## Android Phone Simulator Add-in Certification

**Status:** NOT CERTIFIED
**Observed component version:** 2.8.2

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
