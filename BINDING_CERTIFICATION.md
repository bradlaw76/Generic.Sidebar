# Generic.Sidebar — Binding Certification

**Status:** NOT CERTIFIED
**Spec Version:** 0.3.0
**Documentation Review:** 2026-10-08
**Certification Date:** —

---

## Certification Checklist

- [ ] Spec reviewed and approved
- [x] Sidebar core requirements implemented
- [x] Android Cell Phone Simulator implemented (v2.5.0)
- [x] Dataverse schema deployed (GenericSoftphone v1.0.0.11)
- [ ] All requirements implemented
- [ ] Test acceptance criteria met
- [ ] No known deviations from spec
- [ ] Copilot SSO/security acceptance checks completed in a real test tenant
- [ ] Deployed resources and solution package verified against current source
- [ ] Opt-in SDK host's constitution constraint resolved by an approved exception/amendment

## Notes

<!-- TODO: Capture evidence links for verification runs, screenshots, and release validation when certifying. -->

### 2026-10-06 — Copilot security documentation alignment (not certification)

- Chat host v0.2.0 supports opt-in `copilot:` panels, agent-requested Entra SSO,
  explicit MFA/consent popup fallback, exact resource/scope configuration, public
  metadata validation, pinned SDK integrity, and failure recovery.
- README, implementation notes, specs, manifest, UX invariants, and acceptance
  references now document these controls and their administrator trust boundary.
- Recorded implementation evidence: 25 mocked offline tests and a zero-alert
  CodeQL result; these are not live SSO, tenant authorization, or universal
  cloud/channel compatibility certification.
- No new packaged solution or live deployment evidence is recorded here.
  Status remains **NOT CERTIFIED**; execute the unchecked
  [acceptance checks](./TEST_ACCEPTANCE.md) and attach evidence before approval.

### 2026-03-05 — Sidecar Components Deployed
- AndroidCellPhone.html v2.3.0: browser, fallback wallpaper/ringtone/transcript, Demo Panel URL config
- Dataverse schema: 13 cols on Table 1, 7 cols on Table 2, 3 demo profiles inserted
- Deployment script: `specs/main/scripts/create-dataverse-schema.ps1` tested and verified

### 2026-03-06 — v2.4.0 Lock Screen, Camera & Documentation
- AndroidCellPhone.html upgraded to v2.4.0
- Lock screen with swipe-to-unlock gesture, power button lock/unlock, configurable wallpaper
- Camera screen with live webcam viewfinder (getUserMedia), shutter flash, front/rear flip, graceful fallback
- Comprehensive DOCUMENTATION.md created at `Generic.AndroidCellPhone/DOCUMENTATION.md`
- All spec files updated to reflect v2.4.0 features

### 2026-03-06 — v2.5.0 Settings Screen & Standalone Profile Editing
- AndroidCellPhone.html upgraded to v2.5.0 (prior version archived as AndroidCellPhone_v2.4.0.html)
- Replaced Demo Control Panel overlay with full Settings screen (accessible via gear icon or Ctrl+Shift+D)
- Standalone profile & transcript editing: add, edit, delete profiles with localStorage persistence
- D365 mode: profile list is read-only (managed in Dataverse)
- Removed call control buttons (Start Call, End Call, Skip Transcript) from settings
- All spec files updated to reflect v2.5.0 features
