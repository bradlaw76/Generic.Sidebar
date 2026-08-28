<!--
=============================================================================
DOCUMENT:     Genesys Softphone Simulator Add-in Guide
FILE:         SidecarItems/Genesys Softphone/README.md
VERSION:      1.1.0
AUTHOR:       Generic.Sidebar Team
LAST UPDATED: 2026-08-27
ENVIRONMENT:  Markdown (GitHub / Docs)

-----------------------------------------------------------------------------
OVERVIEW
-----------------------------------------------------------------------------
Requirements, deployment, validation, and compatibility for the optional
Genesys Softphone Simulator add-in.

-----------------------------------------------------------------------------
CHANGELOG
-----------------------------------------------------------------------------
v1.1.0  2026-08-27  Align Android version and independent call-state behavior with the checked-in runtime
v1.0.0  2026-08-27  Initial add-in boundary and compatibility guide
=============================================================================
-->

# Genesys Softphone Simulator Add-in

## Status and Boundary

The Genesys Softphone Simulator is an optional demo add-in. It is not part of Generic Sidebar Core, is not required by Core, and MUST NOT be added to `GenericSidebar_1_0_0_5.zip`.

The checked-in runtime is `Genesys Softphone.html`. Its component header reports 1.0.0 while an embedded UI comment reports 1.7.1. This documentation preserves both observed identifiers; reconcile the runtime metadata before certifying or publishing a named Genesys add-in version.

## Requirements

| Capability | Requirement |
| --- | --- |
| Basic rendering | Modern browser or separately deployed Dynamics 365 HTML web resource |
| Call events | Access to `localStorage.genericSimCall` under the same browser origin as the event producer |
| Dynamics configuration | Separately deployed GenericSoftphone solution and read access to `gensoft_genericsoftphone` |
| Transcript completion | Update access to `gensoft_genericsoftphone.gensoft_transcriptcompleted` |
| Screen pop | Dynamics `Xrm.Navigation` and applicable Contact/Case privileges |

No `gensoft_*` requirement is inherited by Generic Sidebar Core.

## Deployment

1. Deploy `Genesys Softphone.html` as a separate demo web resource or host it independently for standalone testing.
2. If using Dynamics configuration, deploy the GenericSoftphone solution separately from Generic Sidebar Core and grant least-privilege access to the required `gensoft_*` fields.
3. Configure the Genesys URL as ordinary external or web-resource content in a Core panel when the two products are used together.
4. Keep all Genesys files and `gensoft_*` components out of the base Core solution package.
5. Validate Genesys and any joint Android workflow under the add-in acceptance sections in `TEST_ACCEPTANCE.md`.

## Android Interoperability

Android Phone Simulator 2.6.0 can initiate a same-origin event through `localStorage.genericSimCall`. After about three seconds on its Calling screen, Android enters its own local in-call state, writes the event, and starts its transcript immediately:

```json
{
  "state": "RINGING",
  "startTime": null
}
```

The current Genesys runtime may independently accept `RINGING` and manage its own ringing and answer flow. When the agent answers, Genesys changes the shared payload to `CONNECTED` and assigns `startTime`. Android 2.6.0 does not observe or wait for that update. The integration requires both components to share a browser origin; being displayed by the same Generic Sidebar Core instance does not by itself overcome cross-origin localStorage isolation.

## Compatibility Matrix

| Genesys version evidence | Generic Sidebar Core | Android Phone | Compatibility statement |
| --- | --- | --- | --- |
| Current checked-in file: header 1.0.0 / UI marker 1.7.1 | Solution 1.0.0.5; separately configured content only | 2.6.0 | Interface-compatible through independent Android `RINGING` publication and Genesys answer handling; validate and reconcile version metadata before certification |

## Validation

- Confirm the component loads without a Core package dependency.
- Confirm a `RINGING` payload with null `startTime` displays the ringing state.
- Confirm Answer writes `CONNECTED` and a non-null `startTime`.
- Confirm transcript and screen-pop behavior with a least-privilege Dynamics user when those features are enabled.
- Confirm Android interoperability only when both add-ins run under the same origin.
- Record results as Genesys or joint add-in evidence, never as Generic Sidebar Core certification.

## Known Limitations

- Current runtime version metadata conflicts and blocks a precise certified version label.
- localStorage events do not cross browser origins.
- Dynamics configuration and writeback require the optional GenericSoftphone schema.
- This is a simulator for demos, not a supported production telephony client.