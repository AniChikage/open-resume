# Clean interface direction · 2026-11-09

User brief: bring the overall clarity of Reactive Resume to both products, including the homepage, without copying its identity or exact design.

Reference observed: https://rxresu.me/ on 2026-11-09. Borrow hierarchy, restrained controls, whitespace and clear paper/workspace separation. Keep our document mark, violet identity, existing product names, routes and behavior.

Built-in Image Gen produced the four concepts in this folder. Implementation uses native React components and real resume templates, not screenshots.

## Tokens and component rules

- White #FFFFFF; canvas #F5F6F8; foreground #191B20; muted #6B707C (slightly darker than the concept to pass contrast on the canvas); border #E7E8EC; violet #6D28D9.
- Bundled Geist for chrome and marketing; resume fonts and PDF generation remain separate. Display 72px desktop / 42px phone, workspace title 32px, body 14–18px, controls 13px.
- Centered 1200px site rail. Header 72px; editor toolbar 60px, tabs 48px; writing panel 400px. Shared 8px spacing scale, 7px input radius, 40px normal buttons / 46px hero actions.
- Open layouts and hairlines, no nested bordered cards. Paper thumbnails are the only elevated surfaces. Primary actions are violet; destructive actions are quiet until interaction.
- Editor starts with profile fields. Completeness is a slim line, sections collapse, add-section controls sit after existing content. Clicking a PDF target or check finding opens the relevant section before focus.
- Desktop 1440×1000, tablet 768×1024, phones 390×844 and 320×740. Reduced motion and visible keyboard focus.

## Intentional implementation differences

- Real template content, names and saved user documents replace generated example text and photos. No templates are redrawn to mimic concept sample resumes.
- JustCV retains its actual free/pro prices, upgrade rules, AI/style demos, legal and product information. Open Resume retains unrestricted self hosting and the optional justcv.org support link.
- Existing logo artwork and language/account controls remain. No invented documentation/release links or fabricated statistics from the mockup.
- The homepage feature strip follows the continuation concept, avoiding duplicate feature rows.
- Correct PDF generation, accessible editing/navigation, current locale and user data take precedence over decorative concept details.
