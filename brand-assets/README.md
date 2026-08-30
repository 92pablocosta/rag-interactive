# RAG Interactive brand assets

This isolated asset pack implements the visual direction approved on 2026-08-29. It does not change or connect itself to the current site.

## Contents

- `icons/*.svg` — six transparent, scalable learning-stage icons.
- `icons/sprite.svg` — the same six icons as SVG symbols for inline use.
- `logo/mark.svg` — standalone geometric R–I mark.
- `logo/lockup.svg` — horizontal mark and exact `RAG Interactive` wordmark.
- `logo/favicon.svg` — dark rounded favicon treatment.
- `tokens.css` — core colors and reusable icon/tile tokens.
- `manifest.json` — deterministic inventory and provenance.
- `preview.html` — responsive visual QA page.
- `preview.png` — rendered approval and QA preview.

## Suggested web usage

Use an individual SVG as an image when simplicity matters:

```html
<img src="brand-assets/icons/document.svg" alt="" width="24" height="24">
```

When the adjacent text already names the stage, keep the image's alternative text empty to avoid repetition. Use a descriptive `alt` when the icon is the only accessible label.

For an inline sprite, load or embed `icons/sprite.svg`, then reference the desired symbol:

```html
<svg class="ri-icon" aria-hidden="true">
  <use href="brand-assets/icons/sprite.svg#icon-document"></use>
</svg>
```

## Guardrails

- Keep the white geometry and blue node together.
- Do not recolor each stage; educational semantic colors can appear around the icon, not replace its core identity.
- Do not add a permanent tile background inside the stage SVGs. Let the UI component provide its own surface.
- Preserve a minimum display size of 16 px and prefer 24–32 px in navigation or flow components.
- The lockup uses a system-font fallback stack. Convert the wordmark to outlines before sending to print vendors if exact cross-platform typography is required.
