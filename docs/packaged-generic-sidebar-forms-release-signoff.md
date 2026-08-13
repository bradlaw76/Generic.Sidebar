# Generic Sidebar Packaged OOB Forms — Release Sign-Off

**Release version:** ____________________  
**Solution name:** ____________________  
**Solution type:** ☐ Unmanaged build ☐ Managed release  
**Environment:** ____________________  
**Build/export date:** ____________________  
**Tester:** ____________________  
**Approver:** ____________________  
**Result:** ☐ Approved ☐ Approved with follow-up ☐ Rejected

## Release scope

This release packages new standard main forms that automatically open Generic Sidebar through `Generic_OpenSidebar`.

| Table | Logical name | Required packaged form | Present in solution | Published |
| --- | --- | --- | --- | --- |
| Case | `incident` | `Case Generic.Sidebar` | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Account | `account` | `Account Generic.Sidebar` | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Contact | `contact` | `Contact Generic.Sidebar` | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Lead | `lead` | `Lead Generic.Sidebar` | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Opportunity | `opportunity` | `Opportunity Generic.Sidebar` | ☐ Yes ☐ No | ☐ Yes ☐ No |

## Form implementation verification

Complete every row before exporting the managed solution.

| Required configuration | Case | Account | Contact | Lead | Opportunity |
| --- | --- | --- | --- | --- | --- |
| Form type is Main | ☐ | ☐ | ☐ | ☐ | ☐ |
| Form is a new standard form, not an edited OOB primary form | ☐ | ☐ | ☐ | ☐ | ☐ |
| Label exactly matches release scope | ☐ | ☐ | ☐ | ☐ | ☐ |
| Baseline fields and sections are usable | ☐ | ☐ | ☐ | ☐ | ☐ |
| `sidebar_sidebar.js` included as form library | ☐ | ☐ | ☐ | ☐ | ☐ |
| `Generic_OpenSidebar` registered for OnLoad | ☐ | ☐ | ☐ | ☐ | ☐ |
| Execution context passed to handler | ☐ | ☐ | ☐ | ☐ | ☐ |
| Form saved and published | ☐ | ☐ | ☐ | ☐ | ☐ |

## Shared sidebar prerequisites

| Check | Result | Evidence / notes |
| --- | --- | --- |
| One intended `sidebar_default = Yes` configuration row exists | ☐ Pass ☐ Fail | |
| Test users can read active parent configuration row | ☐ Pass ☐ Fail | |
| Test users can read active linked-agent rows, where used | ☐ Pass ☐ Fail | |
| Inactive child-agent rows have `sidebar_isactive = No` or inactive state and do not render | ☐ Pass ☐ Fail | |
| `sidebar_agentmenutab` targets expected tab, where used | ☐ Pass ☐ Fail | |
| SSO configuration contains no browser client secret | ☐ Pass ☐ Fail ☐ N/A | |

## Runtime validation

Run in hosted Dynamics; do not use a `file://` preview.

| Test | Case | Account | Contact | Lead | Opportunity |
| --- | --- | --- | --- | --- | --- |
| Open a record using the packaged Generic.Sidebar form | ☐ | ☐ | ☐ | ☐ | ☐ |
| Sidebar opens automatically after form OnLoad | ☐ | ☐ | ☐ | ☐ | ☐ |
| Sidebar loads panels from shared default configuration | ☐ | ☐ | ☐ | ☐ | ☐ |
| Pane opens without JavaScript error | ☐ | ☐ | ☐ | ☐ | ☐ |
| Linked-agent panel behavior is correct, where enabled | ☐ | ☐ | ☐ | ☐ | ☐ |
| Existing non-SSO embed renders correctly | ☐ | ☐ | ☐ | ☐ | ☐ |
| SSO-enabled configuration routes correctly, where enabled | ☐ | ☐ | ☐ | ☐ | ☐ |

## OOB primary-form safety

| Check | Case | Account | Contact | Lead | Opportunity |
| --- | --- | --- | --- | --- | --- |
| OOB primary form is still present | ☐ | ☐ | ☐ | ☐ | ☐ |
| OOB primary form was not edited for this release | ☐ | ☐ | ☐ | ☐ | ☐ |
| Form order/default selection changed only if explicitly approved | ☐ | ☐ | ☐ | ☐ | ☐ |

**Approved form-order changes:** ____________________________________________

## Import and export verification

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Unmanaged source solution export contains all five form components | ☐ Pass ☐ Fail | |
| Managed release solution was exported from the approved unmanaged source | ☐ Pass ☐ Fail | |
| Managed solution imports successfully into clean target environment | ☐ Pass ☐ Fail | |
| Imported solution contains all five expected forms | ☐ Pass ☐ Fail | |
| Web resource dependency `sidebar_sidebar.js` resolves after import | ☐ Pass ☐ Fail | |
| All customizations published after import | ☐ Pass ☐ Fail | |
| Hard refresh completed before final runtime test | ☐ Pass ☐ Fail | |

## Security and evidence

1. Do not include access tokens, Direct Line tokens, full token endpoint query strings, or browser client secrets in this document.
2. Attach sanitized screenshots showing each form in the solution and sidebar runtime success.
3. Record relevant console errors without sensitive values.
4. Retain the solution artifact name, version, and source-control commit/tag used for this release.

**Artifact / commit / tag:** _________________________________________________

**Evidence location:** ______________________________________________________

**Known issues or approved follow-up:** ______________________________________

## Final approval

**Tester signature/name:** ____________________  **Date:** ____________________

**Release approver signature/name:** ____________________  **Date:** ____________________
