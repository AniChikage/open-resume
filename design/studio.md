# Resume Studio visual and performance system

The home page uses the visual language of a digital print studio: an ink canvas, oversized left-aligned type, lime actions and three real resume pages on a violet disc. The workspace keeps this identity in its header and active controls; the document itself retains its selected template.

- Ink `#11131b`, lime `#d9ff63`, violet `#9270ff`, white `#ffffff`, cool canvas `#edf0f6`.
- Geist for product typography. Home title 102 px at wide desktop, 46–74 px on phones; long hosted-product copy uses a smaller title. Workspace title 46 px and content heading 28 px.
- A 1440 px maximum container with consistent rails across locales. Split home hero, numbered feature strip, tinted paper gallery and dark hosting support band.
- Header navigation uses a lime underline. Primary actions in the hero, library and editor use lime; editable inputs and document accents keep violet focus treatment.
- Motion is a finite entrance and pointer-driven paper tilt, with one pending animation frame. No infinite animation, canvas animation or WebGL. Reduced motion disables entrances, transitions and tilt.
- Swatches update the real sample documents. Existing template previews, sign-in, imports, billing and editor actions remain functional.

## Performance boundaries

`components/ResumePreview` contains only document rendering. Thumbnails no longer import the editor or its education data, history, dialogs and export controls. Thumbnail contents mount on entering the viewport and unmount on leaving; the browser skips offscreen library card layout.

PDF font selection checks the actual document text. Latin subsets retain original Noto glyph outlines and metrics. A generated, exact GB2312-based inventory selects common Simplified Chinese subsets. Rare characters and other scripts retain the original complete fonts. Generated derivatives use their own family names and retain the bundled SIL OFL attribution. Regeneration: `uv run --with fonttools python scripts/subset-pdf-fonts.py`.

The hidden source uses system fonts; the isolated PDF clone stays hidden until its exact embedded font is ready. This prevents fallback-font downloads before measurement. The main preview and downloads still use the same immutable PDF bytes.

Decorative backgrounds are serialized separately from content, rendered with native SVG, encoded in a short-lived worker and cached as compressed PDF streams. Two recent backgrounds are retained; layout, pagination or paint changes invalidate the key. Plain papers skip this work. Background layers are painted once. The main PDF viewer reuses one worker and releases it on exit; retry replaces a failed worker.

Preview jobs run sequentially and reject obsolete document revisions. Revision keys and undo comparisons avoid repeatedly serializing photos. Draft persistence keeps its existing immediate behavior. Open Resume additionally streams Brotli/gzip static assets with proper MIME, HEAD, Vary and cache semantics. JustCV retains its Cloudflare deployment path.

## Product-specific constraints

Open Resume retains unrestricted self-hosting, admin/admin, every template and unlimited resumes. The hosting support link remains justcv.org. JustCV retains its own logo, pricing, two free templates, authentication and upgrade behavior. No payment or AI provider configuration is changed.
