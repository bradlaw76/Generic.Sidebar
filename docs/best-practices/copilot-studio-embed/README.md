# Copilot Studio embedded chat widgets: full-height layout

This guide is specifically for **Copilot Studio chat widgets embedded in an iframe**. It documents a pattern that works in this repository; adapt it to your host page and iframe structure rather than treating it as a universal drop-in.

## Why the chat can appear short

`height: 100%` on the Copilot iframe only works when its parent document and the host containers above it have usable heights. In this Sidecar there are two sizing layers:

1. The Sidecar panel gives its outer iframe the available space.
2. The embedded HTML gives that space to the Copilot Studio iframe inside it.

Both layers must be sized.

## 1. Allocate height in the Sidecar

The host layout should fill its available area and allow the chat panel to take the remaining height beneath any fixed header or tabs. The relevant pattern is:

```css
html, body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body, #host, .panel-container {
  display: flex;
  flex-direction: column;
}

#host, .panel-container {
  flex: 1;
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

The actual Sidecar uses this full-height flex layout for its outer panel iframe. If your host has different containers, make sure each ancestor between the Sidecar panel and the embedded widget passes down an available height. In some flex layouts, `min-height: 0` on the flexible children is also needed to prevent overflow.

## 2. Size the Copilot Studio iframe inside the embed

This Sidecar accepts Copilot embed HTML and renders it in an outer iframe using `srcdoc`. Before rendering, it injects CSS into the embedded document:

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
    return html;
  }
}
```

The full-height `html` and `body` establish a sizing context, and the body’s column flex layout lets the Copilot iframe stretch into it. The iframe rule sets its width and height to fill the embedded document. The zero margins remove default whitespace that could reduce the apparent chat area.

A Copilot Studio embed snippet can be as simple as:

```html
<iframe
  src="YOUR_COPILOT_STUDIO_EMBED_URL"
  title="Copilot Studio chat"
  style="width: 100%; height: 100%;"
  frameborder="0">
</iframe>
```

Replace the placeholder with your own bot’s embed URL and retain any attributes your environment requires.

## 3. Apply the helper when rendering the Copilot embed

In this repository, the renderer detects an iframe in the supplied HTML and passes that HTML through the sizing helper before assigning it to the outer iframe’s `srcdoc`:

```js
if (target.mode === "html") {
  const hasEmbeddedIframe = !!target.extractedUrl;

  if (hasEmbeddedIframe) {
    iframe.srcdoc = ensureFullHeightIframeWidget(target.html);
  }
}
```

The helper is selected for embedded iframe content; it is not a check of the Copilot Studio domain. This guide is scoped to Copilot Studio widgets, so use the pattern for those embeds and adjust the detection if your application needs stricter identification.

## What this does—and does not do

- It makes the **iframe viewport** containing Copilot Studio fill the available Sidecar space; it does not resize chat controls or content inside Microsoft's cross-origin page.
- The host panel, outer Sidecar iframe, embedded document, and Copilot iframe all need a usable height.
- The injected CSS runs only in the embedded `srcdoc` document, not across the Dynamics host page.
- `overflow: hidden` prevents wrapper scrollbars. Check that this matches your layout and accessibility needs.

## Implementation in this repository

- [Sidecar full-height layout and outer iframe styles](../../../web%20resources/sidebar_sidebar.html#L92-L123)
- [Copilot iframe sizing helper](../../../web%20resources/sidebar_sidebar.html#L357-L385)
- [Embed rendering and helper invocation](../../../web%20resources/sidebar_sidebar.html#L573-L588)

The key idea is the height chain: **Sidecar panel → outer iframe → embedded document → Copilot Studio iframe**. Adapt the containers to your architecture while keeping that chain intact.
