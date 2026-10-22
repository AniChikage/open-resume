import { createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual } from 'node:crypto';
import { createReadStream,mkdirSync,statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { SQLOutputValue } from 'node:sqlite';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';
import { isDeepStrictEqual } from 'node:util';
import type { Connect } from 'vite';
import { errorMessage,isEditorDocument,isRecord,isResume,isResumeSettings } from '../src/lib/validation.ts';
import { VERSION_AUTO_LIMIT,VERSION_AUTOSAVE_WINDOW_MS,VERSION_MANUAL_LIMIT } from '../src/lib/version-types.ts';
import type { ResumeVersion,ResumeVersionKind,ResumeVersionSummary } from '../src/lib/version-types.ts';
import { handleTailoring } from '../src/tailoring.ts';
import type { EditorDocument,StoredResume } from '../src/types.ts';
export interface AppOptions {dataDir?:string;distDir?:string;env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch;devMiddleware?:Connect.Server}

export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = 'admin';
const COOKIE = 'openresume_session';
const WEEK = 7 * 24 * 60 * 60;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const mime: Record<string,string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

function json(res: http.ServerResponse, status: number, value: unknown, headers: http.OutgoingHttpHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

async function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('JSON_REQUIRED'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 });
    chunks.push(chunk);
  }
  try { const value:unknown = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!isRecord(value)) throw new Error('INVALID_JSON'); return value; }
  catch { throw Object.assign(new Error('INVALID_JSON'), { status: 400 }); }
}

function validDocument(value: unknown): value is EditorDocument & {title:string} {
  return isRecord(value) && typeof value.title === 'string' && value.title.length <= 1000 && isEditorDocument(value);
}

export function createApp({ dataDir = path.resolve('.data'), distDir = path.resolve('dist'), env = process.env, fetchImpl = fetch, devMiddleware }: AppOptions = {}) {
  if (Boolean(env.LOCAL_USERNAME) !== Boolean(env.LOCAL_PASSWORD)) throw new Error('Set both LOCAL_USERNAME and LOCAL_PASSWORD, or neither.');
  const customLogin = Boolean(env.LOCAL_USERNAME);
  const username = (env.LOCAL_USERNAME || DEMO_USERNAME).trim().toLowerCase();
  const passwordHash = scryptSync(env.LOCAL_PASSWORD || DEMO_PASSWORD, 'open-resume-local-login', 32);
  const user = { id: 'local-workspace', username, email: username.includes('@') ? username : `${username}@openresume.local`, name: username, picture: '' };
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, 'open-resume.sqlite'));
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS resumes (id TEXT PRIMARY KEY, title TEXT NOT NULL, resume TEXT NOT NULL, settings TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS resume_versions (id TEXT PRIMARY KEY, resume_id TEXT NOT NULL, title TEXT NOT NULL, resume TEXT NOT NULL, settings TEXT NOT NULL, label TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('initial', 'auto', 'manual')), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS resume_versions_by_resume ON resume_versions (resume_id, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS resume_versions_initial ON resume_versions (resume_id) WHERE kind = 'initial';
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential_hash TEXT NOT NULL);`);
  // A credential change invalidates sessions from the previous configuration.
  const credentialHash = digest(username + passwordHash.toString('hex'));
  const toDocument = (row: Record<string,SQLOutputValue>): StoredResume => {
    if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.resume !== 'string' || typeof row.settings !== 'string' || typeof row.updated_at !== 'number') throw new Error('INVALID_STORED_DOCUMENT');
    const value:unknown = {resume:JSON.parse(row.resume),settings:JSON.parse(row.settings)};
    if (!isEditorDocument(value)) throw new Error('INVALID_STORED_DOCUMENT');
    return { id:row.id, title:row.title, updated_at:row.updated_at, ...value };
  };
  const toVersionSummary = (row: Record<string,SQLOutputValue>): ResumeVersionSummary => {
    if (typeof row.id !== 'string' || typeof row.resume_id !== 'string' || typeof row.title !== 'string' || typeof row.label !== 'string' || !['initial', 'auto', 'manual'].includes(String(row.kind)) || typeof row.created_at !== 'number' || typeof row.updated_at !== 'number') throw new Error('INVALID_STORED_VERSION');
    return { id: row.id, resumeId: row.resume_id, title: row.title, label: row.label, kind: row.kind as ResumeVersionKind, createdAt: row.created_at, updatedAt: row.updated_at };
  };
  const toVersion = (row: Record<string,SQLOutputValue>): ResumeVersion => {
    const { resume, settings } = toDocument(row);
    return { ...toVersionSummary(row), resume, settings };
  };
  function transaction<T>(action: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function insertVersion(resumeId: string, document: EditorDocument & { title: string }, kind: ResumeVersionKind, label: string, now: number) {
    const id = randomUUID();
    db.prepare('INSERT INTO resume_versions (id, resume_id, title, resume, settings, label, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, resumeId, document.title, JSON.stringify(document.resume), JSON.stringify(document.settings), label, kind, now, now);
    return id;
  }
  function ensureInitialVersion(document: StoredResume) {
    if (!db.prepare('SELECT 1 FROM resume_versions WHERE resume_id = ? AND kind = ?').get(document.id, 'initial')) insertVersion(document.id, document, 'initial', '', document.updated_at);
  }
  function trimVersions(resumeId: string, kind: 'auto' | 'manual') {
    const limit = kind === 'auto' ? VERSION_AUTO_LIMIT : VERSION_MANUAL_LIMIT;
    db.prepare('DELETE FROM resume_versions WHERE resume_id = ? AND kind = ? AND id NOT IN (SELECT id FROM resume_versions WHERE resume_id = ? AND kind = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)').run(resumeId, kind, resumeId, kind, limit);
  }
  function saveAutomaticVersion(resumeId: string, document: EditorDocument & { title: string }, now: number) {
    const latest = db.prepare('SELECT id, kind, created_at FROM resume_versions WHERE resume_id = ? ORDER BY updated_at DESC, rowid DESC LIMIT 1').get(resumeId);
    // Fixed windows preserve a checkpoint each minute even during uninterrupted typing.
    if (latest?.kind === 'auto' && typeof latest.created_at === 'number' && now - latest.created_at < VERSION_AUTOSAVE_WINDOW_MS) {
      db.prepare('UPDATE resume_versions SET title = ?, resume = ?, settings = ?, updated_at = ? WHERE id = ?').run(document.title, JSON.stringify(document.resume), JSON.stringify(document.settings), now, latest.id!);
    } else {
      insertVersion(resumeId, document, 'auto', '', now);
      trimVersions(resumeId, 'auto');
    }
  }
  const cookieValue = (token: string, age = WEEK) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${env.SECURE_COOKIE === 'true' ? '; Secure' : ''}`;
  function token(req: http.IncomingMessage) { return (req.headers.cookie || '').match(/(?:^|;\s*)openresume_session=([a-f0-9]{64})(?:;|$)/)?.[1]; }
  function authenticated(req: http.IncomingMessage) {
    const value = token(req);
    return value && db.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ? AND credential_hash = ?').get(digest(value), Date.now(), credentialHash);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method || 'GET';
      if (pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(method)) {
          const origin = req.headers.origin;
          if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && new URL(origin).host !== req.headers.host)) return json(res, 403, { error: 'FORBIDDEN' });
        }
        if (pathname === '/api/health' && method === 'GET') return json(res, 200, { status: 'ok', storage: 'sqlite' });
        if (pathname === '/api/config' && method === 'GET') return json(res, 200, {
          demoLogin: !customLogin,
          demoUsername: customLogin ? '' : DEMO_USERNAME,
          demoPassword: customLogin ? '' : DEMO_PASSWORD,
          aiConfigured: Boolean(env.AI_API_KEY && env.AI_MODEL),
        });
        if (pathname === '/api/auth/me' && method === 'GET') return json(res, 200, { user: authenticated(req) ? user : null });
        if (pathname === '/api/auth/login' && method === 'POST') {
          const input = await body(req);
          if (typeof input?.username !== 'string' || typeof input?.password !== 'string' || input.password.length > 1024) return json(res, 400, { error: 'INVALID_CREDENTIALS' });
          const candidate = scryptSync(input.password, 'open-resume-local-login', 32);
          if (input.username.trim().toLowerCase() !== username || !timingSafeEqual(candidate, passwordHash)) return json(res, 401, { error: 'INVALID_CREDENTIALS' });
          const session = randomBytes(32).toString('hex');
          db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR credential_hash != ?').run(Date.now(), credentialHash);
          db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(session), Date.now() + WEEK * 1000, credentialHash);
          return json(res, 200, { user }, { 'Set-Cookie': cookieValue(session) });
        }
        if (pathname === '/api/auth/logout' && method === 'POST') {
          if (token(req)) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token(req)!));
          return json(res, 200, { ok: true }, { 'Set-Cookie': cookieValue('', 0) });
        }
        if (!authenticated(req)) return json(res, 401, { error: 'UNAUTHORIZED' });
        if (pathname === '/api/tailor') {
          const request = new Request(url, { method, headers: Object.fromEntries(Object.entries(req.headers).filter((entry): entry is [string,string] => typeof entry[1] === 'string')), ...(!['GET', 'HEAD'].includes(method) ? { body: Readable.toWeb(req) as ReadableStream<Uint8Array>, duplex: 'half' as const } : {}) });
          const response = await handleTailoring(request, env, user, { fetchImpl });
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
          return;
        }
        if (pathname === '/api/resumes' && method === 'GET') return json(res, 200, { resumes: db.prepare('SELECT * FROM resumes ORDER BY updated_at DESC').all().map(toDocument) });
        if (pathname === '/api/resumes' && method === 'POST') {
          const input = await body(req);
          if (!validDocument(input)) return json(res, 400, { error: 'INVALID_RESUME' });
          input.resume.title = input.title;
          const id = randomUUID(), updated_at = Date.now();
          transaction(() => {
            db.prepare('INSERT INTO resumes VALUES (?, ?, ?, ?, ?)').run(id, input.title, JSON.stringify(input.resume), JSON.stringify(input.settings), updated_at);
            insertVersion(id, input, 'initial', '', updated_at);
          });
          return json(res, 201, { id, updated_at });
        }
        const versionMatch = pathname.match(/^\/api\/resumes\/([a-f0-9-]{36})\/versions(?:\/([a-f0-9-]{36})(\/restore)?)?$/);
        if (versionMatch) {
          const [, resumeId, versionId, restoring] = versionMatch;
          const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(resumeId);
          if (!row) return json(res, 404, { error: 'NOT_FOUND' });
          if (!versionId && method === 'GET') {
            const versions = transaction(() => {
              const latest = db.prepare('SELECT * FROM resumes WHERE id = ?').get(resumeId);
              if (!latest) return null;
              ensureInitialVersion(toDocument(latest));
              return db.prepare('SELECT id, resume_id, title, label, kind, created_at, updated_at FROM resume_versions WHERE resume_id = ? ORDER BY updated_at DESC, rowid DESC').all(resumeId).map(toVersionSummary);
            });
            return versions ? json(res, 200, { versions }) : json(res, 404, { error: 'NOT_FOUND' });
          }
          if (!versionId && method === 'POST') {
            const input = await body(req);
            const label = input.label === undefined ? '' : input.label;
            const document = { title: input.title ?? (isRecord(input.resume) ? input.resume.title : undefined), resume: input.resume, settings: input.settings };
            if (!validDocument(document) || typeof label !== 'string' || label.trim().length > 120) return json(res, 400, { error: 'INVALID_VERSION' });
            document.resume.title = document.title;
            const result = transaction(() => {
              const latest = db.prepare('SELECT * FROM resumes WHERE id = ?').get(resumeId);
              if (!latest) return null;
              ensureInitialVersion(toDocument(latest));
              const id = insertVersion(resumeId, document, 'manual', label.trim(), Date.now());
              trimVersions(resumeId, 'manual');
              return toVersion(db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(id)!);
            });
            return result ? json(res, 201, result) : json(res, 404, { error: 'NOT_FOUND' });
          }
          if (versionId && !restoring && method === 'GET') {
            const version = db.prepare('SELECT * FROM resume_versions WHERE id = ? AND resume_id = ?').get(versionId, resumeId);
            return version ? json(res, 200, toVersion(version)) : json(res, 404, { error: 'NOT_FOUND' });
          }
          if (versionId && restoring && method === 'POST') {
            const result = transaction(() => {
              const version = db.prepare('SELECT * FROM resume_versions WHERE id = ? AND resume_id = ?').get(versionId, resumeId);
              if (!version || !db.prepare('SELECT 1 FROM resumes WHERE id = ?').get(resumeId)) return null;
              const document = toVersion(version);
              const id = randomUUID(), updated_at = Date.now();
              db.prepare('INSERT INTO resumes VALUES (?, ?, ?, ?, ?)').run(id, document.title, JSON.stringify(document.resume), JSON.stringify(document.settings), updated_at);
              insertVersion(id, document, 'initial', '', updated_at);
              return { id, updated_at };
            });
            return result ? json(res, 201, result) : json(res, 404, { error: 'NOT_FOUND' });
          }
          return json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { Allow: restoring ? 'POST' : versionId ? 'GET' : 'GET, POST' });
        }
        const match = pathname.match(/^\/api\/resumes\/([a-f0-9-]{36})$/);
        if (match) {
          const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(match[1]);
          if (!row) return json(res, 404, { error: 'NOT_FOUND' });
          if (method === 'GET') return json(res, 200, toDocument(row));
          if (method === 'DELETE') {
            transaction(() => {
              db.prepare('DELETE FROM resume_versions WHERE resume_id = ?').run(match[1]);
              db.prepare('DELETE FROM resumes WHERE id = ?').run(match[1]);
            });
            return json(res, 200, { ok: true });
          }
          if (method === 'PUT') {
            const input = await body(req);
            if ((input.title != null && (typeof input.title !== 'string' || input.title.length > 1000)) || (input.resume != null && !isResume(input.resume)) || (input.settings != null && !isResumeSettings(input.settings))) return json(res, 400, { error: 'INVALID_RESUME' });
            // A save or deletion may finish while this request is still uploading.
            // Merge partial updates with the latest document, not the earlier read.
            const result = transaction(() => {
              const currentRow = db.prepare('SELECT * FROM resumes WHERE id = ?').get(match[1]);
              if (!currentRow) return null;
              const previous = toDocument(currentRow);
              const next = { title: input.title ?? previous.title, resume: input.resume ?? previous.resume, settings: input.settings ?? previous.settings };
              if (!validDocument(next)) return { invalid: true } as const;
              ensureInitialVersion(previous);
              // Renaming also updates the document title, so reload/export stays consistent.
              next.resume.title = next.title;
              if (input.title !== undefined && input.resume === undefined && input.settings === undefined) {
                next.settings = { ...next.settings, titleMode: 'custom', titleKind: 'custom' };
              }
              const unchanged = next.title === previous.title && isDeepStrictEqual(next.resume, previous.resume) && isDeepStrictEqual(next.settings, previous.settings);
              if (unchanged) return { updated_at: previous.updated_at };
              const updated_at = Date.now();
              db.prepare('UPDATE resumes SET title = ?, resume = ?, settings = ?, updated_at = ? WHERE id = ?').run(next.title, JSON.stringify(next.resume), JSON.stringify(next.settings), updated_at, match[1]);
              saveAutomaticVersion(match[1], next, updated_at);
              return { updated_at };
            });
            if (!result) return json(res, 404, { error: 'NOT_FOUND' });
            if ('invalid' in result) return json(res, 400, { error: 'INVALID_RESUME' });
            return json(res, 200, { ok: true, updated_at: result.updated_at });
          }
          return json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { Allow: 'GET, PUT, DELETE' });
        }
        return json(res, 404, { error: 'NOT_FOUND' });
      }
      if (devMiddleware) return devMiddleware(req, res, () => json(res, 404, { error: 'NOT_FOUND' }));
      if (!['GET', 'HEAD'].includes(method)) return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      const decoded = decodeURIComponent(pathname);
      if (decoded.split('/').some((part) => part.startsWith('.') || part.includes('\\'))) return json(res, 404, { error: 'NOT_FOUND' });
      let file = path.resolve(distDir, '.' + decoded);
      if (!file.startsWith(path.resolve(distDir) + path.sep)) file = path.join(distDir, 'index.html');
      try {
        if (!statSync(file).isFile()) file = path.join(distDir, 'index.html');
      } catch {
        if (path.extname(decoded)) return json(res, 404, { error: 'NOT_FOUND' });
        file = path.join(distDir, 'index.html');
      }
      let stat;
      try { stat = statSync(file); } catch { return json(res, 503, { error: 'Run npm run build first.' }); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': file.includes(path.sep + 'assets' + path.sep) ? 'public, max-age=31536000, immutable' : 'no-cache' });
      if (method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const status = isRecord(error) && typeof error.status === 'number' ? error.status : 500;
      json(res, status, { error: status === 500 ? 'INTERNAL_ERROR' : errorMessage(error) });
      if (status === 500) console.error(error);
    }
  });
  server.requestTimeout = 150000;
  server.on('close', () => db.close());
  return server;
}
