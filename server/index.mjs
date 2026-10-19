import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
let vite;
if (dev) {
  const { createServer } = await import('vite');
  vite = await createServer({ root, server: { middlewareMode: true, hmr: { port: port + 1, host } } });
}
const server = createApp({
  dataDir: path.resolve(process.env.DATA_DIR || path.join(root, '.data')),
  distDir: path.join(root, 'dist'),
  devMiddleware: vite?.middlewares,
});
server.listen(port, host, () => console.log(`Open Resume: http://${host}:${port}${dev ? ' (development)' : ''}`));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await vite?.close();
  server.close(() => process.exit(0));
  server.closeIdleConnections();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
