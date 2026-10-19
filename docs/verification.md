# Verification · 2026-10-19

This is the JustCV-derived Open Resume project, with the requested default
account `admin / admin`. These results describe local validation, not a public
release or a real AI provider transaction.

## Passed

- `npm ci` completed using the lockfile, without a `.env` file or cloud credentials.
- Reinstalled all dependencies from the public npm registry with a fresh cache.
  All lockfile download hosts are `registry.npmjs.org`; `.npmrc` explicitly selects
  that registry, so deployment does not depend on the original developer's mirror.
- `npm run build` produced the production frontend without Cloudflare tooling.
- `npm test`: 12 tests passed on the host runtime and on Node.js 24 via
  `npx --yes --package=node@24 node --test tests/*.test.mjs`, including real local HTTP calls and SQLite restart
  persistence. Coverage includes incorrect passwords, forged sessions, cross-site
  writes, logout invalidation, custom credentials, invalid documents, and static
  path isolation.
- All 156 templates are available; eight documents were created in one workspace
  without an account upgrade or a five-document limit. Editing, rename, delete,
  session persistence, and selected-template persistence passed HTTP tests.
- Both `npm start` and `npm run dev` served the app and local API. The isolated
  development server on port 3100 was stopped after verification.
- Browser: logged in using the prefilled `admin / admin` account, selected the
  formerly paid Purple Pro template, edited the profile and document name,
  observed autosave, and reloaded the persisted document.
- Browser: exported actual PDF, PNG, and JSON files. The PDF parsed successfully
  as one A4 page. The PNG was visually inspected; the JSON contained the edited
  name and title. The PDF was approximately 28 MB with the bundled font support;
  PDF-size optimization was not performed.
- Browser: English and Simplified Chinese interfaces, all-template navigation,
  the hosted-service link, and the no-key AI setup explanation were inspected.
  No browser console errors were recorded during these flows.
- Browser: 375px and 1440px viewport checks showed no horizontal page overflow.
- AI: seven consecutive calls to a synthetic compatible provider passed without
  a daily quota or cooldown. The configured endpoint/model were used and contact
  fields were excluded. Missing AI configuration returned 503.
- `docker compose config --quiet` passed.
- Docker image build and Compose startup passed on Docker Desktop 29.8.2,
  Linux ARM64 / Node.js 24.22.0, running as UID 1000. All 12 tests also passed
  inside the Linux build-stage image with external networking disabled.
- Container HTTP checks passed for login, eight resumes, production assets,
  fonts, and private-path isolation. After a force-recreate, the container ID
  changed while the named volume, saved documents, and old session remained.
  Browser login showed the eight persisted documents without console errors.
  Details and dependency-audit boundaries: [Docker acceptance](docker-acceptance.md).
- The original JustCV snapshot's 98 source/static files still matched their
  SHA-256 hashes after the new project was built and tested.

## Boundaries

- The host Node runtime was 26.7.0. The Linux container was tested on ARM64 with
  Node.js 24.22.0; a separate Linux AMD64 run has not been performed.
- The Docker build's production dependency audit reported nine advisories
  (one critical, five high, three moderate), including jsPDF and Vite. These
  inherited dependency findings were recorded, not remediated by this Docker
  test. Functional acceptance does not establish that dependencies are secure.
- AI validation used a synthetic provider. No paid provider request was sent;
  model compatibility, provider limits, and fees depend on the deployer's setup.
- This version has one shared workspace per installation, not multi-tenant
  accounts. Default demo credentials are intentionally public.
- All seven locales retain upstream translations and have new self-hosting
  copy; only English and Simplified Chinese received browser interaction checks.
- The app builds with the inherited export-bundle size warnings. Exhaustive
  template/platform/export-format compatibility was not tested.
- No GitHub repository was created and no production JustCV release was changed.
