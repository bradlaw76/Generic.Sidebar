# Android Cell Phone Simulator

The Android Cell Phone Simulator is a self-contained Samsung S25 Ultra-style HTML application for contact-center demonstrations.

**Current application:** `AndroidCellPhone.html`  
**Current version:** 2.6.0  
**Deployment relationship:** Optional embeddable application; not part of the Generic Sidebar core solution

## What It Does

- Simulates outgoing and incoming call experiences.
- Runs in a browser without a build step.
- Uses embedded fallback data in standalone mode.
- Can read contacts, demo profiles, and softphone configuration from Dataverse when hosted in Dynamics 365.
- Exchanges simulated call events through `localStorage.genericSimCall`.
- Includes scripted transcript playback, an embedded browser, a camera viewfinder, a lock screen, and configurable demo settings.

This application is a demonstration interface. It is not a real mobile phone, VoIP endpoint, or production telephony client.

## Run Standalone

Open `AndroidCellPhone.html` directly in a browser or host it on a static web server. When Dynamics APIs are unavailable, the application uses its embedded demonstration data.

Some browser features, including camera access and iframe content, can require HTTPS and user permission.

## Deploy as a Dynamics Web Resource

1. Add `AndroidCellPhone.html` to the target solution as an HTML web resource.
2. Publish the web resource.
3. Open the web resource directly or reference it from another model-driven app experience.
4. Provision the optional `gensoft_*` Dataverse schema only when Dataverse-driven phone configuration and profiles are required.

## Embed in Generic Sidebar

After publishing the phone as a web resource:

1. Open the default **Generic Sidebar Configuration** record.
2. Choose the panel that should host the phone.
3. Set that panel's embed field to:

   ```text
   webresource:your_android_phone_web_resource_name.html
   ```

4. Set the corresponding title and optional instructions.
5. Save the configuration and reopen a form that uses Generic Sidebar.

You can also use a permitted hosted URL or iframe snippet. The target must allow iframe embedding.

## Optional Softphone Interoperation

The phone writes simulated calls to `localStorage.genericSimCall` with state `RINGING`. A compatible agent-side softphone can present the call for answer or decline and transition it to `CONNECTED`.

Because browser `localStorage` is origin-scoped, interoperating applications must run under the same origin and browser profile.

## Files

| File | Purpose |
| --- | --- |
| `AndroidCellPhone.html` | Current phone simulator application, version 2.6.0 |
| `AndroidCellPhone_v2.4.0.html` | Archived earlier application version |
| `DOCUMENTATION.md` | Detailed architecture, data model, behavior, and troubleshooting |

## More Information

- [Full documentation](./DOCUMENTATION.md)
- [Generic Sidebar repository overview](../README.md)
- [Dataverse schema](../specs/main/dataverse-schema.md)

## Limitations

- Simulation only; no real PSTN or VoIP calling.
- Dataverse mode depends on Dynamics 365 context and user permissions.
- Camera access depends on browser permissions and secure-context requirements.
- External sites can block the embedded browser or sidebar iframe.
