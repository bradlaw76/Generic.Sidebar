<p align="center">
  <img src="./screenshots/generic-sidebar-banner.png" alt="Generic Sidebar for Dynamics 365" />
</p>

# Generic Sidebar for Dynamics 365

Generic Sidebar is a configuration-driven side pane for Dynamics 365 and other model-driven apps. Administrators define panel titles, instructions, embeds, dimensions, and theming in Dataverse instead of hardcoding a different sidebar for every form.

**Current Generic Sidebar Core release:** v1.0.0.11

## Current Repository Scope

This repository contains the core Generic Sidebar solution plus optional applications and demo assets that can be embedded in it. These are separate deployment units.

| Component | Current artifact | Relationship to Generic Sidebar |
| --- | --- | --- |
| **Generic Sidebar Core** | Release v1.0.0.11 | The installable Dynamics 365 solution. The checked-in `GenericSidebar_1_0_0_5.zip` archive is an older build retained in the repository. |
| **Copilot Chat Host** | Source integration v0.2.0 | Optional `copilot:` panels with agent-requested Entra SSO. Requires publishing the updated renderer and host resources; not packaged in a new solution ZIP or live-tenant certified. |
| **Android Cell Phone Simulator** | `Generic.AndroidCellPhone/AndroidCellPhone.html` 2.6.0 | Optional standalone application that can be embedded as sidebar content. It is not included in or required by the core solution. |
| **Genesys Softphone and examples** | Files under `SidecarItems/` | Optional demo integrations and content. They are not core solution prerequisites. |

The versions above identify separate artifacts. Updating an embeddable application does not change the core solution version.

## Generic Sidebar Core

The core solution uses the `sidebar_genericsidebar` Dataverse table to provide a shared sidebar configuration.

### Capabilities

- Up to four configurable panels.
- Rich-text instructions for each panel.
- Embeds from:
  - External URLs
  - HTML or iframe snippets
  - Power Apps canvas apps
  - Copilot Studio experiences
  - Dynamics web resources
- Optional panel icons and theming.
- Sidebar-created panel iframes use `strict-origin-when-cross-origin` and an explicit permissions list. Stored iframe options are not a guarantee of runtime enforcement.
- Pop-out support for URL-based content.
- Shared default configuration selected through `sidebar_default`.

## Install the Core Solution

1. Obtain the Generic Sidebar Core v1.0.0.11 solution package.
2. Import the package into the target Dynamics 365 environment as a managed or unmanaged solution.
3. Open the **Generic Sidebar Configuration** table (`sidebar_genericsidebar`).
4. Create or select one configuration record and set `sidebar_default = Yes`.
5. Configure the first panel:
   - `sidebar_title1`
   - `sidebar_instructions`
   - `sidebar_embedcode`
6. Configure panels 2 through 4 with the corresponding numbered fields when needed.
7. Save the configuration and publish customizations.

An embed value can be an external URL, a `webresource:resource_name` reference, an iframe snippet, raw HTML, a Copilot Studio embed, or a Power Apps canvas app embed.

> The `GenericSidebar_1_0_0_5.zip` archive currently checked into this repository predates v1.0.0.11 and should not be presented as the current release package.

### Opt-in Copilot Studio chat and SSO (source integration, v0.2.0)

The source now supports `copilot:` followed by public JSON configuration in any
existing panel embed field (`sidebar_embedcode`, `sidebar_embedcode2`, etc.).
Existing URL, HTML, iframe, and webresource embeds are not migrated or changed.
This code is **not included in a newly exported solution package and is not
live-tenant certified**.

In a test environment, publish the updated `sidebar_sidebar.html` and these
three web resources under their exact names:

- `sidebar_CopilotChatHost.html`
- `sidebar_CopilotChatHost.js`
- `sidebar_CopilotAuthRedirect.html`

Set a test panel's embed field to the following shape, replacing both endpoint
placeholders with values for your published agent/channel:

```text
copilot:{"tokenEndpoint":"https://YOUR-AGENT-TOKEN-ENDPOINT","directLineDomain":"https://YOUR-DIRECT-LINE-HOST/v3/directline","title":"My agent"}
```

The sidebar carries that panel's public configuration in the host URL fragment,
including on pop-out. The host validates it and starts chat without setup controls.
No new Dataverse columns or JSON web resources are needed. Each panel can target
a different agent or environment.

For an anonymous agent, omit `auth`. For authenticated agents, add the documented
`auth` metadata and configure Copilot Studio/Entra token exchange and the exact
SPA redirect URL. Sign-in is attempted only when the agent requests it; required
MFA/consent prompts remain supported. An existing Dynamics session alone does not
guarantee silent SSO. A secured channel may also require a separate token broker.

Keep configuration public: never enter secrets or identity/conversation tokens.
Cloud endpoints, CORS, CSP, SDK access, and real tenant authentication must be
validated before rollout. Pop-out opens a new conversation; tab switching retains
the existing iframe/conversation.

See [implementation and integration notes](./COPILOT_SSO_IMPLEMENTATION_NOTES.md)
for configuration fields, validation requirements, deployment, and rollback.
Opening the host without a `copilot` fragment retains the standalone setup UI.

## Security and authentication

The controls below describe the **opt-in v0.2.0 chat host**, not every existing
iframe integration. Hosted-webchat examples and screenshots do not demonstrate
this SSO flow. Copilot Studio controls whether the agent requires authentication;
Entra policies and downstream services remain responsible for authorization.

| Implemented safeguard | Behavior |
| --- | --- |
| Agent-requested identity | Anonymous chat does not initialize MSAL. Matching bot OAuth token-exchange cards trigger silent acquisition; necessary login, MFA, or consent uses a user-initiated popup. Failed, canceled, or unsupported exchanges retain the original agent sign-in card, never anonymous downgrade. |
| Scoped token exchange | The host uses administrator-configured delegated scopes and requires an exact exchange-resource URI match. Identity access tokens are separate from Direct Line conversation tokens. `loginHint` and conversation user IDs are not proof of identity or authorization. |
| Public configuration validation | HTTPS endpoints are required, URL credentials/fragments are rejected, and known credential-bearing configuration keys/token-endpoint query parameters are rejected. This validation is not a general-purpose secret detector; administrators must never include secrets or tokens. |
| Identity endpoint validation | Entra authorities are limited to configured tenant paths under `login.microsoftonline.com`, `login.microsoftonline.us`, or `login.partner.microsoftonline.cn`. Redirects must be same-origin HTTPS URLs ending in `/sidebar_CopilotAuthRedirect.html`, registered exactly as SPA redirects. |
| OAuth/browser handling | MSAL manages authorization code flow with PKCE, state, and nonce. Its cache uses `sessionStorage` (not a promise that tokens exist only in memory). The redirect page has no scripts, navigation, or response logging. Multiple cached accounts are not arbitrarily selected. |
| SDK and network handling | Web Chat 4.19.1 and MSAL Browser 4.30.0 are pinned, SHA-384 integrity-checked jsDelivr bundles. The host's JSON fetches omit browser credentials, disable caching, reject redirects, and time out after 20 seconds; token-exchange posting also has a 20-second timeout and duplicate suppression. |
| Privacy and recovery | Panel metadata travels in a URL fragment, not the HTTP request/referrer URL, and integrated URLs are redacted in the active-panel log. Metadata remains visible to browser users/scripts and is not encrypted. Service/identity errors are not displayed verbatim. Token-fetch or terminal Direct Line failures allow connection retry. |

**Administrator responsibilities and limits**

- Restrict write access to sidebar configuration using Dataverse security roles.
  Treat configured HTML/scripts and endpoint URLs as trusted administrator input.
  The renderer is not a general HTML sanitizer or an iframe sandbox; do not
  describe ordinary embeds as isolated from all same-origin scripts.
- Protect token endpoints/brokers server-side: enforce appropriate access control,
  origin/channel restrictions, rate limiting, and short-lived conversation tokens.
  The host does not implement a broker or send a Dynamics session token to one;
  its JSON fetches use `credentials: omit`. CORS alone is not authorization.
- Validate tenant registrations, consent, CSP, browser cookie/popup policies,
  and cloud/channel/SDK compatibility. Silent SSO is best effort, not guaranteed
  by signing into Dynamics. Separate conversations do not mean separate
  same-origin identity caches.
- Existing solution packages are not proof of deployment of these source changes.
  The recorded 25 offline tests, secret/advisory checks, and zero-alert CodeQL
  result are not live SSO certification or a guarantee of vulnerability-free code.
  Complete the unchecked [acceptance checks](./TEST_ACCEPTANCE.md) in a test tenant.

## Add Generic Sidebar to a Form

1. Add the `sidebar_sidebar.js` web resource as a form library.
2. Register `Generic_OpenSidebar` as an OnLoad handler and pass the execution context.
3. Save and publish the form.
4. Publish all customizations, then hard refresh the model-driven app.

The form opens the sidebar; the selected default Dataverse record controls its content.

## Embeddable Applications

### Android Cell Phone Simulator

The Samsung S25 Ultra phone simulator is a separate, self-contained HTML application intended for contact-center demonstrations. It can run standalone, as a Dynamics web resource, or inside a Generic Sidebar panel.

It is not part of the Generic Sidebar core package and is not required to use Generic Sidebar.

- [Android Cell Phone Simulator overview and embed instructions](./Generic.AndroidCellPhone/README.md)
- [Full phone simulator documentation](./Generic.AndroidCellPhone/DOCUMENTATION.md)
- [Phone application source](./Generic.AndroidCellPhone/AndroidCellPhone.html)

### Other Sidecar Content

The [`SidecarItems`](./SidecarItems) directory contains optional examples and integrations, including Copilot, journey, and softphone experiences. Treat each item as independently deployable content unless its own documentation says otherwise.

## Examples

### HTML configuration

![Generic Sidebar HTML configuration](./screenshots/Generic.Sidebar.Admin.HTML.png)

### HTML displayed to an end user

![Generic Sidebar HTML embed](./screenshots/Generic.Sidebar.Admin.HTML.Embed.png)

### Copilot Studio configuration

![Generic Sidebar Copilot Studio configuration](./screenshots/Generic.Sidebar.Admin.CSStudio.Embed.png)

### Copilot Studio displayed to an end user

![Generic Sidebar Copilot Studio embed](./screenshots/Generic.Sidebar.CopilotStudio.Embed.png)

## Validation and Reference Material

- [Acceptance tests](./TEST_ACCEPTANCE.md)
- [UX invariants](./UX_INVARIANTS.md)
- [System manifest](./SYSTEM_MANIFEST.json.md)
- [Binding certification](./BINDING_CERTIFICATION.md)
- [Solution specification](./SPEC.md)

## Known Limitations

- External sites can block iframe embedding through `X-Frame-Options` or Content Security Policy.
- The optional `sidebar_acknowledged` field controls the administrator disclaimer acknowledgement. Environments without that field skip the acknowledgement update.
- Embeddable applications can have their own data, security, browser, and deployment requirements.

## Disclaimer

This project is provided as-is and is intended primarily for demonstrations and proof-of-concept use. Validate security, accessibility, data access, browser policies, and solution behavior in a non-production environment before production deployment.

## License

See [LICENSE](./LICENSE).
