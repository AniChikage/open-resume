# Changelog

## [1.0.0](https://github.com/AniChikage/open-resume/releases/tag/v1.0.0) — 2026-10-27

First stable release of Open Resume.

- Self-host with Docker Compose or Node.js 24+, with local SQLite storage and a shared workspace.
- Use all 156 templates, create unlimited resumes, and export PDF, PNG, and JSON without watermarks.
- Edit with live A4 previews, autosave, undo/redo, photos, section ordering, fonts, and accent colors.
- Import text PDFs, DOCX, TXT, Markdown, pasted text, and JSON backups after reviewing the detected content.
- Keep automatic and named versions in SQLite, compare changes, and restore an earlier version as a new copy.
- Search, sort, rename, and duplicate resumes; run local resume checks and job-keyword matching.
- Use seven interface languages and optional AI tailoring with your own provider key.
- Pin self-hosted installations to the `v1.0.0` tag using the bilingual README instructions.

### Fixed

- Include the version-history module in the final Docker image so the server starts successfully. Docker builds now check the server's imports in the production runtime stage with networking disabled.

### Boundaries

- One shared workspace per installation; separate user accounts and tenant isolation are not included.
- Scanned or image-only PDFs require OCR outside the application.
- Job matching measures keyword coverage and is not an ATS score or a hiring prediction.
- AI tailoring is optional; provider fees and limits apply when it is enabled.

Thanks to [@2104178150-ai](https://github.com/2104178150-ai) for suggesting repository topics and the first stable release in [#1](https://github.com/AniChikage/open-resume/issues/1).
