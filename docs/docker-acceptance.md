# Docker acceptance

## TypeScript image · 2026-10-20

- Built the migrated source using the updated Dockerfile. Its build stage runs
  `npm test` and `npm run build` with external networking disabled, including
  all 15 tests and strict TypeScript checking. The production stage runs
  `node server/index.ts` on Node.js 24.22.0 as UID 1000, with development
  dependencies removed.
- New image configuration digest:
  `sha256:512a70aa95372e852efc797ac7b01278fc54bec8b182c1b573966a2dd7e4f3d0`.
- Reused the existing Compose project, loopback port 3300, and SQLite volume.
  Startup and a subsequent force-recreate both completed healthy. All ten
  pre-migration documents retained their content and timestamps, independently
  checked by normalized SHA-256 hashes; the new acceptance document persisted
  as well.
- Browser login, editing, undo/redo, persistence, filter reset, responsive
  rendering, and actual JSON/PNG/PDF downloads passed against this container.
  The downloaded PDF parsed as one A4 page; the PNG was visually inspected.
- This was Linux ARM64 validation. Production dependency versions and their
  previously recorded advisories were not changed by this migration.
  See [the migration verification](verification.md#typescript-migration--2026-10-20)
  for details.

## Initial image · 2026-10-19

The existing Dockerfile and Compose configuration built and ran successfully.
No application or Dockerfile fix was needed for this acceptance run.

## Environment and image

- Docker Engine client 29.8.1, Desktop engine 29.8.2, Compose 5.6.0.
- Platform: Linux ARM64 on the test Mac's Docker Desktop.
- Base: `node:24-bookworm-slim` at
  `sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5`.
- Actual runtime: Node.js 24.22.0, user `node`, UID 1000.
- Built image: `open-resume-docker-qa-open-resume:latest`, image ID
  `sha256:cba2438c1da0ec335d8cd3988ae3a78bf2fc8990df38161e65d82ca786ee6a86`.
- Compose project: `open-resume-docker-qa`.
- Bound only to `127.0.0.1:3300`, leaving the existing host preview on 3000 running.
- Named volume: `open-resume-docker-qa_resumes`, mounted at `/data`.

## Checks passed

1. Pulled the public Node base, ran `npm ci` inside Linux, built the Vite frontend,
   and produced the final image.
2. Compose startup completed with Docker health status `healthy`.
3. All 12 tests passed inside the Linux build-stage image using
   `docker run --rm --network none open-resume:docker-tests npm test`.
4. Actual container HTTP calls returned the homepage, built JavaScript/CSS,
   bundled CJK font, and font license. Private configuration/source/data paths
   returned 404, and unauthenticated resume access returned 401.
5. Logged in with `admin / admin`, created eight resumes using a formerly paid
   template, then edited and saved one document's name and title.
6. Force-recreated the Compose service. Independently checked that its container
   ID changed and that the named volume stayed the same.
7. Reused the old session against the new container: the edited name, title and
   template were intact. A fresh login also listed all eight documents.
8. Opened `http://localhost:3300` in a browser, signed in, and observed the eight
   persisted documents. No browser console errors were captured.

The test-only preview and volume remain available locally. The `localhost`
browser URL keeps its login cookie separate from the host preview's
`127.0.0.1` cookie.

## Reproduce on the test machine

The following override uses an isolated project and port. Standard deployment
still uses the README's `docker compose up -d --build` on port 3000.

```yaml
# output/docker-qa/compose.override.yaml
services:
  open-resume:
    ports: !override
      - "127.0.0.1:3300:3000"
```

```bash
docker compose -p open-resume-docker-qa -f compose.yaml -f output/docker-qa/compose.override.yaml up -d --build --wait
docker compose -p open-resume-docker-qa -f compose.yaml -f output/docker-qa/compose.override.yaml up -d --force-recreate --wait
```

Evidence for this run is saved locally under ignored `output/docker-qa/`,
including HTTP results, before/after container identity, an audit response, and
the browser screenshot. Test sessions and databases are excluded from source
archives.

## Remaining boundaries

- This was an ARM64 test. Linux AMD64 and other container engines were not run.
- No real paid AI provider call was made. AI contract tests used a synthetic
  provider; browser exports retain the earlier application-level acceptance.
- `npm audit --omit=dev` in the build-stage image reported nine advisories:
  one critical, five high, and three moderate. Affected packages were jsPDF,
  Vite, esbuild, DOMPurify, browserslist, baseline-browser-mapping, nanoid,
  PostCSS, and source-map-js. npm marked jsPDF and Vite fixes as major-version
  upgrades. This run records those inherited findings; it does not remediate
  them or assess exploitability. A successful container test is not a security
  audit result.
