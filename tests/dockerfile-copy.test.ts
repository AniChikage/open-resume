import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// The production image copies an explicit list of source files. A server file that is
// imported at runtime but missing from that list only fails at the very end of the
// Docker build, so this test catches it earlier. Type-only imports are erased by Node.
const root = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

function runtimeFiles(entry: string): Set<string> {
  const reached = new Set<string>();
  const visit = (file: string) => {
    if (reached.has(file)) return;
    reached.add(file);
    const source = read(file);
    const specs = [...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^'"\n]*?from\s+['"](\.[^'"]+)['"]/gm)].map(match => match[1])
      .concat([...source.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)].map(match => match[1]));
    for (const spec of specs) visit(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
  };
  visit(entry);
  return reached;
}

test('every source file the server imports at runtime is copied into the production image', () => {
  const dockerfile = read('Dockerfile');
  const copiedFiles = new Set([...dockerfile.matchAll(/\/app\/(src\/[\w/.-]+\.ts)\s/g)].map(match => match[1]));
  const copiedDirs = [...dockerfile.matchAll(/COPY --from=build \S+ \/app\/(\w+)\s/g)].map(match => match[1]);
  const reached = runtimeFiles('server/index.ts');
  assert.ok(reached.has('server/app.ts') && reached.has('src/translation.ts'), 'the walk reaches the server modules');
  const missing = [...reached].filter(file => !copiedFiles.has(file) && !copiedDirs.some(dir => file.startsWith(`${dir}/`)));
  assert.deepEqual(missing, [], `copy these files in the Dockerfile: ${missing.join(', ')}`);
});
