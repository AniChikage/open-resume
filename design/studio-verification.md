# Studio UI verification

Both products share the ink/lime/violet visual system in [studio.md](studio.md). Existing authentication, data, template entitlements and pricing are preserved. Changes are local; this task does not publish or deploy either product.

## Visual review

The Browser/IAB plugin was unavailable in this environment, so rendered checks used Playwright Chromium. ImageGen references and actual screenshots were opened with `view_image` for direct comparison. Home, library and editor were captured at the references’ native **1511 × 1041** resolution; the home continuation uses **1488 × 1057**. Additional viewports: 1440 × 1000, 768 × 1024, 390 × 844 and 320 × 740. All seven homepage locales were checked at mobile width.

References: [home](concepts/studio/home.png), [continuation](concepts/studio/home-continuation.png), [library](concepts/studio/dashboard.png), [editor](concepts/studio/editor.png).

| Comparison | Implemented result and review decision |
| --- | --- |
| Composition | Asymmetric dark hero, large left headline and three real paper previews on a violet disc. The next white section remains visible. |
| Palette | Ink `#11131b`, lime `#d9ff63`, violet `#9270ff`, white and a cool document canvas. Lime stays in brand actions; paper swatches use darker, readable ink colors. |
| Typography | Geist for app chrome; 102 px wide-screen hero, smaller long-copy variant, 46 px library heading and 28 px content heading. Real documents retain their existing template typography. |
| Paper treatment | Live template DOM, not a rasterized screenshot pretending to be interactive. A left-alignment reset prevents native button styles from centering the document contents. |
| Motion | Finite paper entrance, pointer-driven tilt and real accent switching. Reduced motion removes animation and tilt. No WebGL or perpetual animation loop. |
| Library | Four desktop columns, dark create tile, quiet metadata and real hide/delete controls. Offscreen paper contents unmount. Newly entered pages start at the top; ordinary section anchors retain native scrolling. |
| Editor | Dark toolbar and four working modes, white 400 px editing pane, grid-backed PDF canvas, actual PDF bytes in preview and download. The redundant site header in the generated editor reference is intentionally omitted. |
| Responsive behavior | Stacked mobile hero, readable buttons, compact navigation and a working mobile PDF toggle. Automated checks found no horizontal page overflow, clipped header actions or overlapping hero buttons. |

Copy audit: Open Resume uses “Your resume. / On your / terms.”, “Start creating”, “Browse templates” and “Self-host it. Make it yours.” Feature labels remain “Start with your story”, “Make it your own” and “Export with confidence”, accurately describing PDF import, backup and the four export formats. JustCV keeps “The resume builder / without a / subscription.”, its two free templates and the current one-time $7.99 offer. Existing localized action names, product logos, account state, document content and recent-first ordering are intentional differences from the illustrative references. The hosting support copy retains the actual paid service proposition; the generated reference’s no-signup claim is not used. Full A4 thumbnails retain real template metrics instead of adopting the reference’s enlarged fictional resume text. JustCV also retains its existing demos, FAQ and legal information.

Screenshots: [home](qa/studio/home-native.png), [continuation](qa/studio/home-continuation-native.png), [library](qa/studio/dashboard-native.png), [templates](qa/studio/templates-native.png), [editor](qa/studio/editor-native.png), [320 px home](qa/studio/home-320.png), [390 px editor](qa/studio/editor-390.png).

## Performance measurement

Production builds, cold browser caches, 20 Mbps download, 40 ms configured latency, CDP CPU throttling rate 4, 1511-class desktop viewport, three runs per product and phase. Open Resume used its original native HTTP server for the baseline and the updated native HTTP server afterward; JustCV used the same Vite production-preview delivery on both sides. The same synthetic resume was used per product. Values below are medians; preview times are browser-automation wall-clock waits for the completed PDF status, and can round upward. These are comparative measurements under the stated setup.

| Metric | Open Resume before → after | JustCV before → after |
| --- | --- | --- |
| Homepage JS, decoded bytes | 789 KB → 518 KB | 960 KB → 692 KB |
| Homepage LCP | 672 ms → 400 ms | 244 ms → 240 ms |
| First completed PDF preview | 19.03 s → 2.34 s | 18.36 s → 2.90 s |
| Editor resources, decoded | 38.73 MB → 4.95 MB | 38.93 MB → 5.64 MB |
| Cold editor longest main-thread task | 1217 ms → 218 ms | 1324 ms → 183 ms |
| Cold editor JS heap | 24.7 MiB → 11.4 MiB | 25.7 MiB → 12.1 MiB |
| Subsequent preview-ready wait | 3.09 s → 0.87 s | 3.23 s → 1.40 s |

JustCV’s existing prerendered homepage keeps its already short LCP; its main gain there is less JavaScript. The measurements preceded the final navigation and demo-copy corrections; those corrections were subsequently built and browser-verified.

A separate 43-resume library scroll test reduced retained DOM nodes from **4435 to 1709** and rendered papers from **43 to 8**. It used built-in example content and URL-based sample photos. Latin sans font payload is 174 KB for both weights, versus 33.40 MB previously; common Simplified Chinese sans uses 6.96 MB. Original fonts remain the fallback for rare characters and other scripts. Original outlines and advances are checked across both families and weights; browser rendering of common plus rare glyphs matched the original fonts with zero differing pixels.

## Functional verification

- **45 Open Resume + 136 JustCV Node tests passed**, including static compression negotiation, font selection/geometry, history, auth and existing billing boundaries. Strict TypeScript and both production builds passed. JustCV’s seven prerenders and Cloudflare dry run passed.
- Both products passed the 14-flow browser suite: hide/restore, delete cancellation, backup, visible profile fields, preview-to-field focus, checks, adding a section, editing/exporting, template search/dialog, tablet/phone layouts, mobile PDF and Chinese navigation. Mobile sign-in and actual backup restore-as-copy also passed.
- Six dense fixtures produced **14 pages**, including A4, Letter, English, Chinese, serif, long paragraphs and hidden sections. Downloaded PDFs matched preview canvases across **49,213,888 pixels with zero differences**. End markers, final-page navigation, PNG, editable DOCX and JSON were verified. Additional tests covered latest edits, undo/redo, save/reload, anonymous snapshots and viewport-independent PDF bytes.
- Font failure/retry and a delayed-font race preserved editing and rejected an obsolete PDF. A forced background-worker failure recovered through the main-thread fallback, and subsequent text edits reused the cached background.
- Docker built from the updated source and ran as `node`, with healthy startup, admin/admin, four modes, save, Letter PDF, PNG, DOCX, JSON, anonymous snapshot and source-path isolation. Saved resume/settings hashes survived restart and replacing the container image on the same volume. The background worker executed and replied in Docker; common and rare fonts loaded correctly, and downloaded Chinese PDF text remained selectable.

Existing staged patches were compared byte-for-byte with the starting snapshots and remained unchanged. Original files were not removed; package manifests and lockfiles were unchanged. Tests used isolated databases and synthetic documents. Temporary test documents and containers are removed after verification; original development previews and user workspaces are retained.
