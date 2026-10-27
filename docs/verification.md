# Verification

## First stable release · 2026-10-27

- Validated the published `main` baseline (`261efca`) in an isolated checkout; existing uncommitted work was kept separate.
- All 72 regression tests, strict TypeScript checking, and the production build passed on the host. The Docker build also ran all 72 tests and the type-checked build with networking disabled.
- Found and fixed a production-image startup failure: `server/app.ts` imports `src/lib/version-types.ts`, which was missing from the runtime stage. The Dockerfile now copies that module and imports the server module in the final stage, as the `node` user and with networking disabled, to detect missing runtime dependencies during builds.
- The resulting `1.0.0` image ran on Node.js 24.22.1 / Linux ARM64 as UID 1000. Actual container HTTP checks passed for health, the built homepage, demo login, resume creation, editing, and a named snapshot.
- Restarted the container using the same named data volume. The edited resume and named snapshot persisted; restoring the snapshot created a new resume with the historical content and preserved the source document.
- Version metadata, the `v1.0.0` Git tag, the changelog, and the version-pinned English/Chinese installation instructions describe the same release. Linux AMD64 was not tested in this run.

## TypeScript migration · 2026-10-20

- Migrated the frontend, local HTTP/SQLite server, tests, and Vite configuration
  to TypeScript. All 53 TypeScript/TSX files are covered by `strict: true` and
  `tsc --noEmit`; no explicit `any` types or TypeScript suppression comments were
  added. Shared document types live in `src/types.ts`, with runtime validation
  for JSON, stored documents, shared links, cached drafts, and AI inputs.
- `npm run typecheck`, all 15 tests, and `npm run build` passed. The added tests
  validate 156 templates in all seven locales, malformed document rejection,
  and shared-link round trips and failure handling.
- The Docker image ran all 15 tests and the type-checked production build with
  external networking disabled for those build steps. The runtime uses Node.js
  24.22.0's native TypeScript support without a TypeScript runtime dependency.
- `npm run dev` served HTML, the transformed `src/main.tsx`, the health endpoint,
  and a successful `admin / admin` login on isolated port 3310. The temporary
  development server was stopped afterward.
- Upgraded the existing Docker preview on `http://localhost:3300`, then
  force-recreated it again. All ten pre-migration documents retained their
  content and timestamps, verified using SHA-256 with response key order
  normalized. A new browser-created acceptance document also persisted, for
  eleven documents total. The container remained healthy and used the same
  named volume.
- Browser acceptance on the new container passed: empty-results filter reset,
  logout, default-account login, selected-template creation, editing, undo,
  redo, save, reload, and actual JSON/PNG/PDF downloads. The migration also
  fixed the reset button's stale setter and malformed shared-link decompression
  that previously left a rejected stream promise unhandled.
- Independently parsed the exported JSON and verified the edited profile name.
  The PNG was 1588 × 2246 and was visually inspected. The PDF parsed as one A4
  page (595.28 × 841.89 pt), approximately 28 MB; export-size optimization was
  outside this migration.
- Desktop (1440 × 1000) and mobile (375 × 844, including preview mode) rendered
  correctly; mobile document width equaled the viewport width. No browser
  warning/error logs were recorded during these checks. Screenshots and local
  download files are kept outside the source tree.
- Added GitHub Actions to run lockfile installation, tests, strict type checking,
  and the production build on Node.js 24 for pushes to `main` and pull requests.
  Production dependency versions were preserved; the inherited dependency
  advisories and export-bundle warnings below remain applicable.

## Initial self-hosted acceptance · 2026-10-19

This is the self-hosted Open Resume project, with the requested default
account `admin / admin`. These functional results describe local validation,
not a hosted production deployment or a real AI provider transaction.

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

## Independent-project cleanup

- Removed 20 unused files, including commercial/marketing translation modules,
  unused UI components, empty analytics shims, and the upstream file-hash manifest.
  The hosted-service links and source/license attribution remain intentional.
- Merged the active messages into `src/lib/i18n.js`: 284 retained messages,
  compared against the prior translator in seven languages (1,988 exact checks).
  Removed inactive payment/quota text, template entitlement branches, and dead
  tracking calls. Browser storage keys and both icons now use Open Resume.
- The local production build and all 12 tests passed. Rebuilt the Docker preview
  and reran the same 12 tests inside Linux successfully. The earlier persisted
  Docker test document remained present.
- Browser acceptance on the new Docker build: choose a template while signed
  out, sign in with `admin / admin`, enter the selected template, rename, switch
  to Simplified Chinese, reload the saved document, and export a JSON backup.
  The saved title and exported JSON were independently checked through the API
  and filesystem; no relevant console errors were recorded.

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
- Public source repository: [AniChikage/open-resume](https://github.com/AniChikage/open-resume).
  The upstream JustCV repository and production deployment were not changed.
