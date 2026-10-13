# Copilot Studio iframe embed: full-height layout

This guide documents a pattern that worked in the Generic.Sidebar implementation. It is a reference, not a drop-in guarantee: adapt it to your host page, iframe nesting, and embed method.

## The sizing problem

An iframe's `height: 100%` only helps when its containing document and ancestors have a usable height. With a Sidecar that renders pasted HTML inside an outer iframe, there are two separate sizing layers:

1. The host/Sidecar allocates height to its panel and outer iframe.
2. The embedded HTML allocates that height to the nested Copilot Studio iframe.

If either layer has no height, the chat may appear short even when the innermost iframe says `height: 100%`.

## 1. Allocate the available height in the host layout

Use a full-height host document and a flex column so fixed-height elements (for example, instructions and tabs) take their space while the content panel receives the remainder.

```css
html,
body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body,
#host,
.panel-container {
  display: flex;
  flex-direction: column;
}

#host,
.panel-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-container iframe {
  flex: 1;
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
```

`min-height: 0` is a useful flex-layout safeguard when a child needs to fit within the remaining space. The current Sidebar stylesheet already makes `html`/`body`, `#host`, and `.panel-container` full-height/flexible and sizes the outer panel iframe; compare [`web resources/sidebar_sidebar.html`](../../../web%20resources/sidebar_sidebar.html#L92-L123) and [the panel styles](../../../web%20resources/sidebar_sidebar.html#L277-L305). If your host has a different layout, identify every ancestor between the viewport (or fixed-height host) and the iframe and ensure the height can flow through that chain.

## 2. Make the nested Copilot iframe fill its embedded document

For a Sidecar that accepts an HTML snippet and renders it using `iframe.srcdoc`, inject layout CSS into that snippet's document before assigning it to `srcdoc`:

```js
function ensureFullHeightIframeWidget(html) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const style = doc.createElement("style");

    style.textContent = `
      html, body {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      iframe {
        flex: 1;
        width: 100% !important;
        height: 100% !important;
        border: none;
      }
    `;

    doc.head.appendChild(style);
    return doc.documentElement.outerHTML;
  } catch {
    // Preserve the supplied embed if it cannot be parsed/transformed.
    return html;
  }
}
```

The wrapper document gets a defined height and no default margins. Its body becomes a vertical flex container; the nested iframe is stretched to the available width and given the remaining height. `!important` helps override ordinary inline dimensions in supplied embed HTML. `overflow: hidden` prevents the wrapper itself from adding a second scrollbar; choose different overflow behavior if your content needs wrapper scrolling.

A minimal Copilot Studio embed snippet can be structured like this:

```html
<iframe
  src="https://your-copilot-studio-chat-url"
  title="Copilot Studio chat"
  style="width: 100%; height: 100%;"
  frameborder="0">
</iframe>
```

Use the actual embed URL and any permissions or attributes required by your bot and environment. Do not copy a URL containing another organization's environment or bot identifiers.

## 3. Apply the widget treatment to the right content

In this implementation, HTML embed content containing an iframe takes the widget-specific path; other raw HTML takes a separate helper:

```js
if (target.mode === "html") {
  const hasEmbeddedIframe = !!target.extractedUrl;

  if (hasEmbeddedIframe) {
    iframe.srcdoc = ensureFullHeightIframeWidget(target.html);
  } else {
    iframe.srcdoc = ensureFullHeightHtml(target.html);
  }
}
```

The current renderer identifies an iframe by extracting an `src` with a regular expression in `resolveEmbed()`. That is a simple project-specific detector, not a general-purpose HTML parser or validation mechanism. If you build this pattern into another application, prefer parsing the HTML and checking for an iframe element, and validate which embed sources are allowed according to your application's security requirements.

The actual implementation is in [`web resources/sidebar_sidebar.html`](../../../web%20resources/sidebar_sidebar.html#L357-L385) and [the render branch](../../../web%20resources/sidebar_sidebar.html#L573-L588). The Copilot Studio behavior is selected because the HTML contains an iframe, not because its URL is matched to a Copilot domain. Other iframe widgets, such as Canvas Apps, may receive the same sizing rules.

## Important boundaries and adaptations

- **This resizes the iframe viewport, not the chat UI inside it.** The Copilot page is cross-origin, so the parent Sidecar cannot use this CSS to directly resize internal chat messages, buttons, or the composer.
- **Both iframe layers matter.** The outer Sidecar iframe and nested bot iframe each need a parent with an available height.
- **Avoid global CSS leakage.** The injected CSS is appended to the embedded `srcdoc` document. Its `iframe` selector affects iframe elements in that document, not the Dynamics host page. If your snippet contains multiple iframes, scope the rule to a wrapper class or a specific iframe.
- **Respect fixed headers and tabs.** They should not flex into the chat area. Let the content panel flex, and use `min-height: 0` where necessary to prevent flex overflow.
- **Choose overflow intentionally.** `overflow: hidden` works for a full-viewport chat iframe, but may clip other content. Test on the supported viewport sizes and with browser zoom/accessibility settings.
- **Treat embed HTML as input.** Only render trusted/configured markup, validate allowed sources, and review sandboxing and iframe permissions for your host. Do not weaken security controls just to make the iframe fill its panel.
- **Check your host environment.** Dynamics/Dataverse side panes, an ordinary web page, and a CMS may impose different sizing constraints. The parent container's height may need to come from a fixed viewport, a host-provided pane, or an explicitly sized parent.

## In this repository

- Widget-specific injected CSS: [`web resources/sidebar_sidebar.html`](../../../web%20resources/sidebar_sidebar.html#L357-L385)
- Widget detection and rendering: [`web resources/sidebar_sidebar.html`](../../../web%20resources/sidebar_sidebar.html#L387-L403) and [iframe creation](../../../web%20resources/sidebar_sidebar.html#L560-L592)
- Outer Sidecar layout: [`web resources/sidebar_sidebar.html`](../../../web%20resources/sidebar_sidebar.html#L92-L123) and [panel styles](../../../web%20resources/sidebar_sidebar.html#L277-L305)
- Documented implementation history: [`web resources/archives/README.md`](../../../web%20resources/archives/README.md#L30-L35)

The central lesson is the height chain: **host panel → outer Sidecar iframe → embedded document → Copilot Studio iframe**. Adapt each link to your own architecture rather than assuming the inner iframe can create height on its own.
